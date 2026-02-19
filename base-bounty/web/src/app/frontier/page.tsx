'use client';

import { useEffect, useState } from 'react';
import FrontierMapViz from '@/components/FrontierMapViz';
import { getAllFrontierEntries } from '@/lib/agent-client';

export default function FrontierPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllFrontierEntries()
      .then((data) => setEntries((data || []).filter((e: any) => e.stats?.explorer_count > 0)))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Frontier Map</h1>
        <p className="text-gray-400 text-sm">
          Shared exploration frontier across all nodes
        </p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-gray-800 rounded-lg h-20" />
          ))}
        </div>
      ) : (
        <FrontierMapViz entries={entries} />
      )}
    </div>
  );
}
