import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain-client';

/**
 * POST /api/knowledge/access-entry
 * Server-side orchestrator for x402 content access.
 * Accepts { ownerAddress, topicPath, entryId, buyerPrivateKey? }
 * Sets up AIN x402 client, calls knowledge.access(), returns content + receipt.
 * If buyerPrivateKey is provided, uses that account for payment (buyer != publisher).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ownerAddress, topicPath, entryId, buyerPrivateKey } = body;

    if (!ownerAddress || !topicPath || !entryId) {
      return NextResponse.json(
        { ok: false, error: 'ownerAddress, topicPath, and entryId are required' },
        { status: 400 }
      );
    }

    const ain = getAinClient();

    // If a buyer private key is provided, switch to that account for payment
    let previousDefault: string | undefined;
    if (buyerPrivateKey) {
      previousDefault = ain.wallet.defaultAccount?.address;
      ain.wallet.addAndSetDefaultAccount(buyerPrivateKey);
    }

    try {
      // Setup AIN x402 client for payment
      ain.knowledge.setupAinX402Client();

      const result = await ain.knowledge.access(ownerAddress, topicPath, entryId);

      return NextResponse.json({
        ok: true,
        data: {
          content: result.content,
          paid: result.paid,
          receipt: result.receipt || null,
        },
      });
    } finally {
      // Restore previous default account if we switched
      if (buyerPrivateKey && previousDefault) {
        ain.wallet.setDefaultAccount(previousDefault);
      }
    }
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to access entry' },
      { status: 500 }
    );
  }
}
