'use client';

import { useState } from 'react';
import { ADDR1, ADDR2 } from '@/lib/devnet-samples';

interface Connection {
  nodeId: string;
  type: string;
}

interface ProgressEntry {
  entryId: string;
  nodeId: string;
  title: string;
  depth: number;
  summary: string;
  price: string | null;
  createdAt: number;
  connections: Connection[];
}

interface TopicSummary {
  topicPath: string;
  entryCount: number;
  maxDepth: number;
  entries: ProgressEntry[];
}

interface Purchase {
  key: string;
  seller: string;
  topicPath: string;
  entryId: string;
  amount: string;
  currency: string;
  accessedAt: number;
}

interface ProgressData {
  address: string;
  totalTopics: number;
  totalEntries: number;
  totalPurchases: number;
  topics: TopicSummary[];
  purchases: Purchase[];
}

export default function LearnerProgress() {
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchProgress() {
    const addr = address.trim();
    if (!addr) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/knowledge/progress?address=${encodeURIComponent(addr)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setData(json.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-2">Learner Progress</h2>
      <p className="text-gray-400 text-sm mb-4">
        Look up any address&apos;s learning progress across all topics.
      </p>

      {/* Quick address presets */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1.5">Quick Lookup:</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setAddress(ADDR1)}
            className="bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 px-2.5 py-1 rounded-full text-xs transition-colors border border-purple-800"
          >
            Genesis Owner
          </button>
          <button
            onClick={() => setAddress(ADDR2)}
            className="bg-orange-900/50 hover:bg-orange-800/50 text-orange-300 px-2.5 py-1 rounded-full text-xs transition-colors border border-orange-800"
          >
            Test Account
          </button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchProgress()}
          placeholder="0x... (your address or a friend's)"
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
        <button
          onClick={fetchProgress}
          disabled={loading || !address.trim()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? 'Loading...' : 'Lookup'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
              <p className="text-2xl font-bold text-white">{data.totalTopics}</p>
              <p className="text-xs text-gray-400">Topics</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
              <p className="text-2xl font-bold text-white">{data.totalEntries}</p>
              <p className="text-xs text-gray-400">Entries</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
              <p className="text-2xl font-bold text-white">{data.totalPurchases}</p>
              <p className="text-xs text-gray-400">Purchases</p>
            </div>
          </div>

          {/* Per-topic breakdown */}
          {data.topics.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Explorations by Topic</h3>
              <div className="space-y-2">
                {data.topics.map((topic) => (
                  <details
                    key={topic.topicPath}
                    className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden"
                  >
                    <summary className="px-4 py-3 cursor-pointer hover:bg-gray-750 transition-colors">
                      <div className="inline-flex items-center gap-3">
                        <span className="text-white text-sm font-medium">{topic.topicPath}</span>
                        <span className="text-xs text-gray-500">
                          {topic.entryCount} {topic.entryCount === 1 ? 'entry' : 'entries'}
                        </span>
                        <span className="text-xs text-blue-400">max depth {topic.maxDepth}</span>
                      </div>
                    </summary>
                    <div className="px-4 pb-3 space-y-2">
                      {topic.entries.map((entry) => (
                        <div
                          key={entry.entryId}
                          className="bg-gray-900 rounded-lg p-3 border border-gray-700"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium">{entry.title}</p>
                              {entry.summary && (
                                <p className="text-gray-400 text-xs mt-1">{entry.summary}</p>
                              )}
                              <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs text-gray-500">
                                  Depth: {entry.depth}
                                </span>
                                <span className="text-xs text-gray-600 font-mono">
                                  {entry.entryId}
                                </span>
                                {entry.createdAt > 0 && (
                                  <span className="text-xs text-gray-600">
                                    {new Date(entry.createdAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              {entry.connections && entry.connections.length > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {entry.connections.map((conn) => (
                                    <span
                                      key={conn.nodeId}
                                      className={`text-xs px-1.5 py-0.5 rounded border ${
                                        conn.type === 'extends'
                                          ? 'bg-blue-900/30 border-blue-800 text-blue-400'
                                          : conn.type === 'prerequisite'
                                          ? 'bg-orange-900/30 border-orange-800 text-orange-400'
                                          : 'bg-gray-700 border-gray-600 text-gray-400'
                                      }`}
                                    >
                                      {conn.type} {conn.nodeId.split('_').pop()?.slice(0, 8)}...
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            {entry.price && (
                              <span className="ml-2 inline-flex items-center bg-purple-900/40 border border-purple-700 text-purple-300 text-xs font-medium px-2 py-0.5 rounded-full">
                                {entry.price} AIN
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* Purchases */}
          {data.purchases.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-300 mb-2">Purchase History</h3>
              <div className="space-y-2">
                {data.purchases.map((p) => (
                  <div
                    key={p.key}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm">{p.topicPath}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-500 font-mono truncate">
                            Seller: {p.seller}
                          </span>
                          {p.accessedAt > 0 && (
                            <span className="text-xs text-gray-600">
                              {new Date(p.accessedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="ml-2 text-green-400 text-sm font-medium">
                        {p.amount} {p.currency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.totalTopics === 0 && data.totalPurchases === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              No learning activity found for this address.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
