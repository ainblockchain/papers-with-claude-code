'use client';

import { useEffect, useState } from 'react';
import KnowledgeGraphViz from '@/components/KnowledgeGraphViz';
import { getKnowledgeGraph } from '@/lib/agent-client';

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3402';

export default function GraphPage() {
  const [graph, setGraph] = useState<{ nodes: Record<string, any>; edges: Record<string, any> } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getKnowledgeGraph(AGENT_URL)
      .then(setGraph)
      .catch(() => setGraph({ nodes: {}, edges: {} }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Graph</h1>
        <p className="text-gray-400 text-sm">Interactive visualization of the global knowledge graph</p>
      </div>

      {loading ? (
        <div className="animate-pulse bg-gray-800 rounded-lg h-[600px]" />
      ) : graph ? (
        <div>
          <div className="text-sm text-gray-400 mb-2">
            {Object.keys(graph.nodes).length} nodes | {Object.keys(graph.edges).length} edge groups
          </div>
          <KnowledgeGraphViz nodes={graph.nodes} edges={graph.edges} />
        </div>
      ) : (
        <p className="text-gray-500">No graph data available.</p>
      )}
    </div>
  );
}
