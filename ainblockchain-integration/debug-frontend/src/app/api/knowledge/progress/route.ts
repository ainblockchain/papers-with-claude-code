import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

/**
 * GET /api/knowledge/progress?address=0x...
 * Returns a learner's progress: explorations across all topics,
 * access receipts (purchased content), and per-topic stats.
 */
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

    // Fetch all explorations by this user (across all topics)
    const explorationsByTopic = await ain.knowledge.getExplorationsByUser(address);

    // Fetch access receipts (what they've purchased)
    const accessReceipts = await ain.knowledge.getAccessReceipts(address);

    // Build per-topic summary
    const topicSummaries: Array<{
      topicPath: string;
      entryCount: number;
      maxDepth: number;
      entries: Array<{
        entryId: string;
        title: string;
        depth: number;
        summary: string;
        price: string | null;
        createdAt: number;
      }>;
    }> = [];

    if (explorationsByTopic) {
      for (const [topicKey, entries] of Object.entries(explorationsByTopic)) {
        if (!entries || typeof entries !== 'object') continue;
        const topicPath = topicKey.replace(/\|/g, '/');
        const entryList: Array<any> = [];
        let maxDepth = 0;

        for (const [entryId, entry] of Object.entries(entries as Record<string, any>)) {
          if (!entry || typeof entry !== 'object') continue;

          // Fetch graph edges for this entry
          const nodeId = ain.knowledge.buildNodeId(address, topicPath, entryId);
          const edges = await ain.knowledge.getNodeEdges(nodeId);
          const connections: Array<{ nodeId: string; type: string }> = [];
          if (edges) {
            for (const [targetNodeId, edge] of Object.entries(edges as Record<string, any>)) {
              connections.push({ nodeId: targetNodeId, type: edge.type || 'related' });
            }
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
          entries: entryList.sort((a, b) => b.createdAt - a.createdAt),
        });
      }
    }

    // Format access receipts
    const purchases: Array<{
      key: string;
      seller: string;
      topicPath: string;
      entryId: string;
      amount: string;
      currency: string;
      accessedAt: number;
    }> = [];

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
        totalEntries: topicSummaries.reduce((sum, t) => sum + t.entryCount, 0),
        totalPurchases: purchases.length,
        topics: topicSummaries,
        purchases: purchases.sort((a, b) => b.accessedAt - a.accessedAt),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to fetch progress' },
      { status: 500 }
    );
  }
}
