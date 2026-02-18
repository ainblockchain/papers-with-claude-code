'use client';

import { useState } from 'react';

interface CourseInfo {
  contentId: string;
  title: string;
  price: string;
  payTo: string;
  description: string;
}

interface AccessResult {
  content: string;
  paid: boolean;
  receipt?: {
    seller: string;
    topic_path: string;
    entry_id: string;
    amount: string;
    currency: string;
    tx_hash: string;
    accessed_at: number;
  };
}

interface CourseAccessPanelProps {
  course: CourseInfo;
}

export default function CourseAccessPanel({ course }: CourseAccessPanelProps) {
  const [ownerAddress, setOwnerAddress] = useState(course.payTo);
  const [topicPath, setTopicPath] = useState('');
  const [entryId, setEntryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AccessResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccess() {
    if (!ownerAddress.trim() || !topicPath.trim() || !entryId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/knowledge/access-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerAddress: ownerAddress.trim(),
          topicPath: topicPath.trim(),
          entryId: entryId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h3 className="text-white font-medium text-sm mb-3">
        Access: {course.title}
      </h3>

      <div className="bg-gray-800 rounded-lg p-3 mb-3 border border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Price</span>
          <span className="text-purple-300 font-medium">{course.price} AIN</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-400">Publisher</span>
          <span className="text-gray-300 font-mono text-xs truncate ml-4">{course.payTo}</span>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Owner Address</label>
          <input
            type="text"
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Topic Path</label>
          <input
            type="text"
            value={topicPath}
            onChange={(e) => setTopicPath(e.target.value)}
            placeholder="courses/blockchain/intro"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Entry ID</label>
          <input
            type="text"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
            placeholder="From publish result"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-colors font-mono"
          />
        </div>
      </div>

      <button
        onClick={handleAccess}
        disabled={loading || !ownerAddress.trim() || !topicPath.trim() || !entryId.trim()}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? 'Paying & Accessing...' : `Pay ${course.price} AIN & Access`}
      </button>

      {error && (
        <div className="mt-3 bg-red-900/30 border border-red-800 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-3 space-y-3">
          {result.paid && result.receipt && (
            <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
              <p className="text-green-400 text-sm font-medium mb-2">Payment Successful</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Amount</span>
                  <span className="text-green-300">{result.receipt.amount} {result.receipt.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tx Hash</span>
                  <span className="text-green-300 font-mono truncate ml-4">{result.receipt.tx_hash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Seller</span>
                  <span className="text-green-300 font-mono truncate ml-4">{result.receipt.seller}</span>
                </div>
              </div>
            </div>
          )}

          {!result.paid && (
            <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-3">
              <p className="text-blue-400 text-sm font-medium">Free Content (no payment required)</p>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-xs text-gray-500 mb-2">Course Content</p>
            <div className="text-sm text-gray-300 whitespace-pre-wrap max-h-96 overflow-y-auto">
              {result.content}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
