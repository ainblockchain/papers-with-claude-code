'use client';

import { useEffect, useState } from 'react';
import FrontierMapViz from '@/components/FrontierMapViz';
import { getFrontierMap, listTopics } from '@/lib/agent-client';

export default function FrontierPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Get all top-level topics and their frontier stats
        const topics = await listTopics();
        const allEntries: any[] = [];

        for (const topic of topics) {
          try {
            const subEntries = await getFrontierMap(topic);
            if (Array.isArray(subEntries)) {
              allEntries.push(...subEntries);
            }
          } catch {
            // Individual topic fetch may fail
          }
        }

        setEntries(allEntries);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    load();
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
