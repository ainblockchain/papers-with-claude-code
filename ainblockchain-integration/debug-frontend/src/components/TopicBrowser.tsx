'use client';

import { useState, useEffect } from 'react';

interface TopicNode {
  name?: string;
  path?: string;
  title?: string;
  description?: string;
  children?: TopicNode[];
  [key: string]: unknown;
}

export default function TopicBrowser() {
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<TopicNode | null>(null);
  const [topicDetail, setTopicDetail] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Register form
  const [regPath, setRegPath] = useState('');
  const [regTitle, setRegTitle] = useState('');
  const [regDescription, setRegDescription] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regResult, setRegResult] = useState<unknown>(null);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    fetchTopics();
  }, []);

  async function fetchTopics() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/topics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTopics(Array.isArray(data) ? data : data.topics || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTopicDetail(topicPath: string) {
    setDetailLoading(true);
    setTopicDetail(null);
    try {
      const res = await fetch(`/api/topics/info?topicPath=${encodeURIComponent(topicPath)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTopicDetail(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setTopicDetail({ error: message });
    } finally {
      setDetailLoading(false);
    }
  }

  function handleTopicClick(topic: TopicNode) {
    setSelectedTopic(topic);
    const path = topic.path || topic.name || '';
    if (path) {
      fetchTopicDetail(path);
    }
  }

  async function handleRegister() {
    if (!regPath.trim()) return;
    setRegLoading(true);
    setRegError(null);
    setRegResult(null);
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicPath: regPath.trim(),
          title: regTitle.trim(),
          description: regDescription.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setRegResult(data);
      fetchTopics(); // refresh list
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setRegError(message);
    } finally {
      setRegLoading(false);
    }
  }

  function renderTopicNode(topic: TopicNode, depth: number = 0) {
    const name = topic.name || topic.path || topic.title || 'Unknown';
    const isSelected = selectedTopic === topic;

    return (
      <div key={`${name}-${depth}`}>
        <button
          onClick={() => handleTopicClick(topic)}
          className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
            isSelected
              ? 'bg-blue-900/40 text-blue-300 border border-blue-800'
              : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
        >
          <span className="text-gray-600 mr-2">{topic.children?.length ? '>' : '-'}</span>
          {name}
        </button>
        {topic.children?.map((child) => renderTopicNode(child, depth + 1))}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">Topic Browser</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Tree */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">Topics</h3>
            <button
              onClick={fetchTopics}
              disabled={loading}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Refresh
            </button>
          </div>

          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400 text-sm">Loading topics...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-0.5 max-h-80 overflow-y-auto">
            {topics.map((topic) => renderTopicNode(topic))}
          </div>

          {!loading && topics.length === 0 && !error && (
            <p className="text-gray-500 text-sm">No topics found.</p>
          )}
        </div>

        {/* Topic Detail */}
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Topic Detail</h3>
          {detailLoading && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-gray-400 text-sm">Loading...</span>
            </div>
          )}
          {topicDetail && !detailLoading && (
            <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto max-h-64 overflow-y-auto">
              {JSON.stringify(topicDetail, null, 2)}
            </pre>
          )}
          {!topicDetail && !detailLoading && (
            <p className="text-gray-500 text-sm">Select a topic to view details.</p>
          )}
        </div>
      </div>

      {/* Register Topic Form */}
      <div className="mt-6 pt-5 border-t border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Register Topic</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <input
            type="text"
            value={regPath}
            onChange={(e) => setRegPath(e.target.value)}
            placeholder="topicPath (e.g. science/physics)"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <input
            type="text"
            value={regTitle}
            onChange={(e) => setRegTitle(e.target.value)}
            placeholder="Title"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <input
            type="text"
            value={regDescription}
            onChange={(e) => setRegDescription(e.target.value)}
            placeholder="Description"
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <button
          onClick={handleRegister}
          disabled={regLoading || !regPath.trim()}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {regLoading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {regLoading ? 'Registering...' : 'Register Topic'}
        </button>

        {regError && (
          <div className="mt-3 bg-red-900/30 border border-red-800 rounded-lg p-3">
            <p className="text-red-400 text-sm">{regError}</p>
          </div>
        )}
        {regResult && (
          <pre className="mt-3 bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto">
            {JSON.stringify(regResult, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
