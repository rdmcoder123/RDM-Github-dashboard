import type { Repository, Commit, GitHubError } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

if (!GITHUB_TOKEN || GITHUB_TOKEN === 'your_github_token_here') {
  throw new Error(
    'GitHub token not configured. Please add your token to the .env file.'
  );
}

const headers = {
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'GitHub-Organization-Dashboard',
  'Authorization': `Bearer ${GITHUB_TOKEN}`,
};

async function fetchReadmeContent(repoFullName: string): Promise<string | null> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${repoFullName}/readme`, {
      headers: {
        ...headers,
        'Accept': 'application/vnd.github.raw',
      },
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch README for ${repoFullName}`);
      return null;
    }
    
    const content = await response.text();
    return content.split('\n').slice(0, 4).join('\n'); // Get first 4 lines
  } catch (error) {
    console.warn('Error fetching README:', error);
    return null;
  }
}

export async function fetchOrganizationRepos(orgName: string): Promise<Repository[]> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/orgs/${orgName}/repos?sort=updated&per_page=100`, { headers });
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Organization "${orgName}" not found`);
      }
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }
      if (response.status === 401) {
        throw new Error('Invalid GitHub token. Please check your authentication settings.');
      }
      const error = await response.json() as GitHubError;
      throw new Error(error.message || 'Failed to fetch repositories');
    }
    
    const repos = await response.json();
    return await Promise.all(repos.map(async (repo: any) => {
      const [languages, lastCommit, readmeContent] = await Promise.all([
        fetchRepoLanguages(repo.full_name),
        fetchLastCommit(repo.full_name),
        fetchReadmeContent(repo.full_name)
      ]);
      
      return {
        name: repo.name,
        url: repo.html_url,
        readmeUrl: `${repo.html_url}#readme`,
        description: repo.description || 'No description provided',
        languages,
        lastCommit,
        readmeContent
      };
    }));
  } catch (error) {
    console.error('Error fetching repositories:', error);
    throw error;
  }
}

async function fetchRepoLanguages(repoFullName: string): Promise<{ [key: string]: number }> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${repoFullName}/languages`, { headers });
    if (!response.ok) {
      console.warn(`Failed to fetch languages for ${repoFullName}`);
      return {};
    }
    return await response.json();
  } catch (error) {
    console.warn('Error fetching languages:', error);
    return {};
  }
}

async function fetchLastCommit(repoFullName: string): Promise<Commit | undefined> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${repoFullName}/commits?per_page=1`, { headers });
    
    if (!response.ok) {
      if (response.status === 409) {
        console.warn(`Repository ${repoFullName} is empty`);
        return undefined;
      }
      if (response.status === 404) {
        console.warn(`Repository ${repoFullName} not found or no access`);
        return undefined;
      }
      console.warn(`Failed to fetch commits for ${repoFullName}: ${response.status}`);
      return undefined;
    }

    const commits = await response.json();
    if (!commits || commits.length === 0) {
      return undefined;
    }

    const commit = commits[0];
    return {
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      sha: commit.sha,
      url: commit.html_url
    };
  } catch (error) {
    console.warn(`Error fetching last commit for ${repoFullName}:`, error);
    return undefined;
  }
}