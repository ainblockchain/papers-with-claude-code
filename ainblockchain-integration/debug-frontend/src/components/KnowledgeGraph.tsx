'use client';

import { useState } from 'react';

interface GraphNode {
  address: string;
  topic_path: string;
  entry_id: string;
  title: string;
  depth: number;
  created_at: number;
}

interface GraphEdge {
  type: 'extends' | 'related' | 'prerequisite';
  created_at: number;
  created_by: string;
}

interface GraphData {
  nodes: Record<string, GraphNode>;
  edges: Record<string, Record<string, GraphEdge>>;
}

export default function KnowledgeGraph() {
  const [loading, setLoading] = useState(false);
  const [graph, setGraph] = useState<GraphData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  async function fetchGraph() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/knowledge/graph');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setGraph(data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const nodeCount = graph ? Object.keys(graph.nodes).length : 0;
  const edgeCount = graph
    ? Object.values(graph.edges).reduce(
        (sum, targets) => sum + Object.keys(targets).length,
        0
      ) / 2  // edges are bidirectional, stored twice
    : 0;

  function getNodeEdges(nodeId: string): Array<{ targetId: string; edge: GraphEdge; targetNode: GraphNode | null }> {
    if (!graph || !graph.edges[nodeId]) return [];
    return Object.entries(graph.edges[nodeId]).map(([targetId, edge]) => ({
      targetId,
      edge,
      targetNode: graph.nodes[targetId] || null,
    }));
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Knowledge Graph</h2>
          <p className="text-gray-400 text-sm">
            View the on-chain knowledge graph: nodes (entries) and edges (connections).
          </p>
        </div>
        <button
          onClick={fetchGraph}
          disabled={loading}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:text-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          {loading && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {graph && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
              <p className="text-2xl font-bold text-white">{nodeCount}</p>
              <p className="text-xs text-gray-400">Nodes</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
              <p className="text-2xl font-bold text-white">{Math.round(edgeCount)}</p>
              <p className="text-xs text-gray-400">Edges</p>
            </div>
          </div>

          {/* Node list */}
          {nodeCount === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">
              No graph nodes yet. Publish an entry to create the first node.
            </p>
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-300">Nodes</h3>
              {Object.entries(graph.nodes).map(([nodeId, node]) => {
                const edges = getNodeEdges(nodeId);
                const isSelected = selectedNode === nodeId;
                return (
                  <div key={nodeId}>
                    <div
                      className={`border rounded-lg p-3 transition-colors cursor-pointer ${
                        isSelected
                          ? 'border-blue-500 bg-blue-900/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                      onClick={() => setSelectedNode(isSelected ? null : nodeId)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{node.title}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-gray-500">{node.topic_path}</span>
                            <span className="text-xs text-blue-400">depth {node.depth}</span>
                            <span className="text-xs text-gray-600 font-mono truncate">
                              {node.address.slice(0, 10)}...
                            </span>
                            {edges.length > 0 && (
                              <span className="text-xs text-green-400">
                                {edges.length} {edges.length === 1 ? 'edge' : 'edges'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Show edges when selected */}
                    {isSelected && edges.length > 0 && (
                      <div className="ml-4 mt-1 space-y-1">
                        {edges.map(({ targetId, edge, targetNode }) => (
                          <div
                            key={targetId}
                            className="bg-gray-800 border border-gray-700 rounded-lg p-2 flex items-center gap-2"
                          >
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${
                              edge.type === 'extends'
                                ? 'bg-blue-900/40 border-blue-700 text-blue-300'
                                : edge.type === 'prerequisite'
                                ? 'bg-orange-900/40 border-orange-700 text-orange-300'
                                : 'bg-gray-700 border-gray-600 text-gray-300'
                            }`}>
                              {edge.type}
                            </span>
                            <span className="text-xs text-gray-300">
                              {targetNode ? targetNode.title : targetId.slice(0, 20) + '...'}
                            </span>
                            {targetNode && (
                              <span className="text-xs text-gray-500">{targetNode.topic_path}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
