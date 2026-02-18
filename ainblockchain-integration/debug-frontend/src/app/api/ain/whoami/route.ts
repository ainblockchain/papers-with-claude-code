import { NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

export async function GET() {
  try {
    const ain = getAinClient();
    const address = ain.signer.getAddress();
    const balance = await ain.wallet.getBalance(address);

    return NextResponse.json({
      ok: true,
      data: { address, balance },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to get account info' },
      { status: 500 }
    );
  }
}
