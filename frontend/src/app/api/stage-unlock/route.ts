import { NextRequest, NextResponse } from 'next/server';
import { getUserAinClient, getAinClient } from '@/lib/ain/client';
import { hasExploration, writeExploration } from '@/lib/ain/record-exploration';

/**
 * Record stage_unlock on AIN blockchain.
 * Called when a user pays (x402) or skips to unlock the next stage.
 */
export async function POST(req: NextRequest) {
  let body: {
    paperId?: string;
    stageNum?: number;
    passkeyPublicKey?: string;
    paymentMethod?: string;
    txHash?: string;
    amount?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { paperId, stageNum, passkeyPublicKey, paymentMethod, txHash, amount } = body;

  if (!paperId || typeof paperId !== 'string') {
    return NextResponse.json(
      { error: 'invalid_params', message: 'paperId is required' },
      { status: 400 },
    );
  }
  if (stageNum === undefined || typeof stageNum !== 'number' || stageNum < 0) {
    return NextResponse.json(
      { error: 'invalid_params', message: 'stageNum must be a non-negative number' },
      { status: 400 },
    );
  }

  try {
    if (await hasExploration(passkeyPublicKey, paperId, 'stage_unlock', 1, stageNum)) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const ain = passkeyPublicKey ? getUserAinClient(passkeyPublicKey) : getAinClient();
    const tagsStr = `stage_unlock,${paperId}`;
    await writeExploration(ain, {
      topicPath: `courses/${paperId}`,
      title: `stage_unlock: stage ${stageNum}`,
      content: JSON.stringify({
        eventType: 'stage_unlock',
        paperId,
        stageIndex: stageNum,
        paymentMethod: paymentMethod ?? 'skip',
        txHash: txHash ?? null,
        amount: amount ?? null,
        timestamp: Date.now(),
      }),
      summary: `stage_unlock in course ${paperId}, stage ${stageNum}`,
      depth: 1,
      tags: tagsStr,
    });

    return NextResponse.json({
      success: true,
      stageUnlock: {
        paperId,
        stageNum,
        paymentMethod: paymentMethod ?? 'skip',
        unlockedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[stage-unlock] AIN tracking failed:', error);
    return NextResponse.json(
      { error: 'tracking_failed', message: error.message ?? 'Failed to record stage unlock' },
      { status: 500 },
    );
  }
}
