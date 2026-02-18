'use client';

import { useState } from 'react';

interface Exploration {
  title?: string;
  summary?: string;
  content?: string;
  depth?: number;
  tags?: string[];
  timestamp?: number;
  address?: string;
  topicPath?: string;
  [key: string]: unknown;
}

type ViewMode = 'by-topic' | 'by-user';

export default function ExplorationViewer() {
  const [mode, setMode] = useState<ViewMode>('by-topic');
  const [address, setAddress] = useState('');
  const [topicPath, setTopicPath] = useState('');
  const [explorations, setExplorations] = useState<Exploration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    setLoading(true);
    setError(null);
    setExplorations([]);
    try {
      let url: string;
      if (mode === 'by-user') {
        if (!address.trim()) throw new Error('Address is required');
        url = `/api/explorations/by-user?address=${encodeURIComponent(address.trim())}`;
      } else {
        const params = new URLSearchParams();
        if (address.trim()) params.set('address', address.trim());
        if (topicPath.trim()) params.set('topicPath', topicPath.trim());
        url = `/api/explorations?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const items = Array.isArray(data) ? data : data.explorations || data.results || [];
      setExplorations(items);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Exploration Viewer</h2>

      {/* Mode Toggle */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mb-4 w-fit">
        <button
          onClick={() => setMode('by-topic')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'by-topic'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          By Topic
        </button>
        <button
          onClick={() => setMode('by-user')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            mode === 'by-user'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          By User
        </button>
      </div>

      {/* Inputs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          />
        </div>
        {mode === 'by-topic' && (
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Topic Path</label>
            <input
              type="text"
              value={topicPath}
              onChange={(e) => setTopicPath(e.target.value)}
              placeholder="science/physics"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        )}
        <div className="flex items-end">
          <button
            onClick={handleFetch}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {loading && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? 'Fetching...' : 'Fetch'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Results */}
      {explorations.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">{explorations.length} exploration(s) found</p>
          {explorations.map((exp, idx) => (
            <div
              key={idx}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-white font-medium text-sm">
                  {exp.title || `Exploration #${idx + 1}`}
                </h4>
                {exp.depth !== undefined && (
                  <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                    depth: {exp.depth}
                  </span>
                )}
              </div>
              {exp.summary && (
                <p className="text-gray-400 text-sm mb-2">{exp.summary}</p>
              )}
              {exp.content && (
                <p className="text-gray-500 text-xs mb-2 line-clamp-3">{exp.content}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {exp.tags?.map((tag, i) => (
                  <span
                    key={i}
                    className="text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="flex gap-4 mt-3 text-xs text-gray-600">
                {exp.address && (
                  <span className="font-mono">{exp.address.slice(0, 10)}...</span>
                )}
                {exp.topicPath && <span>{exp.topicPath}</span>}
                {exp.timestamp && (
                  <span>{new Date(exp.timestamp).toLocaleString()}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && explorations.length === 0 && !error && (
        <p className="text-gray-500 text-sm">No explorations loaded. Enter parameters and click Fetch.</p>
      )}
    </div>
  );
}
