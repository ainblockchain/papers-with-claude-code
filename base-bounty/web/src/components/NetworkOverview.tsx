'use client';

import { useEffect, useState } from 'react';
import { NodeIdentity, getAllRegisteredNodes } from '@/lib/base-client';

export default function NetworkOverview() {
  const [nodes, setNodes] = useState<NodeIdentity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllRegisteredNodes()
      .then(setNodes)
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="animate-pulse p-4">Loading network...</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Registered Nodes ({nodes.length})</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map((node) => (
          <div key={node.address} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="font-semibold text-cogito-blue">{node.name}</div>
            <div className="text-xs text-gray-400 font-mono mt-1 truncate">{node.address}</div>
            <div className="text-sm text-gray-300 mt-2">{node.serviceEndpoint}</div>
            {node.metadata?.x402Support && (
              <span className="inline-block mt-2 text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded">
                x402
              </span>
            )}
          </div>
        ))}
        {nodes.length === 0 && (
          <p className="text-gray-500">No nodes registered yet.</p>
        )}
      </div>
    </div>
  );
}
