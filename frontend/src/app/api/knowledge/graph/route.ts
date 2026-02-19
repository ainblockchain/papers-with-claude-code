import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

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

    const graph = await ain.knowledge.getGraph();
    return NextResponse.json({ ok: true, data: graph });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to fetch graph' },
      { status: 500 }
    );
  }
}
