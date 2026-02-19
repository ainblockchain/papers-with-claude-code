import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { ok: false, error: 'address query parameter is required' },
        { status: 400 }
      );
    }

    const ain = getAinClient();
    const explorationsByTopic = await ain.knowledge.getExplorationsByUser(address);
    const accessReceipts = await ain.knowledge.getAccessReceipts(address);

    const topicSummaries: Array<{
      topicPath: string;
      entryCount: number;
      maxDepth: number;
      entries: Array<any>;
    }> = [];

    if (explorationsByTopic) {
      for (const [topicKey, entries] of Object.entries(explorationsByTopic)) {
        if (!entries || typeof entries !== 'object') continue;
        const topicPath = topicKey.replace(/\|/g, '/');
        const entryList: Array<any> = [];
        let maxDepth = 0;

        for (const [entryId, entry] of Object.entries(entries as Record<string, any>)) {
          if (!entry || typeof entry !== 'object') continue;

          const nodeId = ain.knowledge.buildNodeId(address, topicPath, entryId);
          let connections: Array<{ nodeId: string; type: string }> = [];
          try {
            const edges = await ain.knowledge.getNodeEdges(nodeId);
            if (edges) {
              for (const [targetNodeId, edge] of Object.entries(edges as Record<string, any>)) {
                connections.push({ nodeId: targetNodeId, type: edge.type || 'related' });
              }
            }
          } catch {
            // edges may not exist
          }

          entryList.push({
            entryId,
            nodeId,
            title: entry.title || '',
            depth: entry.depth || 0,
            summary: entry.summary || '',
            price: entry.price || null,
            createdAt: entry.created_at || 0,
            connections,
          });
          if (entry.depth > maxDepth) maxDepth = entry.depth;
        }

        topicSummaries.push({
          topicPath,
          entryCount: entryList.length,
          maxDepth,
          entries: entryList.sort((a: any, b: any) => b.createdAt - a.createdAt),
        });
      }
    }

    const purchases: Array<any> = [];
    if (accessReceipts) {
      for (const [key, receipt] of Object.entries(accessReceipts as Record<string, any>)) {
        if (!receipt || typeof receipt !== 'object') continue;
        purchases.push({
          key,
          seller: receipt.seller || '',
          topicPath: receipt.topic_path || '',
          entryId: receipt.entry_id || '',
          amount: receipt.amount || '0',
          currency: receipt.currency || '',
          accessedAt: receipt.accessed_at || 0,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        address,
        totalTopics: topicSummaries.length,
        totalEntries: topicSummaries.reduce((sum: number, t: any) => sum + t.entryCount, 0),
        totalPurchases: purchases.length,
        topics: topicSummaries,
        purchases: purchases.sort((a: any, b: any) => b.accessedAt - a.accessedAt),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
