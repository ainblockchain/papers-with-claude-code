import { NextRequest, NextResponse } from 'next/server';
import { getContent } from '@/lib/ain/content-store';
import { verifyAinTransfer } from '@/lib/ain/verify-transfer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contentId } = await params;
    const stored = getContent(contentId);

    if (!stored) {
      return NextResponse.json(
        { ok: false, error: 'Content not found' },
        { status: 404 }
      );
    }

    const paymentHeader = request.headers.get('x-payment') || request.headers.get('X-PAYMENT');

    if (!paymentHeader) {
      const paymentRequirements = {
        scheme: 'ain-transfer',
        network: 'ain:local',
        maxAmountRequired: stored.price,
        payTo: stored.payTo,
        description: `Access "${stored.title}"`,
        contentHash: stored.contentHash,
      };

      const encoded = Buffer.from(JSON.stringify([paymentRequirements])).toString('base64');

      return new NextResponse(
        JSON.stringify({ error: 'Payment required', requirements: [paymentRequirements] }),
        {
          status: 402,
          headers: {
            'Content-Type': 'application/json',
            'X-PAYMENT-REQUIRED': encoded,
          },
        }
      );
    }

    let paymentPayload: any;
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      paymentPayload = JSON.parse(decoded);
    } catch {
      try {
        paymentPayload = JSON.parse(paymentHeader);
      } catch {
        return NextResponse.json(
          { ok: false, error: 'Invalid payment header format' },
          { status: 400 }
        );
      }
    }

    const txHash = paymentPayload.txHash || paymentPayload.tx_hash || '';

    const verification = await verifyAinTransfer({
      txHash,
      payTo: stored.payTo,
      requiredAmount: Number(stored.price),
    });

    if (!verification.valid) {
      return NextResponse.json(
        { ok: false, error: `Payment verification failed: ${verification.error}` },
        { status: 402 }
      );
    }

    const paymentResponse = {
      scheme: 'ain-transfer',
      network: 'ain:local',
      txHash,
      verified: true,
    };

    const encodedResponse = Buffer.from(JSON.stringify(paymentResponse)).toString('base64');

    return new NextResponse(stored.content, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'X-PAYMENT-RESPONSE': encodedResponse,
        'x-payment-tx-hash': txHash,
        'x-payment-currency': 'AIN',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Content delivery error' },
      { status: 500 }
    );
  }
}
