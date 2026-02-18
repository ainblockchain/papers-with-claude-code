'use client';

import { useState } from 'react';

export default function AccessPanel() {
  const [ownerAddress, setOwnerAddress] = useState('');
  const [topicPath, setTopicPath] = useState('');
  const [entryId, setEntryId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!ownerAddress.trim() || !topicPath.trim() || !entryId.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/access', {
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
      setResult(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function renderResult() {
    if (!result) return null;

    const data = result as Record<string, unknown>;
    const hasContent = data.content !== undefined;
    const paymentStatus = data.paymentStatus || data.payment_status;

    return (
      <div className="mt-4 space-y-3">
        {paymentStatus && (
          <div
            className={`rounded-lg p-3 border ${
              paymentStatus === 'paid' || paymentStatus === 'success'
                ? 'bg-green-900/30 border-green-800'
                : paymentStatus === 'pending'
                ? 'bg-yellow-900/30 border-yellow-800'
                : 'bg-gray-800 border-gray-700'
            }`}
          >
            <p className="text-xs text-gray-500 mb-1">Payment Status</p>
            <p
              className={`text-sm font-medium ${
                paymentStatus === 'paid' || paymentStatus === 'success'
                  ? 'text-green-400'
                  : paymentStatus === 'pending'
                  ? 'text-yellow-400'
                  : 'text-gray-300'
              }`}
            >
              {String(paymentStatus)}
            </p>
          </div>
        )}

        {hasContent && (
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <p className="text-xs text-gray-500 mb-2">Content</p>
            <div className="text-sm text-gray-300 whitespace-pre-wrap">
              {typeof data.content === 'string'
                ? data.content
                : JSON.stringify(data.content, null, 2)}
            </div>
          </div>
        )}

        <details className="bg-gray-800 rounded-lg border border-gray-700">
          <summary className="px-4 py-2 text-sm text-gray-400 cursor-pointer hover:text-white transition-colors">
            Full Response JSON
          </summary>
          <pre className="px-4 pb-3 text-xs text-green-400 font-mono overflow-x-auto max-h-64 overflow-y-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-2">Access Content</h2>
      <p className="text-gray-400 text-sm mb-4">
        Request access to an exploration entry. May require payment.
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Owner Address *</label>
          <input
            type="text"
            value={ownerAddress}
            onChange={(e) => setOwnerAddress(e.target.value)}
            placeholder="0x..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Topic Path *</label>
          <input
            type="text"
            value={topicPath}
            onChange={(e) => setTopicPath(e.target.value)}
            placeholder="science/physics/quantum"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Entry ID *</label>
          <input
            type="text"
            value={entryId}
            onChange={(e) => setEntryId(e.target.value)}
            placeholder="entry_abc123"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !ownerAddress.trim() || !topicPath.trim() || !entryId.trim()}
        className="mt-4 flex items-center gap-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? 'Requesting...' : 'Request Access'}
      </button>

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-800 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {renderResult()}
    </div>
  );
}
