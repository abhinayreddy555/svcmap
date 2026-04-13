import type { ZodSchema } from 'zod';
import type { LLMProvider, LLMTier, GitProvider } from '@svcmap/providers';

export interface SkillContext {
  llm: LLMProvider;
  git?: GitProvider;
  logger: Logger;
}

export interface Logger {
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string, err?: unknown): void;
  debug(msg: string): void;
}

export interface Skill<TInput, TOutput> {
  readonly name: string;
  /** Shown to agents when this skill is exposed as an MCP tool */
  readonly description: string;
  readonly tier: LLMTier;
  readonly inputSchema: ZodSchema<TInput>;
  readonly outputSchema: ZodSchema<TOutput>;
  execute(input: TInput, ctx: SkillContext): Promise<TOutput>;
}

// ─── Raw crawl types ────────────────────────────────────────────────────────

export interface FileAsset {
  path: string;
  content: string;
  category: FileCategory;
}

export type FileCategory =
  | 'entry-point'
  | 'route'
  | 'api-spec'
  | 'schema'
  | 'migration'
  | 'config'
  | 'infra'
  | 'ci'
  | 'dependency-manifest'
  | 'test'
  | 'event'
  | 'error'
  | 'doc'
  | 'source';

export interface RawAssets {
  repo: string;
  branch: string;
  headSha: string;
  files: FileAsset[];
  directoryTree: string;
}

// ─── ChunkRunner — handles map-reduce for large repos ───────────────────────

export interface ChunkRunnerOptions {
  /** What fraction of the provider's context to use per chunk (default 0.65) */
  contextFraction?: number;
}

/**
 * Splits content into token-budget-aware chunks and runs the given LLM call
 * on each chunk, then synthesises the results into one output via a reduce prompt.
 */
export async function runWithChunks<T>(
  content: string,
  ctx: SkillContext,
  options: ChunkRunnerOptions,
  mapPrompt: (chunk: string) => { system: string; user: string; tier: LLMTier },
  reducePrompt: (partialResults: string[]) => { system: string; user: string; tier: LLMTier },
  parseResult: (raw: string) => T,
): Promise<T> {
  const { llm } = ctx;
  const budgetTokens = Math.floor(
    llm.maxContextTokens * (options.contextFraction ?? 0.65),
  );
  const contentTokens = llm.estimateTokens(content);

  if (contentTokens <= budgetTokens) {
    // single shot — no chunking needed
    const { system, user, tier } = mapPrompt(content);
    const response = await llm.complete({
      system,
      messages: [{ role: 'user', content: user }],
      tier,
      enableCache: true,
    });
    return parseResult(response.content);
  }

  // chunking needed
  const chunkSize = Math.floor((budgetTokens / contentTokens) * content.length);
  const chunks: string[] = [];
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize));
  }

  ctx.logger.debug(`ChunkRunner: splitting into ${chunks.length} chunks`);

  const partialResults: string[] = [];
  for (const chunk of chunks) {
    const { system, user, tier } = mapPrompt(chunk);
    const response = await llm.complete({
      system,
      messages: [{ role: 'user', content: user }],
      tier,
    });
    partialResults.push(response.content);
  }

  const { system, user, tier } = reducePrompt(partialResults);
  const reduced = await llm.complete({
    system,
    messages: [{ role: 'user', content: user }],
    tier,
    enableCache: true,
  });

  return parseResult(reduced.content);
}

// ─── File-boundary-aware chunked extraction ───────────────────────────────────

/**
 * Split formatted asset content (produced by formatAllAssets) into chunks at
 * `### filepath` file boundaries so the LLM never sees half a file.
 * Each chunk re-includes the repo header line for context.
 */
function chunkByFiles(content: string, budgetChars: number): string[] {
  const headerEnd = content.indexOf('\n### ');
  if (headerEnd < 0) return [content]; // no file sections — single chunk
  const repoHeader = content.slice(0, headerEnd);

  // Split on every `\n### ` boundary (but keep the delimiter with the following section)
  const sections = content.slice(headerEnd).split(/(?=\n### )/);

  const chunks: string[] = [];
  let current = repoHeader;

  for (const section of sections) {
    if (!section.trim()) continue;
    if (current !== repoHeader && current.length + section.length > budgetChars) {
      chunks.push(current);
      current = repoHeader + section;
    } else {
      current += section;
    }
  }
  if (current !== repoHeader) chunks.push(current);
  return chunks.length > 0 ? chunks : [content];
}

export interface ExtractChunksOptions<T> {
  /** Tier to use for LLM calls — almost always 'extraction' */
  tier: LLMTier;
  /**
   * Prompt for a single chunk. The instruction should note that this may be
   * a partial view and ask the LLM to extract only what it can see.
   */
  mapPrompt(chunk: string): { system: string; user: string };
  /**
   * Prompt that receives all partial JSON strings and returns merged JSON.
   * Only called when there are 2+ chunks.
   */
  reducePrompt(partials: string[]): { system: string; user: string };
  /** Parse the final LLM output into T (e.g. SchemaZ.parse(JSON.parse(extractJSON(raw)))) */
  parse(raw: string): T;
}

/**
 * Map-reduce extraction over arbitrarily large formatted content.
 *
 * - If the content fits in one LLM call (65% of context window), runs a single pass.
 * - Otherwise splits at file boundaries, runs a map pass on each chunk in sequence
 *   (to avoid simultaneous rate-limit pressure), then runs one reduce pass to merge
 *   all partial extraction results into a single coherent JSON.
 */
export async function extractWithChunks<T>(
  content: string,
  ctx: SkillContext,
  opts: ExtractChunksOptions<T>,
): Promise<T> {
  const { llm } = ctx;
  // Cap chunk size at 80K chars ≈ 20K tokens.
  // With extraction concurrency capped at 2 (in ServiceAgent), peak input token
  // pressure is 2 × 20K = 40K tokens/min — safely under the 50K TPM org limit.
  const budgetChars = Math.min(80_000, Math.floor(llm.maxContextTokens * 0.65 * 4));

  if (content.length <= budgetChars) {
    // Fits in one call — no chunking needed
    const { system, user } = opts.mapPrompt(content);
    const response = await llm.complete({
      system,
      messages: [{ role: 'user', content: user }],
      tier: opts.tier,
      enableCache: true,
      maxTokens: 16_000,
    });
    return opts.parse(response.content);
  }

  const chunks = chunkByFiles(content, budgetChars);
  ctx.logger.debug(`extractWithChunks: ${chunks.length} chunks (${(content.length / 1024).toFixed(0)} KB total)`);

  // Map — sequential with a short inter-call pause.
  // On basic-tier accounts (50K TPM) even a single chunked skill sending 20K
  // input tokens needs breathing room before the next call. 4 seconds between
  // chunks keeps sustained throughput well under the 50K/min ceiling.
  const INTER_CHUNK_DELAY_MS = 4_000;
  const partials: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, INTER_CHUNK_DELAY_MS));
    ctx.logger.debug(`  chunk ${i + 1}/${chunks.length}…`);
    const { system, user } = opts.mapPrompt(chunks[i]);
    const resp = await llm.complete({
      system,
      messages: [{ role: 'user', content: user }],
      tier: opts.tier,
      maxTokens: 16_000,
    });
    partials.push(resp.content);
  }

  if (partials.length === 1) return opts.parse(partials[0]);

  // Reduce — merge all partial results into one
  const { system, user } = opts.reducePrompt(partials);
  const merged = await llm.complete({
    system,
    messages: [{ role: 'user', content: user }],
    tier: opts.tier,
    enableCache: true,
    maxTokens: 16_000,
  });
  return opts.parse(merged.content);
}

/** Extract JSON from LLM output that may contain markdown fences */
export function extractJSON(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  // try finding first { or [ to last } or ]
  const start = raw.search(/[{[]/);
  const end = Math.max(raw.lastIndexOf('}'), raw.lastIndexOf(']'));
  if (start !== -1 && end !== -1 && end > start) {
    return raw.slice(start, end + 1);
  }
  return raw.trim();
}
