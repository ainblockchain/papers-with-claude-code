import { NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

export async function POST() {
  try {
    const ain = getAinClient();
    const result = await ain.knowledge.setupApp();

    return NextResponse.json({ ok: true, data: result });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to setup app' },
      { status: 500 }
    );
  }
}
