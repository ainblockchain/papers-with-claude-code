import { NextRequest, NextResponse } from 'next/server';

/**
 * Record stage_complete on AIN blockchain (no payment required).
 * Used for the last stage of a course where x402 payment is not needed.
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
    const { trackEvent } = await import('@/lib/ain/event-tracker');
    await trackEvent({
      type: 'stage_complete',
      paperId,
      stageIndex: stageNum,
      timestamp: Date.now(),
      x: 0,
      y: 0,
      direction: 'down',
      scene: 'course',
    }, passkeyPublicKey);

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
