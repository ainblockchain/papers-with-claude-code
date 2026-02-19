'use client';

import { useState, useEffect } from 'react';
import { DEVNET_PROVIDER_URL, LOCALHOST_PROVIDER_URL, ADDR1, ADDR2 } from '@/lib/devnet-samples';

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

  async function handleUpdate(url?: string) {
    const targetUrl = url || inputUrl.trim();
    if (!targetUrl) return;
    setUpdating(true);
    setStatus('loading');
    try {
      const res = await fetch('/api/ain/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerUrl: targetUrl }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const newUrl = data.providerUrl || targetUrl;
      setProviderUrl(newUrl);
      setInputUrl(newUrl);
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

      {/* Quick-switch preset buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => handleUpdate(DEVNET_PROVIDER_URL)}
          disabled={updating}
          className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          Devnet
        </button>
        <button
          onClick={() => handleUpdate(LOCALHOST_PROVIDER_URL)}
          disabled={updating}
          className="bg-orange-700 hover:bg-orange-600 disabled:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          Localhost
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1.5">Provider URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://devnet-api.ainetwork.ai"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
            />
            <button
              onClick={() => handleUpdate()}
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

        {/* Known accounts display */}
        <div className="bg-gray-800 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-2">Known Accounts</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-purple-400 font-medium w-28 shrink-0">Genesis Owner</span>
              <span className="text-xs text-gray-300 font-mono truncate">{ADDR1}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-orange-400 font-medium w-28 shrink-0">Test Account</span>
              <span className="text-xs text-gray-300 font-mono truncate">{ADDR2}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
