'use client';

import { useState, useEffect } from 'react';

interface WalletData {
  address?: string;
  balance?: string | number;
  error?: string;
}

export default function WalletInfo() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [passkeyAddress, setPasskeyAddress] = useState<string | null>(null);

  useEffect(() => {
    fetchWallet();
    loadPasskeyAddress();
  }, []);

  function loadPasskeyAddress() {
    try {
      const stored = localStorage.getItem('passkey_info');
      if (stored) {
        const info = JSON.parse(stored);
        setPasskeyAddress(info.ainAddress || null);
      }
    } catch {
      // ignore
    }
  }

  async function fetchWallet() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ain/whoami');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setWallet(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Wallet Info</h2>
        <button
          onClick={fetchWallet}
          disabled={loading}
          className="text-sm text-gray-400 hover:text-white transition-colors"
        >
          Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading wallet info...</span>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {wallet && !loading && (
        <div className="space-y-3">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Server Wallet Address</p>
            <p className="text-sm text-green-400 font-mono break-all">
              {wallet.address || 'N/A'}
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">AIN Balance</p>
            <p className="text-sm text-white font-mono">
              {wallet.balance !== undefined ? String(wallet.balance) : 'N/A'}
              <span className="text-gray-500 ml-1">AIN</span>
            </p>
          </div>

          {passkeyAddress && (
            <div className="bg-gray-800 rounded-lg p-3 border border-blue-900/50">
              <p className="text-xs text-gray-500 mb-1">Passkey-Derived Address</p>
              <p className="text-sm text-blue-400 font-mono break-all">{passkeyAddress}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
