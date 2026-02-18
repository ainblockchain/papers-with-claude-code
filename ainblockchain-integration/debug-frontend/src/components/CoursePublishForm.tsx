'use client';

import { useState } from 'react';

export default function CoursePublishForm() {
  const [topicPath, setTopicPath] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [summary, setSummary] = useState('');
  const [depth, setDepth] = useState<number>(1);
  const [tags, setTags] = useState('');
  const [price, setPrice] = useState('');
  const [parentOwner, setParentOwner] = useState('');
  const [parentTopic, setParentTopic] = useState('');
  const [parentEntryId, setParentEntryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish() {
    if (!topicPath.trim() || !title.trim() || !content.trim() || !price.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/knowledge/publish-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicPath: topicPath.trim(),
          title: title.trim(),
          content: content.trim(),
          summary: summary.trim(),
          depth,
          tags: tags.trim(),
          price: price.trim(),
          parentEntry: parentOwner.trim() && parentTopic.trim() && parentEntryId.trim()
            ? { ownerAddress: parentOwner.trim(), topicPath: parentTopic.trim(), entryId: parentEntryId.trim() }
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-2">Publish Gated Course</h2>
      <p className="text-gray-400 text-sm mb-4">
        Publish a course with x402 payment gating. Content is stored on the gateway
        and metadata is recorded on-chain.
      </p>

      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Topic Path *</label>
            <input
              type="text"
              value={topicPath}
              onChange={(e) => setTopicPath(e.target.value)}
              placeholder="courses/blockchain/intro"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Introduction to Blockchain"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Content *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Full course content (this will be gated behind payment)..."
            rows={6}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors resize-y"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Summary</label>
          <input
            type="text"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Brief description shown to potential buyers"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Price (AIN) *</label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="10"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Depth</label>
            <input
              type="number"
              value={depth}
              onChange={(e) => setDepth(parseInt(e.target.value) || 1)}
              min={1}
              max={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tags (comma-separated)</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="blockchain, intro, course"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Graph: Parent Entry (optional) */}
        <details className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <summary className="px-3 py-2 cursor-pointer text-xs text-gray-400 hover:text-gray-300 transition-colors">
            Link to parent entry (graph edge)
          </summary>
          <div className="px-3 pb-3 pt-1 space-y-2">
            <p className="text-xs text-gray-500">
              Connect this entry to an existing one. Creates an &quot;extends&quot; edge in the knowledge graph.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Parent Owner Address</label>
                <input
                  type="text"
                  value={parentOwner}
                  onChange={(e) => setParentOwner(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Parent Topic Path</label>
                <input
                  type="text"
                  value={parentTopic}
                  onChange={(e) => setParentTopic(e.target.value)}
                  placeholder="physics/quantum"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Parent Entry ID</label>
                <input
                  type="text"
                  value={parentEntryId}
                  onChange={(e) => setParentEntryId(e.target.value)}
                  placeholder="Entry ID"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
              </div>
            </div>
          </div>
        </details>
      </div>

      <button
        onClick={handlePublish}
        disabled={loading || !topicPath.trim() || !title.trim() || !content.trim() || !price.trim()}
        className="mt-4 flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? 'Publishing...' : 'Publish Course'}
      </button>

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-800 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">Publish Result</p>
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
