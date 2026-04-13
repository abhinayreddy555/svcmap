# Contributing to svcmap

This document explains the internal architecture so you can add new extraction skills, generation documents, or providers without having to reverse-engineer the codebase.

---

## Repository structure

```
packages/
  cli/          @svcmap/cli       — CLI commands (init, generate, status, serve, benchmark)
  config/       @svcmap/config    — Config schema (Zod), YAML loading, GitHub URL parsing
  providers/    @svcmap/providers — LLM adapters (Claude, OpenAI) and Git adapter (GitHub)
  skills/       @svcmap/skills    — All extraction and generation logic
  agents/       @svcmap/agents    — ServiceAgent and ProductAgent orchestration
  mcp-server/   @svcmap/mcp-server — MCP server (stdio transport, tools, prompts)
```

All packages use TypeScript with ESM output. Build with `pnpm build` from the root (or `pnpm --filter @svcmap/<pkg> build` for a single package).

---

## The extraction-generation pipeline

Every service goes through this pipeline in `ServiceAgent.run()`:

```
1. CrawlRepo
   └── Calls GitProvider.getRepoTree() to get all file paths
   └── Filters by extension (RELEVANT_EXTENSIONS in github.ts)
   └── Filters by size (< 300KB)
   └── Applies include_paths / exclude_paths from config
   └── Priority-sorts by FileCategory (routes before source before tests)
   └── Fetches file content in batches of 20 (GitHub API)
   └── Returns RawAssets { files: FileAsset[], headSha, directoryTree }

2. Extract (12 skills run with pLimit(1) — one at a time)
   └── Each skill receives the full RawAssets
   └── formatAllAssets() filters files by relevant FileCategory and formats as LLM text
   └── extractWithChunks() splits at file boundaries if content > 80K chars
       ├── If fits in one pass: single LLM call → parse → return
       └── If too large: N map passes (sequential, 4s gap) + 1 reduce pass → parse → return
   └── Each skill returns typed structured data (Zod-validated)
   └── Failures are isolated: one skill failing does not block the others

3. Generate (12 doc types run sequentially in a for loop)
   └── GenerateDocumentSkill.execute({ docType, extractions })
   └── Builds system prompt (audience-aware) + user prompt (structured extraction data as JSON)
   └── LLM call with maxTokens: 20_000 using the generation model (Opus by default)
   └── Returns { filename, content, generatedAt, model }
   └── File written to products/{slug}/services/{name}/{DOCTYPE}.md

4. Product-level (after all services)
   └── GenerateProductOverviewSkill → PRODUCT.md
   └── GenerateDataFlowSkill → DATAFLOW.md
   └── BuildWikiIndexSkill → INDEX.md
   └── Writes checksums.json and crawl_stats.json to meta/
```

---

## Key types

### `FileCategory`
Defined in `packages/skills/src/types.ts`. Controls which files each skill sees.

```
entry-point  route  api-spec  schema  migration  config
infra  ci  dependency-manifest  test  event  error  doc  source
```

Priority order matters: when the repo is large, higher-priority categories appear first in the formatted content, so they're always included in the first chunk even if chunking splits the content.

### `RawAssets`
```typescript
interface RawAssets {
  repo: string;        // "org/repo"
  branch: string;
  headSha: string;
  files: FileAsset[];  // [{ path, content, category }]
  directoryTree: string;
}
```

### `ServiceExtractions`
The merged output of all 12 extraction skills, passed to every generation skill. Defined in `GenerateDocument.ts`. All fields are optional — if an extraction skill fails, that field is `undefined` and the document is generated with whatever data is available.

---

## Adding a new extraction skill

1. **Create the file** `packages/skills/src/extract/ExtractYourThing.ts`

2. **Define the Zod schema** — be lenient. Use `.catch('other')` on enums and `.nullish().default(null)` on nullable fields. The LLM will sometimes return values outside your enum or omit optional fields. Hard Zod failures kill the extraction.

   ```typescript
   export const YourThingSchema = z.object({
     items: z.array(z.object({
       name: z.string(),
       type: z.enum(['a', 'b', 'c']).catch('c'),   // ← .catch() on enums
       note: z.string().nullish().default(null),    // ← .nullish() on optionals
     })),
   });
   export type YourThing = z.infer<typeof YourThingSchema>;
   ```

3. **Write an example JSON string** (`SCHEMA` constant) that shows the LLM exactly what shape to return. This is included in every prompt.

4. **Implement the skill** using `extractWithChunks` for anything that looks at `source` files (large category), or a simple `llm.complete` + parse for small targeted categories (config, migration):

   ```typescript
   export const ExtractYourThingSkill: Skill<RawAssets, YourThing> = {
     name: 'ExtractYourThing',
     description: 'One sentence for MCP tool discovery',
     tier: 'extraction',
     inputSchema: z.any() as any,
     outputSchema: YourThingSchema as any,

     async execute(input: RawAssets, ctx: SkillContext): Promise<YourThing> {
       const content = formatAllAssets(input, ['source', 'route']); // pick categories
       const parse = (raw: string) => YourThingSchema.parse(JSON.parse(extractJSON(raw)));

       return extractWithChunks(content, ctx, {
         tier: 'extraction',
         mapPrompt: (chunk) => ({
           system: JSON_SYSTEM,
           user: jsonUserPrompt(SCHEMA, chunk, 'Your instruction here. NOTE: partial view.'),
         }),
         reducePrompt: (partials) => ({
           system: JSON_SYSTEM,
           user: `Merge ${partials.length} partial results. Deduplicate by name.\n...\n${partials.join('\n---\n')}`,
         }),
         parse,
       });
     },
   };
   ```

5. **Export from the skills index** `packages/skills/src/index.ts`:
   ```typescript
   export * from './extract/ExtractYourThing.js';
   ```

6. **Add to `ServiceExtractions`** in `GenerateDocument.ts`:
   ```typescript
   yourThing?: YourThing;
   ```

7. **Wire into `ServiceAgent`** `packages/agents/src/ServiceAgent.ts`:
   ```typescript
   import { ExtractYourThingSkill } from '@svcmap/skills';
   // in Promise.all:
   extractLimit(() => runSkill('yourThing', () => ExtractYourThingSkill.execute(rawAssets, this.ctx), errors, log)),
   ```

---

## Adding a new document type

1. **Add to the `DocType` union** in `GenerateDocument.ts`:
   ```typescript
   export type DocType = 'OVERVIEW' | ... | 'YOUR_DOC';
   ```
   Also add to the `z.enum([...])` call on the next line.

2. **Add audience description** in `buildSystemPrompt()`:
   ```typescript
   YOUR_DOC: 'engineers who need to understand X, and AI agents doing Y',
   ```

3. **Add a case in `buildUserPrompt()`**:
   ```typescript
   case 'YOUR_DOC': return buildYourDocPrompt(header, ex);
   ```

4. **Write the generation function** — be explicit about section order, use tables for structured data, always include `## TL;DR for Agents` first and `## See Also` last:
   ```typescript
   function buildYourDocPrompt(header: string, ex: ServiceExtractions): string {
     return `${header}
   ## Extracted Data
   ${JSON.stringify(ex.yourThing, null, 2)}

   Write a YOUR_DOC.md with these exact sections:
   1. # Your Doc Title — {Service Name}
   2. ## TL;DR for Agents (3-5 bullets)
   ...
   N. ## See Also`;
   }
   ```

5. **Add to `ALL_DOC_TYPES`** in `ServiceAgent.ts`.

6. **Add to the `docTypeMap`** in `packages/cli/src/commands/generate.ts`:
   ```typescript
   your_doc: 'YOUR_DOC',
   ```

7. **Add to the config schema** in `packages/config/src/index.ts`:
   ```typescript
   your_doc: z.boolean().default(true),
   ```

8. **Add to `init.ts`** generation config object:
   ```typescript
   your_doc: true,
   ```

---

## Adding a new LLM provider

Implement `LLMProvider` from `packages/providers/src/llm/types.ts`:

```typescript
interface LLMProvider {
  readonly name: string;
  readonly maxContextTokens: number;  // used for chunk sizing
  readonly models: { extraction: string; generation: string };
  estimateTokens(text: string): number;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}
```

Key considerations:
- Set `maxContextTokens` accurately — `extractWithChunks` uses `Math.min(80_000, maxContextTokens * 0.65 * 4)` to size chunks
- Add `maxRetries` equivalent for automatic 429 handling
- Wire the new provider name into `generate.ts` and the config schema's `llm.provider` enum

---

## Rate limits and chunked extraction

`extractWithChunks` (in `types.ts`) handles large repos automatically:

- Content is split at `### filepath` boundaries — never mid-file
- Map passes run **sequentially** with a 4-second gap between chunks
- A reduce pass merges all partial JSON results
- `pLimit(1)` in ServiceAgent means only one extraction skill runs at a time
- ProductAgent `parallelism` (default: 1) controls how many services run concurrently

For higher API tiers, increase `parallelism` in `svcmap.config.yaml`. The chunk size (80K chars ≈ 20K tokens) and inter-chunk delay can be tuned in `types.ts` (`budgetChars` and `INTER_CHUNK_DELAY_MS`).

---

## Running tests

```bash
# Type-check all packages
pnpm build

# Run a single package in watch mode
pnpm --filter @svcmap/skills dev

# Test against a real repo (requires API keys in .env)
node svcmap.js generate --service <name> --save-extractions
```

Integration tests against the full pipeline are intentionally not mocked — set `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` in your environment and run `svcmap generate --dry-run` to validate config, or a full `generate` on a small public repo.

---

## The knowledge folder and git

**svcmap is a generalized tool** — it is not tied to any one product. The `knowledge/` output folder in this repo is gitignored entirely (see `.gitignore`) because it contains whatever repos you happened to test against, not anything that belongs in the tool's source tree.

**For users of svcmap**: the `knowledge/` folder in *your product repo* should be committed. The generated Markdown files are the artifact — review diffs in PRs, serve them via MCP, regenerate with `svcmap generate` when services change. `svcmap status` detects staleness based on `checksums.json` (HEAD SHA tracking).

What to gitignore in *your* product repo:
```
knowledge/meta/.env          # API keys
knowledge/meta/extracted/    # --save-extractions debug dumps (often large)
```

Everything else (`*.md`, `checksums.json`, `crawl_stats.json`) is safe and useful to commit.
