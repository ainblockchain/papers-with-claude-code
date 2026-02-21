import { NextRequest, NextResponse } from 'next/server';
import { sendAttributedTransaction, extractPaperCodes } from '@/lib/erc8021';
import { AGENT_ADDRESS } from '@/lib/base-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const to = body.to || AGENT_ADDRESS; // default: self-send
    const value = body.value || '0';

    // If tags provided, auto-extract paper codes; otherwise use explicit codes or default
    const codes = body.tags
      ? extractPaperCodes(body.tags)
      : body.codes; // sendAttributedTransaction defaults to BUILDER_CODE if undefined

    const result = await sendAttributedTransaction({ to, value, codes });

    return NextResponse.json({
      hash: result.hash,
      codes: codes || undefined,
      basescanUrl: `https://basescan.org/tx/${result.hash}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Transaction failed' },
      { status: 500 },
    );
  }
}
