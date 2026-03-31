import { NextRequest, NextResponse } from 'next/server';
import { getUserAinClient, getAinClient } from '@/lib/ain/client';
import { hasExploration, writeExploration } from '@/lib/ain/record-exploration';

/**
 * Record stage_enter on AIN blockchain.
 * Direct server-side write — avoids client-side fetch abort during navigation.
 */
export async function POST(req: NextRequest) {
  let body: {
    paperId?: string;
    stageNum?: number;
    stageTitle?: string;
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

  const { paperId, stageNum, stageTitle, passkeyPublicKey } = body;

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
    if (await hasExploration(passkeyPublicKey, paperId, 'stage_enter', 1, stageNum)) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const ain = passkeyPublicKey ? getUserAinClient(passkeyPublicKey) : getAinClient();
    const tagsStr = `stage_enter,${paperId}`;
    await writeExploration(ain, {
      topicPath: `courses/${paperId}`,
      title: stageTitle ? `stage_enter: ${stageTitle}` : `stage_enter: stage ${stageNum}`,
      content: JSON.stringify({
        eventType: 'stage_enter',
        paperId,
        stageIndex: stageNum,
        timestamp: Date.now(),
      }),
      summary: `stage_enter in course ${paperId}, stage ${stageNum}`,
      depth: 1,
      tags: tagsStr,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[stage-enter] AIN tracking failed:', error);
    return NextResponse.json(
      { error: 'tracking_failed', message: error.message ?? 'Failed to record stage enter' },
      { status: 500 },
    );
  }
}
