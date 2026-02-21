import { NextRequest, NextResponse } from 'next/server';
import {
  buildKiteRouteConfig,
  buildBaseRouteConfig,
  createWrappedHandler,
  getExplorerUrl,
} from '../_lib/x402-nextjs';

async function handleEnroll(req: NextRequest): Promise<NextResponse> {
  let body: { paperId?: string; passkeyPublicKey?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { paperId } = body;
  if (!paperId || typeof paperId !== 'string') {
    return NextResponse.json(
      { error: 'invalid_params', message: 'paperId is required' },
      { status: 400 }
    );
  }

  const chain = req.nextUrl.searchParams.get('chain') || 'kite';

  // Payment has already been verified and settled by withX402 middleware.
  // Record enrollment on AIN blockchain via event tracker.
  try {
    const { trackEvent } = await import('@/lib/ain/event-tracker');
    await trackEvent({
      type: 'course_enter',
      paperId,
      timestamp: Date.now(),
      x: 0,
      y: 0,
      direction: 'down',
      scene: 'village',
    });
  } catch (err) {
    console.error('[x402/enroll] AIN tracking failed (non-fatal):', err);
  }

  return NextResponse.json({
    success: true,
    enrollment: {
      paperId,
      enrolledAt: new Date().toISOString(),
    },
    explorerUrl: getExplorerUrl(chain),
    message: 'Enrollment confirmed. Payment settled via x402 protocol.',
  });
}

// Pre-create wrapped handlers for each chain at module level
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

const kiteHandler = createWrappedHandler(
  handleEnroll,
  buildKiteRouteConfig({
    description: 'Enroll in a Papers LMS learning course',
    resource: `${baseUrl}/api/x402/enroll`,
  }),
  'kite',
);

const baseHandler = createWrappedHandler(
  handleEnroll,
  buildBaseRouteConfig({
    description: 'Enroll in a Papers LMS learning course',
    resource: `${baseUrl}/api/x402/enroll`,
  }),
  'base',
);

export async function POST(req: NextRequest) {
  const chain = req.nextUrl.searchParams.get('chain') || 'kite';
  if (chain === 'base') return baseHandler(req);
  return kiteHandler(req);
}
