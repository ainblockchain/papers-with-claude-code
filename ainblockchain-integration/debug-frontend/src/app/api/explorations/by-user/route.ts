import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

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
    const explorations = await ain.knowledge.getExplorationsByUser(address);

    return NextResponse.json({ ok: true, data: explorations });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get explorations by user' },
      { status: 500 }
    );
  }
}
