'use client';

import { useEffect, useState } from 'react';
import { AGENT_ADDRESS, AGENT_ID, AGENT_NAME, AGENT_REGISTRATION_URL, getAgentRegistration } from '@/lib/base-client';

export default function NetworkOverview() {
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAgentRegistration()
      .then(r => setRegistered(r.isRegistered))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse p-4">Loading agent identity...</div>;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold text-cogito-blue">{AGENT_NAME}</span>
        {registered && (
          <span className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded font-bold">
            ERC-8004 #{AGENT_ID}
          </span>
        )}
      </div>
      <div className="text-xs text-gray-400 font-mono truncate">{AGENT_ADDRESS}</div>
      <div className="text-xs text-gray-500 mt-1">{AGENT_REGISTRATION_URL}</div>
    </div>
  );
}
