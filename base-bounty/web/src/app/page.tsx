'use client';

import { useEffect, useState } from 'react';
import { getGraphStats, getAllFrontierEntries, getRecentExplorations } from '@/lib/agent-client';

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);
  const [frontier, setFrontier] = useState<any[]>([]);
  const [explorations, setExplorations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [graphStats, frontierEntries, recentExps] = await Promise.all([
          getGraphStats().catch(() => null),
          getAllFrontierEntries().catch(() => []),
          getRecentExplorations(10).catch(() => []),
        ]);
        setStats(graphStats);
        setFrontier((frontierEntries || []).filter((e: any) => e.stats?.explorer_count > 0));
        setExplorations(recentExps || []);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Collective Intelligence</h1>
        <p className="text-gray-400">
          Global knowledge graph — live from AIN devnet
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 uppercase">Topics</div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.topic_count ?? '...'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 uppercase">Graph Nodes</div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.node_count ?? '...'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 uppercase">Graph Edges</div>
          <div className="text-2xl font-bold text-white mt-1">
            {stats?.edge_count ?? '...'}
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-xs text-gray-400 uppercase">Explorations</div>
          <div className="text-2xl font-bold text-white mt-1">
            {loading ? '...' : explorations.length}
          </div>
        </div>
      </div>

      {/* Frontier overview */}
      {frontier.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3">Knowledge Frontier</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {frontier.map((entry) => (
              <div key={entry.topic} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="font-mono text-sm text-cogito-blue">{entry.topic}</div>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>{entry.stats.explorer_count} explorer{entry.stats.explorer_count !== 1 ? 's' : ''}</span>
                  <span>depth {entry.stats.max_depth}/{entry.stats.avg_depth.toFixed(1)}</span>
                </div>
                <div className="mt-2 bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-cogito-purple rounded-full h-1.5"
                    style={{ width: `${Math.min((entry.stats.max_depth / 5) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent explorations */}
      {explorations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-3">Recent Explorations</h2>
          <div className="space-y-2">
            {explorations.map((exp, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                <div className="font-semibold">{exp.title || 'Untitled'}</div>
                {exp.summary && (
                  <div className="text-sm text-gray-400 mt-1">{exp.summary}</div>
                )}
                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                  <span className="text-cogito-blue">{exp.topic_path}</span>
                  <span>depth {exp.depth}</span>
                  <span className="font-mono truncate max-w-[120px]">{exp.explorer}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-gray-500 py-8">
          Loading from AIN devnet...
        </div>
      )}
    </div>
  );
}
