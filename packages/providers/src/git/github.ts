import { Octokit } from '@octokit/rest';
import type { GitProvider, RepoTree, FileEntry, FileContent, DiffResult } from './types.js';

/** Max files to fetch content for in one batch */
const CONTENT_BATCH_SIZE = 20;

/** Skip files larger than this — generated code, data dumps, lock files */
const MAX_FILE_SIZE_BYTES = 300_000;

/** Extensions worth fetching for analysis */
const RELEVANT_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'go', 'java', 'cs', 'rb', 'php', 'rs', 'swift', 'kt',
  'json', 'yaml', 'yml', 'toml', 'xml',
  'sql', 'prisma', 'graphql', 'proto',
  'md', 'mdx',
  'sh', 'bash', 'Dockerfile',
  'env', 'env.example',
]);

const ALWAYS_SKIP = new Set([
  'node_modules', 'dist', 'build', '.next', '.nuxt', '__pycache__',
  '.git', 'coverage', '.nyc_output', 'vendor', '.turbo',
]);

function isRelevant(path: string): boolean {
  const parts = path.split('/');
  // skip hidden dirs and build outputs
  if (parts.some((p) => ALWAYS_SKIP.has(p))) return false;
  const ext = path.split('.').pop() ?? '';
  const filename = parts[parts.length - 1];
  // always include Dockerfile, .env.example etc
  if (filename.startsWith('Dockerfile') || filename === '.env.example') return true;
  return RELEVANT_EXTENSIONS.has(ext);
}

export class GitHubProvider implements GitProvider {
  readonly name = 'github';
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getHeadSha(org: string, repo: string, branch: string): Promise<string> {
    const { data } = await this.octokit.repos.getBranch({ owner: org, repo, branch });
    return data.commit.sha;
  }

  async getRepoTree(org: string, repo: string, branch: string): Promise<RepoTree> {
    const headSha = await this.getHeadSha(org, repo, branch);

    const { data } = await this.octokit.git.getTree({
      owner: org,
      repo,
      tree_sha: headSha,
      recursive: '1',
    });

    const files: FileEntry[] = (data.tree ?? [])
      .filter((item) =>
        item.path &&
        isRelevant(item.path) &&
        (item.type !== 'blob' || (item.size ?? 0) <= MAX_FILE_SIZE_BYTES),
      )
      .map((item) => ({
        path: item.path!,
        type: item.type === 'tree' ? 'dir' : 'file',
        size: item.size,
      }));

    return { repo: `${org}/${repo}`, branch, headSha, files };
  }

  async getFileContents(
    org: string,
    repo: string,
    paths: string[],
    ref: string,
  ): Promise<FileContent[]> {
    const results: FileContent[] = [];

    // Process in batches to avoid hammering the API
    for (let i = 0; i < paths.length; i += CONTENT_BATCH_SIZE) {
      const batch = paths.slice(i, i + CONTENT_BATCH_SIZE);
      const fetched = await Promise.allSettled(
        batch.map((path) =>
          this.octokit.repos.getContent({ owner: org, repo, path, ref }).then(({ data }) => {
            if (Array.isArray(data) || data.type !== 'file') return null;
            const content =
              data.encoding === 'base64'
                ? Buffer.from(data.content, 'base64').toString('utf8')
                : data.content;
            return { path, content, encoding: 'utf8' as const, size: data.size };
          }),
        ),
      );

      for (const result of fetched) {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      }
    }

    return results;
  }

  async getDiff(org: string, repo: string, baseSha: string, headSha: string): Promise<DiffResult> {
    const { data } = await this.octokit.repos.compareCommitsWithBasehead({
      owner: org,
      repo,
      basehead: `${baseSha}...${headSha}`,
    });

    const changedPaths = (data.files ?? []).map((f) => f.filename);

    return {
      beforeSha: baseSha,
      afterSha: headSha,
      changedPaths,
      additions: data.ahead_by,
      deletions: data.behind_by,
    };
  }
}
