import { z } from 'zod';
import yaml from 'js-yaml';
import fs from 'fs-extra';
import path from 'path';

// ─── Repo URL parsing ─────────────────────────────────────────────────────────

export interface ParsedRepoUrl {
  /** Canonical org/repo shorthand */
  orgRepo: string;
  /** Branch extracted from a /tree/<branch>/... URL, undefined otherwise */
  branch?: string;
  /** Subdirectory prefix when a monorepo tree URL is given */
  includePath?: string;
  /** Last segment of the repo (or subdirectory) — suitable as a service name */
  suggestedName: string;
}

/**
 * Parse any GitHub repo reference into a structured result.
 *
 * Accepts:
 *   https://github.com/org/repo
 *   https://github.com/org/repo/tree/main/services/payment   ← monorepo path
 *   github.com/org/repo
 *   org/repo
 *   org/repo.git
 */
export function parseGitHubUrl(raw: string): ParsedRepoUrl {
  const trimmed = raw.trim().replace(/\.git$/, '');

  // GitHub tree URL — monorepo subdirectory
  // e.g. https://github.com/spring-petclinic/spring-petclinic-microservices/tree/main/spring-petclinic-customers-service
  const treeMatch = trimmed.match(
    /github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)(?:\/(.+))?/,
  );
  if (treeMatch) {
    const [, org, repo, branch, subPath] = treeMatch;
    const includePath = subPath?.replace(/\/$/, '');
    return {
      orgRepo: `${org}/${repo}`,
      branch,
      includePath,
      suggestedName: includePath
        ? includePath.split('/').pop()!
        : repo,
    };
  }

  // Plain GitHub URL — no tree path
  const urlMatch = trimmed.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) {
    const [, org, repo] = urlMatch;
    return { orgRepo: `${org}/${repo}`, suggestedName: repo };
  }

  // org/repo shorthand
  if (/^[^/]+\/[^/]+$/.test(trimmed)) {
    const repo = trimmed.split('/')[1];
    return { orgRepo: trimmed, suggestedName: repo };
  }

  throw new Error(
    `Cannot parse repo "${raw}" — expected a GitHub URL (https://github.com/org/repo) or org/repo shorthand`,
  );
}

/** Convenience: parse and return just the org/repo string (for the Zod transform). */
export function normaliseRepoUrl(raw: string): string {
  return parseGitHubUrl(raw).orgRepo;
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const ServiceConfigSchema = z.object({
  repo: z.string()
    .describe('GitHub URL (https://github.com/org/repo) or org/repo shorthand')
    .transform((v) => normaliseRepoUrl(v)),
  branch: z.string().default('main'),
  type: z.enum(['api', 'ui', 'batch', 'worker', 'library']).optional(),
  extra_docs: z.array(z.string()).optional(),
  exclude_paths: z.array(z.string()).optional(),
  include_paths: z.array(z.string()).optional(),
});

export const SvcMapConfigSchema = z.object({
  version: z.literal('1'),
  product: z.object({
    name: z.string(),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase with hyphens only'),
    description: z.string(),
    owners: z.array(z.object({ team: z.string(), contact: z.string() })).optional(),
  }),
  knowledge_base: z.object({
    output_dir: z.string().default('./knowledge'),
    commit_to_repo: z.boolean().default(false),
    gitignore_extracted: z.boolean().default(true),
  }),
  provider: z.object({
    git: z.enum(['github', 'azure-devops']),
    organisation: z.string().optional().describe('Optional — derived from repo URLs if omitted'),
    project: z.string().optional(),
  }),
  llm: z.object({
    provider: z.enum(['claude', 'openai', 'vertex']).default('claude'),
    generation_model: z.string().optional(),
    extraction_model: z.string().optional(),
    temperature: z.number().default(0.2),
  }),
  services: z.record(z.string(), ServiceConfigSchema),
  generation: z.object({
    parallelism: z.number().default(1),
    retry_attempts: z.number().default(2),
    documents: z.object({
      service: z.object({
        overview: z.boolean().default(true),
        api: z.boolean().default(true),
        scenarios: z.boolean().default(true),
        dependencies: z.boolean().default(true),
        data_model: z.boolean().default(true),
        table_map: z.boolean().default(true),
        config: z.boolean().default(true),
        errors: z.boolean().default(true),
        coding_standards: z.boolean().default(true),
        runbook: z.boolean().default(true),
        architecture: z.boolean().default(true),
        business_rules: z.boolean().default(true),
      }).default({}),
    }).default({}),
  }).default({}),
  hooks: z.object({
    webhook_secret: z.string().optional(),
    webhook_port: z.number().default(3456),
    install_git_hooks: z.boolean().default(false),
  }).optional(),
});

export type SvcMapConfig = z.infer<typeof SvcMapConfigSchema>;
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

// ─── Config discovery & loading ───────────────────────────────────────────────

const CONFIG_SEARCH_PATHS = [
  './svcmap.config.yaml',
  './knowledge/meta/svcmap.config.yaml',
  './svcmap.config.yml',
];

export function findConfigPath(): string | null {
  for (const p of CONFIG_SEARCH_PATHS) {
    if (fs.existsSync(p)) return path.resolve(p);
  }
  return null;
}

export function loadConfig(configPath?: string): SvcMapConfig {
  const filePath = configPath ?? findConfigPath();
  if (!filePath) {
    throw new Error(
      `No svcmap config found. Run 'svcmap init' to create one, or pass --config <path>.`,
    );
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`Config file not found: ${filePath}`);
  }

  const raw = yaml.load(fs.readFileSync(filePath, 'utf8'));
  const result = SvcMapConfigSchema.safeParse(raw);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid svcmap config:\n${issues}`);
  }

  return result.data;
}

export function writeConfig(config: SvcMapConfig, outputPath: string): void {
  fs.ensureDirSync(path.dirname(outputPath));
  fs.writeFileSync(outputPath, yaml.dump(config, { lineWidth: 120 }), 'utf8');
}
