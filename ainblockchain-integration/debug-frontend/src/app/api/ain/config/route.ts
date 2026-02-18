import { NextRequest, NextResponse } from 'next/server';
import { getAinClient, getProviderUrl } from '@/lib/ain-client';

export async function GET() {
  try {
    const providerUrl = getProviderUrl();
    return NextResponse.json({ ok: true, data: { providerUrl } });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get config' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerUrl } = body;

    if (!providerUrl || typeof providerUrl !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'providerUrl is required and must be a string' },
        { status: 400 }
      );
    }

    const ain = getAinClient();
    ain.setProvider(providerUrl);

    return NextResponse.json({ ok: true, data: { providerUrl } });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to update config' },
      { status: 500 }
    );
  }
}
