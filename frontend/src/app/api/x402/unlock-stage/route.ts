import { NextRequest, NextResponse } from 'next/server';
import {
  buildKiteRouteConfig,
  buildBaseRouteConfig,
  createWrappedHandler,
  getExplorerUrl,
} from '../_lib/x402-nextjs';

async function handleUnlockStage(req: NextRequest): Promise<NextResponse> {
  let body: {
    paperId?: string;
    stageId?: string;
    stageNum?: number;
    score?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { paperId, stageNum, score } = body;

  if (!paperId || typeof paperId !== 'string') {
    return NextResponse.json(
      { error: 'invalid_params', message: 'paperId is required' },
      { status: 400 }
    );
  }
  if (stageNum === undefined || typeof stageNum !== 'number' || stageNum < 0) {
    return NextResponse.json(
      { error: 'invalid_params', message: 'stageNum must be a non-negative number' },
      { status: 400 }
    );
  }
  if (score === undefined || typeof score !== 'number' || score < 0 || score > 100) {
    return NextResponse.json(
      { error: 'invalid_params', message: 'score must be between 0 and 100' },
      { status: 400 }
    );
  }

  const chain = req.nextUrl.searchParams.get('chain') || 'kite';

  // Payment has already been verified and settled by withX402 middleware.
  // stage_complete is recorded at quiz pass time (QuizOverlay → /api/stage-complete),
  // so this endpoint only handles payment verification.

  // Generate attestation hash for the payment
  const crypto = await import('crypto');
  const attestationHash = crypto
    .createHash('sha256')
    .update(`${paperId}:${stageNum}:${score}:${Date.now()}`)
    .digest('hex');

  return NextResponse.json({
    success: true,
    stageCompletion: {
      paperId,
      stageNum,
      score,
      attestationHash: `0x${attestationHash}`,
      completedAt: new Date().toISOString(),
    },
    explorerUrl: getExplorerUrl(chain),
    message: 'Stage unlocked. Payment settled via x402 protocol.',
  });
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const kiteHandler = createWrappedHandler(
  handleUnlockStage,
  buildKiteRouteConfig({
    description: 'Unlock a learning stage after quiz completion',
    resource: `${baseUrl}/api/x402/unlock-stage`,
  }),
  'kite',
);

const baseHandler = createWrappedHandler(
  handleUnlockStage,
  buildBaseRouteConfig({
    description: 'Unlock a learning stage after quiz completion',
    resource: `${baseUrl}/api/x402/unlock-stage`,
  }),
  'base',
);

export async function POST(req: NextRequest) {
  const chain = req.nextUrl.searchParams.get('chain') || 'kite';
  if (chain === 'base') return baseHandler(req);
  return kiteHandler(req);
}
