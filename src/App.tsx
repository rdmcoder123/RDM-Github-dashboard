import React, { useState, useEffect } from 'react';
import { ThemeToggle } from './components/ThemeToggle';
import { SearchBar } from './components/SearchBar';
import { RepositoryCard } from './components/RepositoryCard';
import { LanguageChart } from './components/LanguageChart';
import { FeedbackButton } from './components/FeedbackButton';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { Github, AlertCircle } from 'lucide-react';
import type { Repository, LanguageStats } from './types';
import { fetchOrganizationRepos } from './utils/github';

const VITE_GITHUB_ORG = G2HackFest;
const VITE_GITHUB_TOKEN = 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;

const ORGANIZATION_NAME = VITE_GITHUB_ORG;
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
const CACHE_DURATION = 25 * 60 * 1000; // 25 minutes

function App() {
  const [isDark, setIsDark] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setError(null);
      
      // Check cache first
      const cachedData = localStorage.getItem('repoData');
      const lastFetchTime = localStorage.getItem('lastFetchTime');
      
      if (cachedData && lastFetchTime) {
        const timeSinceLastFetch = Date.now() - Number(lastFetchTime);
        if (timeSinceLastFetch < CACHE_DURATION) {
          setRepositories(JSON.parse(cachedData));
          setLoading(false);
          return;
        }
      }

      const repos = await fetchOrganizationRepos(ORGANIZATION_NAME);
      setRepositories(repos);
      
      // Update cache
      localStorage.setItem('repoData', JSON.stringify(repos));
      localStorage.setItem('lastFetchTime', Date.now().toString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const filteredRepos = repositories.filter((repo) =>
    repo.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const languageStats: LanguageStats[] = React.useMemo(() => {
    const stats: { [key: string]: number } = {};
    repositories.forEach((repo) => {
      Object.entries(repo.languages).forEach(([lang, value]) => {
        stats[lang] = (stats[lang] || 0) + value;
      });
    });

    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    return Object.entries(stats).map(([name, value]) => ({
      name,
      value: Math.round((value / total) * 100),
      color: name === 'TypeScript' ? '#3178c6' :
             name === 'JavaScript' ? '#f7df1e' :
             name === 'Python' ? '#3776ab' :
             name === 'Java' ? '#b07219' :
             name === 'Ruby' ? '#701516' :
             name === 'Go' ? '#00ADD8' :
             '#6e7681'
    }));
  }, [repositories]);

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors`}>
      <nav className="bg-white dark:bg-gray-800 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <Github className="w-8 h-8 text-gray-900 dark:text-white" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                G2 HackFest GitHub Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-2">
              <AdminLogin onLogin={() => setIsAdmin(true)} />
              <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isAdmin ? (
          <AdminDashboard />
        ) : (
          <>
            <div className="mb-8">
              <SearchBar value={searchQuery} onChange={setSearchQuery} />
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-300">
                <AlertCircle className="w-5 h-5" />
                <p>{error}</p>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="md:col-span-2 grid gap-6">
                  {filteredRepos.map((repo) => (
                    <RepositoryCard key={repo.name} {...repo} />
                  ))}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Design and Developed by
                    </p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      RDMCODER
                    </p>
                  </div>
                  <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    Language Distribution
                  </h2>
                  <LanguageChart data={languageStats} />
                  <div className="mt-6">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                      Summary
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300">
                      Total Repositories: {repositories.length}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      Most Used: {languageStats.slice(0, 2).map(l => l.name).join(', ')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <FeedbackButton />
    </div>
  );
}

export default App;
