'use client';

import { useEffect, useState } from 'react';
import KnowledgeGraphViz from '@/components/KnowledgeGraphViz';
import { getKnowledgeGraph } from '@/lib/agent-client';

export default function GraphPage() {
  const [graph, setGraph] = useState<{ nodes: any[]; edges: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKnowledgeGraph()
      .then(setGraph)
      .catch(() => setGraph({ nodes: [], edges: [] }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Graph</h1>
        <p className="text-gray-400 text-sm">Interactive visualization — live from AIN devnet</p>
      </div>

      {loading ? (
        <div className="animate-pulse bg-gray-800 rounded-lg h-[600px]" />
      ) : graph && graph.nodes.length > 0 ? (
        <div>
          <div className="text-sm text-gray-400 mb-2">
            {graph.nodes.length} nodes | {graph.edges.length} edges
          </div>
          <KnowledgeGraphViz nodes={graph.nodes} edges={graph.edges} />
        </div>
      ) : (
        <p className="text-gray-500">No graph data available.</p>
      )}
    </div>
  );
}
