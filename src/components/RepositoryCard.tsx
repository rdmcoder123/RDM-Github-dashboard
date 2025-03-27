import React from 'react';
import { ExternalLink, Book, GitFork, GitCommit } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { Repository } from '../types';

interface RepositoryCardProps extends Repository {}

const languageColors: { [key: string]: string } = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3776ab',
  Java: '#b07219',
  Ruby: '#701516',
  Go: '#00ADD8',
  Rust: '#dea584',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  PHP: '#4F5D95',
  Swift: '#ffac45',
  Kotlin: '#F18E33',
  Dart: '#00B4AB',
  Shell: '#89e051',
  PowerShell: '#012456',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Lua: '#000080',
  Perl: '#0298c3',
  R: '#198CE7',
  Julia: '#a270ba',
  Haskell: '#5e5086',
  Elixir: '#6e4a7e',
  Assembly: '#6E4C13',
  MATLAB: '#e16737',
  Groovy: '#4298b8',
  Scala: '#c22d40',
  'Objective-C': '#438eff',
  CoffeeScript: '#244776',
  Clojure: '#db5855',
  Erlang: '#B83998',
  OCaml: '#3be133',
  Fortran: '#4d41b1'
};

export const RepositoryCard: React.FC<RepositoryCardProps> = ({
  name,
  url,
  readmeUrl,
  description,
  languages,
  lastCommit,
  readmeContent,
}) => {
  const languageData = React.useMemo(() => {
    const total = Object.values(languages).reduce((a, b) => a + b, 0);
    return Object.entries(languages).map(([name, value]) => ({
      name,
      value: Math.round((value / total) * 100),
      color: languageColors[name] || '#6e7681'
    }));
  }, [languages]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-500 transition-colors flex items-center gap-2"
          >
            {name}
            <ExternalLink className="w-4 h-4" />
          </a>
        </h3>
        <a
          href={readmeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-500 hover:text-blue-500 transition-colors"
          title="View README"
        >
          <Book className="w-5 h-5" />
        </a>
      </div>
      
      <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-2">
        {description}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={languageData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                paddingAngle={2}
                dataKey="value"
              >
                {languageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-2 rounded shadow">
                        <p className="text-sm font-medium">
                          {data.name}: {data.value}%
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">README Preview</h4>
          <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono">
            {readmeContent || 'No README content available'}
          </pre>
        </div>
      </div>

      {lastCommit && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-2">
            <GitCommit className="w-4 h-4" />
            <a
              href={lastCommit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-blue-500 transition-colors"
            >
              Latest commit
            </a>
            <span className="text-gray-400">•</span>
            <span>{formatDistanceToNow(new Date(lastCommit.date))} ago</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-200 line-clamp-2">
            {lastCommit.message}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            by {lastCommit.author}
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {Object.entries(languages).map(([lang]) => (
          <span
            key={lang}
            className="px-3 py-1 rounded-full text-sm font-medium text-white"
            style={{ backgroundColor: languageColors[lang] || '#6e7681' }}
          >
            {lang}
          </span>
        ))}
      </div>
    </div>
  );
};