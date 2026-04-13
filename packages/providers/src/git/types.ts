export interface FileEntry {
  path: string;
  type: 'file' | 'dir';
  size?: number;
}

export interface FileContent {
  path: string;
  content: string;
  encoding: 'utf8' | 'base64';
  size: number;
}

export interface RepoTree {
  repo: string;
  branch: string;
  headSha: string;
  files: FileEntry[];
}

export interface DiffResult {
  beforeSha: string;
  afterSha: string;
  changedPaths: string[];
  additions: number;
  deletions: number;
}

export interface GitProvider {
  readonly name: string;
  /** List all files in a repo at a given branch */
  getRepoTree(org: string, repo: string, branch: string): Promise<RepoTree>;
  /** Fetch content of specific files (batched) */
  getFileContents(org: string, repo: string, paths: string[], ref: string): Promise<FileContent[]>;
  /** Get HEAD SHA for a branch */
  getHeadSha(org: string, repo: string, branch: string): Promise<string>;
  /** Get diff between two commits */
  getDiff(org: string, repo: string, baseSha: string, headSha: string): Promise<DiffResult>;
}
