'use client';

import { useState } from 'react';

interface TopicStats {
  topicPath?: string;
  topic?: string;
  explorer_count?: number;
  max_depth?: number;
  avg_depth?: number;
  [key: string]: unknown;
}

export default function FrontierMapViz() {
  const [topicPath, setTopicPath] = useState('');
  const [stats, setStats] = useState<TopicStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    setLoading(true);
    setError(null);
    setStats([]);
    try {
      const params = new URLSearchParams();
      if (topicPath.trim()) {
        params.set('topicPath', topicPath.trim());
      }
      const url = `/api/frontier-map?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.topics || data.stats || [];
      setStats(items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function getMax(field: keyof TopicStats): number {
    let max = 0;
    for (const s of stats) {
      const val = typeof s[field] === 'number' ? (s[field] as number) : 0;
      if (val > max) max = val;
    }
    return max || 1;
  }

  const maxExplorers = getMax('explorer_count');
  const maxMaxDepth = getMax('max_depth');
  const maxAvgDepth = getMax('avg_depth');

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Frontier Map Visualization</h2>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={topicPath}
          onChange={(e) => setTopicPath(e.target.value)}
          placeholder="Optional topic path filter..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          onClick={handleFetch}
          disabled={loading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? 'Loading...' : 'Fetch'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {stats.length > 0 && (
        <div className="space-y-5">
          {stats.map((item, idx) => {
            const name = item.topicPath || item.topic || `Topic #${idx + 1}`;
            const explorers = typeof item.explorer_count === 'number' ? item.explorer_count : 0;
            const maxDep = typeof item.max_depth === 'number' ? item.max_depth : 0;
            const avgDep = typeof item.avg_depth === 'number' ? item.avg_depth : 0;

            return (
              <div key={idx} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="text-white text-sm font-medium mb-3 font-mono">{name}</h4>
                <div className="space-y-2">
                  {/* Explorer Count */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Explorers</span>
                      <span>{explorers}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(explorers / maxExplorers) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Max Depth */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Max Depth</span>
                      <span>{maxDep}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(maxDep / maxMaxDepth) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Avg Depth */}
                  <div>
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Avg Depth</span>
                      <span>{avgDep.toFixed(1)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                      <div
                        className="bg-green-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(avgDep / maxAvgDepth) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && stats.length === 0 && !error && (
        <p className="text-gray-500 text-sm">Click Fetch to load frontier map data.</p>
      )}
    </div>
  );
}
