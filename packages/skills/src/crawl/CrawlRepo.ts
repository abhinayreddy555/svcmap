import { z } from 'zod';
import type { Skill, RawAssets, FileAsset, FileCategory } from '../types.js';

// ─── Schemas ────────────────────────────────────────────────────────────────

export const CrawlRepoInputSchema = z.object({
  org: z.string(),
  repo: z.string(),
  branch: z.string().default('main'),
  includePaths: z.array(z.string()).optional(),
  excludePaths: z.array(z.string()).optional(),
});
export type CrawlRepoInput = z.infer<typeof CrawlRepoInputSchema>;

export const CrawlRepoOutputSchema = z.object({
  repo: z.string(),
  branch: z.string(),
  headSha: z.string(),
  directoryTree: z.string(),
  files: z.array(
    z.object({
      path: z.string(),
      content: z.string(),
      category: z.string(),
    }),
  ),
});
export type CrawlRepoOutput = z.infer<typeof CrawlRepoOutputSchema>;

// ─── Path → category heuristics ─────────────────────────────────────────────

function categorise(path: string): FileCategory {
  const lower = path.toLowerCase();
  const filename = path.split('/').pop() ?? path;

  if (/^(main|index|app|server|handler|bootstrap|start)\.(ts|js|py|go|java|cs)$/.test(filename)) return 'entry-point';
  if (/routes?|controllers?|handlers?|endpoints?|views?/.test(lower) && /\.(ts|js|py|go|java|cs)$/.test(lower)) return 'route';
  if (/\.(yaml|yml|json)$/.test(lower) && /openapi|swagger|api/.test(lower)) return 'api-spec';
  if (/\.proto$/.test(lower) || /\.graphql$/.test(lower)) return 'api-spec';
  if (/schema|model|entity|dto|interface/.test(lower) && /\.(ts|js|py|go|java|cs|prisma)$/.test(lower)) return 'schema';
  if (/migrat/.test(lower) || /\.sql$/.test(lower)) return 'migration';
  if (/\.env/.test(filename) || /config|settings|configuration/.test(lower)) return 'config';
  if (/dockerfile|docker-compose|\.ya?ml$/.test(lower) && /k8s|helm|terraform|infra|deploy/.test(lower)) return 'infra';
  if (/dockerfile/.test(lower) || /docker-compose/.test(lower)) return 'infra';
  if (/\.github\/workflows|azure-pipelines|ci\.ya?ml/.test(lower)) return 'ci';
  if (/package\.json|requirements\.txt|go\.mod|pom\.xml|build\.gradle|.*\.csproj|cargo\.toml/.test(filename.toLowerCase())) return 'dependency-manifest';
  if (/\.(test|spec)\.(ts|js|py|go|java|cs)$/.test(lower) || /__tests__/.test(lower)) return 'test';
  if (/event|message|queue|topic|kafka|rabbitmq|pub(lish)?|subscri/.test(lower) && /\.(ts|js|py|go|java|cs)$/.test(lower)) return 'event';
  if (/error|exception|fault/.test(lower) && /\.(ts|js|py|go|java|cs)$/.test(lower)) return 'error';
  if (/readme|\.md$|docs?\//.test(lower)) return 'doc';
  return 'source';
}

/** Priority order for file selection when over maxFiles limit */
const CATEGORY_PRIORITY: Record<FileCategory, number> = {
  'entry-point': 1,
  'api-spec': 2,
  'route': 3,
  'schema': 4,
  'migration': 5,
  'dependency-manifest': 6,
  'event': 7,
  'error': 8,
  'config': 9,
  'infra': 10,
  'ci': 11,
  'doc': 12,
  'test': 13,
  'source': 14,
};

// ─── Skill ──────────────────────────────────────────────────────────────────

export const CrawlRepoSkill: Skill<CrawlRepoInput, RawAssets> = {
  name: 'CrawlRepo',
  description: 'Crawl a git repository and return categorised file contents for analysis',
  tier: 'extraction',
  inputSchema: CrawlRepoInputSchema as any,
  outputSchema: z.any() as any,

  async execute(input, ctx): Promise<RawAssets> {
    const { git, logger } = ctx;
    if (!git) throw new Error('CrawlRepo requires a GitProvider');

    const { org, repo, branch } = input;
    logger.info(`Crawling ${org}/${repo}@${branch}...`);

    const tree = await git.getRepoTree(org, repo, branch);
    logger.debug(`  Found ${tree.files.length} relevant files`);

    // Apply include/exclude filters
    let candidates = tree.files.filter((f) => f.type === 'file');
    if (input.includePaths?.length) {
      candidates = candidates.filter((f) =>
        input.includePaths!.some((p) => f.path.startsWith(p)),
      );
    }
    if (input.excludePaths?.length) {
      candidates = candidates.filter((f) =>
        !input.excludePaths!.some((p) => f.path.startsWith(p)),
      );
    }

    // Sort by priority category — higher priority files appear in earlier chunks
    const categorised = candidates.map((f) => ({ ...f, category: categorise(f.path) }));
    categorised.sort((a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category]);
    const selected = categorised;

    logger.debug(`  Fetching content for ${selected.length} files...`);
    const contents = await git.getFileContents(
      org,
      repo,
      selected.map((f) => f.path),
      tree.headSha,
    );

    const contentMap = new Map(contents.map((c) => [c.path, c.content]));

    const fileAssets: FileAsset[] = selected
      .filter((f) => contentMap.has(f.path))
      .map((f) => ({
        path: f.path,
        content: contentMap.get(f.path)!,
        category: f.category,
      }));

    // Build a compact directory tree string
    const treePaths = tree.files.map((f) => f.path).sort();
    const directoryTree = buildTreeString(treePaths);

    logger.info(`  Crawled ${fileAssets.length} files (${(fileAssets.reduce((s, f) => s + f.content.length, 0) / 1024).toFixed(0)} KB)`);

    return {
      repo: `${org}/${repo}`,
      branch,
      headSha: tree.headSha,
      files: fileAssets,
      directoryTree,
    };
  },
};

function buildTreeString(paths: string[]): string {
  // Only show top 2 levels of directory structure to keep it compact
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const p of paths) {
    const parts = p.split('/');
    if (parts.length >= 2) {
      const key = parts.slice(0, 2).join('/');
      if (!seen.has(key)) { seen.add(key); lines.push(key); }
    } else {
      lines.push(p);
    }
  }
  return lines.slice(0, 80).join('\n');
}
