export interface Repository {
  name: string;
  url: string;
  readmeUrl: string;
  description: string;
  languages: { [key: string]: number };
  lastCommit?: Commit;
  readmeContent?: string | null;
}

export interface Commit {
  message: string;
  author: string;
  date: string;
  sha: string;
  url: string;
}

export interface LanguageStats {
  name: string;
  value: number;
  color: string;
}

export interface GitHubError {
  message: string;
  documentation_url?: string;
}