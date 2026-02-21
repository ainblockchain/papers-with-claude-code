import { NextRequest, NextResponse } from 'next/server';
import { getChainConfig } from '@/lib/kite/contracts';
import { buildRouteConfig, withX402Payment } from '../_lib/x402-nextjs';

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

  const chainConfig = getChainConfig();

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
    explorerUrl: `${chainConfig.explorerUrl}`,
    message: 'Enrollment confirmed. Payment settled via x402 protocol.',
  });
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const routeConfig = buildRouteConfig({
  description: 'Enroll in a Papers LMS learning course',
  resource: `${baseUrl}/api/x402/enroll`,
});

export const POST = withX402Payment(routeConfig, handleEnroll);
