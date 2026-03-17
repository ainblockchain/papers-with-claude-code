import { NextRequest, NextResponse } from 'next/server';
import {
  buildKiteRouteConfig,
  buildBaseRouteConfig,
  createWrappedHandler,
  getExplorerUrl,
} from '../_lib/x402-nextjs';
import { getAinClient } from '@/lib/ain/client';

async function handleEnroll(req: NextRequest): Promise<NextResponse> {
  let body: { paperId?: string; passkeyPublicKey?: string; buyerAddress?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { paperId, buyerAddress } = body;
  if (!paperId || typeof paperId !== 'string') {
    return NextResponse.json(
      { error: 'invalid_params', message: 'paperId is required' },
      { status: 400 }
    );
  }

  const chain = req.nextUrl.searchParams.get('chain') || 'kite';

  // Payment has already been verified and settled by withX402 middleware.
  // Record enrollment on AIN blockchain directly via SDK (not HTTP adapter).
  try {
    const ain = getAinClient();
    const tags = ['course_enter', paperId];
    if (buyerAddress) tags.push(`buyer:${buyerAddress}`);

    await ain.knowledge.explore({
      topicPath: `courses/${paperId}`,
      title: `course_enter in ${paperId}`,
      content: JSON.stringify({
        eventType: 'course_enter',
        paperId,
        buyerAddress: buyerAddress || null,
        timestamp: Date.now(),
      }),
      summary: `Enrolled in course ${paperId}`,
      depth: 1,
      tags,
    });
  } catch (err) {
    console.error('[x402/enroll] AIN exploration write failed (non-fatal):', err);
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
