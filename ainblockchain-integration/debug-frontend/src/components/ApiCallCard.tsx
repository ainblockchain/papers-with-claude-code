'use client';

import { ReactNode } from 'react';

interface ApiCallCardProps {
  title: string;
  description: string;
  children: ReactNode;
  onSubmit: () => void;
  result: unknown;
  loading: boolean;
}

export default function ApiCallCard({
  title,
  description,
  children,
  onSubmit,
  result,
  loading,
}: ApiCallCardProps) {
  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{description}</p>

      <div className="space-y-3 mb-4">{children}</div>

      <button
        onClick={onSubmit}
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-blue-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        {loading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        )}
        {loading ? 'Sending...' : 'Send'}
      </button>

      {result !== null && result !== undefined && (
        <div className="mt-4">
          <p className="text-xs text-gray-500 mb-2">Response</p>
          <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-xs text-green-400 font-mono overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
