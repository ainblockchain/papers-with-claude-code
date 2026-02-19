'use client';

import { useState } from 'react';
import { SAMPLE_EXPLORATIONS } from '@/lib/devnet-samples';

export default function QuickActions() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<{ action: string; data: any } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [seedProgress, setSeedProgress] = useState<string | null>(null);

  async function handleAction(action: string) {
    setLoading(action);
    setError(null);
    setResult(null);
    setSeedProgress(null);

    try {
      switch (action) {
        case 'setup': {
          const res = await fetch('/api/ain/setup-app', { method: 'POST' });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          setResult({ action: 'Setup App', data });
          break;
        }

        case 'seed': {
          const results: any[] = [];
          for (let i = 0; i < SAMPLE_EXPLORATIONS.length; i++) {
            const sample = SAMPLE_EXPLORATIONS[i];
            setSeedProgress(`Seeding ${i + 1}/${SAMPLE_EXPLORATIONS.length}: ${sample.label}`);
            const payload: Record<string, any> = {
              topicPath: sample.topicPath,
              title: sample.title,
              content: sample.content,
              summary: sample.summary,
              depth: sample.depth,
              tags: sample.tags.split(',').map((t) => t.trim()),
            };
            if (sample.parentEntry) payload.parentEntry = sample.parentEntry;
            if (sample.relatedEntries) payload.relatedEntries = sample.relatedEntries;

            const res = await fetch('/api/explorations', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            });
            const data = await res.json();
            results.push({ label: sample.label, ok: res.ok, data });
          }
          setSeedProgress(null);
          setResult({ action: 'Seed 7 Samples', data: results });
          break;
        }

        case 'balance': {
          const res = await fetch('/api/ain/whoami');
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          setResult({ action: 'Check Balance', data });
          break;
        }

        case 'explorations': {
          const res = await fetch('/api/explorations/by-user');
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
          setResult({ action: 'Fetch Explorations', data });
          break;
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(null);
    }
  }

  const actions = [
    { id: 'setup', label: 'Setup App', color: 'bg-green-700 hover:bg-green-600' },
    { id: 'seed', label: 'Seed 7 Samples', color: 'bg-purple-700 hover:bg-purple-600' },
    { id: 'balance', label: 'Check Balance', color: 'bg-blue-700 hover:bg-blue-600' },
    { id: 'explorations', label: 'Fetch Explorations', color: 'bg-orange-700 hover:bg-orange-600' },
  ];

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500 font-medium mr-1">Quick Actions:</span>
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleAction(action.id)}
            disabled={loading !== null}
            className={`${action.color} disabled:bg-gray-700 disabled:text-gray-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors`}
          >
            {loading === action.id ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {seedProgress || 'Working...'}
              </span>
            ) : (
              action.label
            )}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-3 bg-red-900/30 border border-red-800 rounded-lg p-2">
          <p className="text-red-400 text-xs">{error}</p>
        </div>
      )}

      {result && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 mb-1">{result.action} Result:</p>
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-xs text-green-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
            {JSON.stringify(result.data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
