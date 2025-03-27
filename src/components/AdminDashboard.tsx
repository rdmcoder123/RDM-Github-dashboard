import React, { useState, useEffect } from 'react';
import { GitPullRequest, Check, X, AlertCircle, Trash2, GitBranch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface PullRequest {
  id: number;
  number: number;
  title: string;
  user: {
    login: string;
  };
  created_at: string;
  html_url: string;
  state: string;
  body: string;
  repository: {
    name: string;
    html_url: string;
  };
}

interface Repository {
  id: number;
  name: string;
  html_url: string;
}

export const AdminDashboard: React.FC = () => {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingPR, setDeletingPR] = useState<number | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>('all');

  const validateEnvironmentVariables = () => {
    const org = import.meta.env.VITE_GITHUB_ORG;
    const token = import.meta.env.VITE_GITHUB_TOKEN;

    if (!org || !token) {
      throw new Error('Missing required environment variables. Please check your .env file.');
    }
  };

  const fetchRepositories = async () => {
    try {
      const response = await fetch(
        `https://api.github.com/orgs/${import.meta.env.VITE_GITHUB_ORG}/repos?per_page=100&sort=updated`,
        {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch repositories');
      }

      const data = await response.json();
      setRepositories(data);
      return data;
    } catch (err) {
      console.error('Error fetching repositories:', err);
      throw err;
    }
  };

  const fetchPullRequestsForRepo = async (repo: Repository) => {
    const response = await fetch(
      `https://api.github.com/repos/${import.meta.env.VITE_GITHUB_ORG}/${repo.name}/pulls?state=all&sort=updated&direction=desc`,
      {
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch PRs for ${repo.name}`);
      return [];
    }

    const prs = await response.json();
    return prs.map((pr: any) => ({
      ...pr,
      repository: {
        name: repo.name,
        html_url: repo.html_url
      }
    }));
  };

  const fetchAllData = async () => {
    try {
      setError(null);
      validateEnvironmentVariables();

      // Check cache first
      const cachedData = localStorage.getItem('allPullRequestsData');
      const lastFetchTime = localStorage.getItem('prLastFetchTime');
      
      if (cachedData && lastFetchTime) {
        const timeSinceLastFetch = Date.now() - Number(lastFetchTime);
        if (timeSinceLastFetch < 5 * 60 * 1000) { // 5 minutes
          const data = JSON.parse(cachedData);
          setPullRequests(data.pullRequests);
          setRepositories(data.repositories);
          setLoading(false);
          return;
        }
      }

      const repos = await fetchRepositories();
      const allPRs = await Promise.all(
        repos.map((repo: Repository) => fetchPullRequestsForRepo(repo))
      );

      const flattenedPRs = allPRs.flat();
      setPullRequests(flattenedPRs);
      
      // Update cache
      localStorage.setItem('allPullRequestsData', JSON.stringify({
        pullRequests: flattenedPRs,
        repositories: repos
      }));
      localStorage.setItem('prLastFetchTime', Date.now().toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const deletePullRequest = async (prNumber: number, repoName: string) => {
    try {
      setDeletingPR(prNumber);
      const response = await fetch(
        `https://api.github.com/repos/${import.meta.env.VITE_GITHUB_ORG}/${repoName}/pulls/${prNumber}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'X-GitHub-Api-Version': '2022-11-28'
          },
          body: JSON.stringify({ state: 'closed' }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete pull request');
      }

      // Update local state and cache
      const updatedPRs = pullRequests.map(pr => 
        pr.number === prNumber && pr.repository.name === repoName
          ? { ...pr, state: 'closed' }
          : pr
      );
      setPullRequests(updatedPRs);
      
      // Update cache
      const cachedData = JSON.parse(localStorage.getItem('allPullRequestsData') || '{}');
      localStorage.setItem('allPullRequestsData', JSON.stringify({
        ...cachedData,
        pullRequests: updatedPRs
      }));

      // Show success message
      const successMessage = document.createElement('div');
      successMessage.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
      successMessage.textContent = 'Pull request closed successfully';
      document.body.appendChild(successMessage);
      setTimeout(() => successMessage.remove(), 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete pull request');
    } finally {
      setDeletingPR(null);
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const filteredPRs = selectedRepo === 'all'
    ? pullRequests
    : pullRequests.filter(pr => pr.repository.name === selectedRepo);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Pull Requests Management
        </h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedRepo}
            onChange={(e) => setSelectedRepo(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Repositories ({repositories.length})</option>
            {repositories.map(repo => (
              <option key={repo.id} value={repo.name}>{repo.name}</option>
            ))}
          </select>
          <button
            onClick={fetchAllData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-300">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {filteredPRs.length === 0 && !error ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            No pull requests found
          </div>
        ) : (
          filteredPRs.map((pr) => (
            <div
              key={`${pr.repository.name}-${pr.id}`}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <GitPullRequest className={`w-6 h-6 ${
                    pr.state === 'open' ? 'text-green-500' : 'text-purple-500'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <GitBranch className="w-4 h-4 text-gray-500" />
                      <a
                        href={pr.repository.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-600 dark:text-gray-400 hover:text-blue-500"
                      >
                        {pr.repository.name}
                      </a>
                    </div>
                    <a
                      href={pr.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-500 transition-colors"
                    >
                      {pr.title}
                    </a>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      #{pr.number} opened by {pr.user.login} • {formatDistanceToNow(new Date(pr.created_at))} ago
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {pr.state === 'open' ? (
                    <>
                      <button
                        onClick={() => deletePullRequest(pr.number, pr.repository.name)}
                        disabled={deletingPR === pr.number}
                        className={`p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors ${
                          deletingPR === pr.number ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title="Close Pull Request"
                      >
                        {deletingPR === pr.number ? (
                          <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1 text-sm font-medium rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300">
                      Closed
                    </span>
                  )}
                </div>
              </div>
              {pr.body && (
                <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
                  {pr.body}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};