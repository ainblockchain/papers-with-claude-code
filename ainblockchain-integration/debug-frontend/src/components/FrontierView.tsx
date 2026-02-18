'use client';

import { useState } from 'react';

interface FrontierData {
  topicPath?: string;
  title?: string;
  description?: string;
  stats?: {
    explorer_count?: number;
    max_depth?: number;
    avg_depth?: number;
    [key: string]: unknown;
  };
  explorers?: Array<{
    address?: string;
    depth?: number;
    timestamp?: number;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

export default function FrontierView() {
  const [topicPath, setTopicPath] = useState('');
  const [frontier, setFrontier] = useState<FrontierData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    if (!topicPath.trim()) return;
    setLoading(true);
    setError(null);
    setFrontier(null);
    try {
      const res = await fetch(
        `/api/topics/frontier?topicPath=${encodeURIComponent(topicPath.trim())}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFrontier(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Frontier View</h2>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={topicPath}
          onChange={(e) => setTopicPath(e.target.value)}
          placeholder="Enter topic path..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          onClick={handleFetch}
          disabled={loading || !topicPath.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? 'Loading...' : 'Fetch Frontier'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {frontier && (
        <div className="space-y-4">
          {/* Topic Info */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-white font-medium text-sm mb-2">Topic Info</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {frontier.topicPath && (
                <div>
                  <span className="text-gray-500">Path: </span>
                  <span className="text-gray-300 font-mono">{frontier.topicPath}</span>
                </div>
              )}
              {frontier.title && (
                <div>
                  <span className="text-gray-500">Title: </span>
                  <span className="text-gray-300">{frontier.title}</span>
                </div>
              )}
              {frontier.description && (
                <div className="sm:col-span-2">
                  <span className="text-gray-500">Description: </span>
                  <span className="text-gray-400">{frontier.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          {frontier.stats && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-medium text-sm mb-3">Stats</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">
                    {frontier.stats.explorer_count ?? '-'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Explorers</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-400">
                    {frontier.stats.max_depth ?? '-'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Max Depth</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">
                    {frontier.stats.avg_depth !== undefined
                      ? Number(frontier.stats.avg_depth).toFixed(1)
                      : '-'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Avg Depth</p>
                </div>
              </div>

              {/* Additional stats */}
              {Object.entries(frontier.stats)
                .filter(([k]) => !['explorer_count', 'max_depth', 'avg_depth'].includes(k))
                .length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  {Object.entries(frontier.stats)
                    .filter(([k]) => !['explorer_count', 'max_depth', 'avg_depth'].includes(k))
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm py-0.5">
                        <span className="text-gray-500">{key}</span>
                        <span className="text-gray-300">{String(value)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* Explorers */}
          {frontier.explorers && frontier.explorers.length > 0 && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-white font-medium text-sm mb-3">
                Explorers ({frontier.explorers.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {frontier.explorers.map((explorer, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm text-gray-300 font-mono">
                      {explorer.address
                        ? `${explorer.address.slice(0, 8)}...${explorer.address.slice(-6)}`
                        : `Explorer #${idx + 1}`}
                    </span>
                    <div className="flex gap-3 text-xs text-gray-500">
                      {explorer.depth !== undefined && <span>depth: {explorer.depth}</span>}
                      {explorer.timestamp && (
                        <span>{new Date(explorer.timestamp).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Raw JSON fallback for unknown fields */}
          {Object.keys(frontier).filter(
            (k) => !['topicPath', 'title', 'description', 'stats', 'explorers'].includes(k)
          ).length > 0 && (
            <details className="bg-gray-800 rounded-lg border border-gray-700">
              <summary className="px-4 py-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
                Raw Data
              </summary>
              <pre className="px-4 pb-3 text-xs text-green-400 font-mono overflow-x-auto">
                {JSON.stringify(frontier, null, 2)}
              </pre>
            </details>
          )}
        </div>
      )}

      {!loading && !frontier && !error && (
        <p className="text-gray-500 text-sm">Enter a topic path and click Fetch Frontier.</p>
      )}
    </div>
  );
}
