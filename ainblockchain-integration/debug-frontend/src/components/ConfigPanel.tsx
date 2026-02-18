'use client';

import { useState, useEffect } from 'react';

export default function ConfigPanel() {
  const [providerUrl, setProviderUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'connected' | 'error' | 'loading'>('loading');
  const [statusMessage, setStatusMessage] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  async function fetchConfig() {
    setStatus('loading');
    try {
      const res = await fetch('/api/ain/config');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const url = data.providerUrl || data.provider_url || '';
      setProviderUrl(url);
      setInputUrl(url);
      setStatus('connected');
      setStatusMessage('Connected');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus('error');
      setStatusMessage(`Failed to fetch config: ${message}`);
    }
  }

  async function handleUpdate() {
    if (!inputUrl.trim()) return;
    setUpdating(true);
    setStatus('loading');
    try {
      const res = await fetch('/api/ain/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerUrl: inputUrl.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProviderUrl(data.providerUrl || inputUrl.trim());
      setStatus('connected');
      setStatusMessage('Updated successfully');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus('error');
      setStatusMessage(`Update failed: ${message}`);
    } finally {
      setUpdating(false);
    }
  }

  const statusColors = {
    idle: 'bg-gray-500',
    connected: 'bg-green-500',
    error: 'bg-red-500',
    loading: 'bg-yellow-500 animate-pulse',
  };

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h2 className="text-lg font-semibold text-white mb-4">AIN Provider Configuration</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Provider URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://testnet-api.ainetwork.ai"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={handleUpdate}
              disabled={updating || !inputUrl.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {updating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusColors[status]}`} />
          <span className="text-sm text-gray-400">
            {statusMessage || 'Checking connection...'}
          </span>
        </div>

        {providerUrl && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Current Provider</p>
            <p className="text-sm text-gray-300 font-mono">{providerUrl}</p>
          </div>
        )}
      </div>
    </div>
  );
}
