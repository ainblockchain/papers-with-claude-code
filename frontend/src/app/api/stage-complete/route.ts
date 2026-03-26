import { NextRequest, NextResponse } from 'next/server';
import { getAinClient, getUserAinClient } from '@/lib/ain/client';

/**
 * Record stage_complete on AIN blockchain.
 * Uses AIN SDK directly instead of going through trackEvent → ainAdapter
 * (which would make a server→server self-referencing fetch that can fail).
 */
export async function POST(req: NextRequest) {
  let body: {
    paperId?: string;
    stageNum?: number;
    passkeyPublicKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { paperId, stageNum, passkeyPublicKey } = body;

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
    const ain = passkeyPublicKey ? getUserAinClient(passkeyPublicKey) : getAinClient();
    const tagsStr = `stage_complete,${paperId}`;
    await ain.knowledge.explore({
      topicPath: `courses/${paperId}`,
      title: `stage_complete: stage ${stageNum}`,
      content: JSON.stringify({
        eventType: 'stage_complete',
        paperId,
        stageIndex: stageNum,
        timestamp: Date.now(),
      }),
      summary: `stage_complete in course ${paperId}, stage ${stageNum}`,
      depth: 2,
      tags: tagsStr,
    });

    return NextResponse.json({
      success: true,
      stageCompletion: {
        paperId,
        stageNum,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[stage-complete] AIN tracking failed:', error);
    return NextResponse.json(
      { error: 'tracking_failed', message: error.message ?? 'Failed to record stage completion' },
      { status: 500 },
    );
  }
}
