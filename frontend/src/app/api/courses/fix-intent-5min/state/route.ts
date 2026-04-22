import { NextRequest, NextResponse } from 'next/server';
import { getUserAinClient, getAinClient } from '@/lib/ain/client';

/**
 * Course state JSON blob for "fix-intent-5min" interactive course.
 * Stored at /apps/knowledge/explorations/{address}/{topicKey}/courseState
 * — single fixed-key blob, overwritten on each save.
 */

function getStatePath(address: string, paperId: string) {
  const topicKey = `courses/${paperId}`.replace(/\//g, '|');
  return `/apps/knowledge/explorations/${address}/${topicKey}/courseState`;
}

function resolveClient(passkeyPublicKey?: string | null) {
  const ain = passkeyPublicKey ? getUserAinClient(passkeyPublicKey) : getAinClient();
  const address = ain.wallet.defaultAccount?.address;
  return { ain, address };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const passkeyPublicKey = searchParams.get('passkeyPublicKey');
    const paperId = searchParams.get('paperId');

    if (!paperId) {
      return NextResponse.json(
        { ok: false, error: 'paperId is required' },
        { status: 400 },
      );
    }

    const { ain, address } = resolveClient(passkeyPublicKey);
    if (!address) {
      return NextResponse.json(
        { ok: false, error: 'No wallet address' },
        { status: 500 },
      );
    }

    const state = await ain.db.ref(getStatePath(address, paperId)).getValue();
    return NextResponse.json({ ok: true, state: state ?? null });
  } catch (error: any) {
    console.error('[fix-intent-5min/state GET] failed:', error);
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Failed to load course state' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paperId, passkeyPublicKey, courseState } = body ?? {};

    if (!paperId) {
      return NextResponse.json(
        { ok: false, error: 'paperId is required' },
        { status: 400 },
      );
    }
    if (!courseState || typeof courseState !== 'object') {
      return NextResponse.json(
        { ok: false, error: 'courseState object is required' },
        { status: 400 },
      );
    }

    const { ain, address } = resolveClient(passkeyPublicKey);
    if (!address) {
      return NextResponse.json(
        { ok: false, error: 'No wallet address' },
        { status: 500 },
      );
    }

    await ain.db.ref(getStatePath(address, paperId)).setValue({
      value: { ...courseState, updatedAt: Date.now() },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('[fix-intent-5min/state POST] failed:', error);
    return NextResponse.json(
      { ok: false, error: error?.message ?? 'Failed to save course state' },
      { status: 500 },
    );
  }
}
