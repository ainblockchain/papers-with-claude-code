import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

/**
 * GET /api/knowledge/graph?nodeId=...
 * Returns the full knowledge graph, or edges for a specific node.
 * - No params: returns all nodes and edges
 * - nodeId param: returns that node + its edges
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');

    const ain = getAinClient();

    if (nodeId) {
      const [node, edges] = await Promise.all([
        ain.knowledge.getGraphNode(nodeId),
        ain.knowledge.getNodeEdges(nodeId),
      ]);

      return NextResponse.json({
        ok: true,
        data: { node, edges: edges || {} },
      });
    }

    // Full graph
    const graph = await ain.knowledge.getGraph();

    return NextResponse.json({
      ok: true,
      data: graph,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to fetch graph' },
      { status: 500 }
    );
  }
}
