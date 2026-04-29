import { NextRequest, NextResponse } from 'next/server';

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const payTo = process.env.BASE_MERCHANT_ADDRESS || '';
  const basePrice = process.env.BASE_X402_PRICE_AMOUNT || '1000';

  return NextResponse.json({
    x402: {
      version: '2',
      provider: 'Papers LMS',
      description:
        'AI-powered learning platform. Enroll in courses and unlock stages with x402 payments.',
    },
    payTo,
    chains: {
      base: {
        network: 'eip155:8453',
        name: 'Base',
        asset: BASE_USDC,
        assetName: 'USDC',
        assetDecimals: 6,
        facilitator: process.env.CDP_X402_URL || 'https://api.cdp.coinbase.com/platform/v2/x402',
        explorer: 'https://basescan.org',
        note: 'Standard USDC on Base Mainnet.',
      },
    },
    endpoints: {
      enroll: {
        url: `${baseUrl}/api/x402/enroll`,
        method: 'POST',
        description: 'Enroll in a learning course. Returns 402 with payment requirements.',
        params: {
          body: { paperId: 'string (required)' },
        },
        payment: {
          base: { scheme: 'exact', network: 'eip155:8453', asset: BASE_USDC, amount: basePrice },
        },
      },
      'unlock-stage': {
        url: `${baseUrl}/api/x402/unlock-stage`,
        method: 'POST',
        description: 'Unlock a learning stage after quiz completion. Returns 402 with payment requirements.',
        params: {
          body: {
            paperId: 'string (required)',
            stageNum: 'number (required, >= 0)',
            score: 'number (required, 0-100)',
          },
        },
        payment: {
          base: { scheme: 'exact', network: 'eip155:8453', asset: BASE_USDC, amount: basePrice },
        },
      },
    },
    freeEndpoints: {
      discovery: { url: `${baseUrl}/api/x402/discovery`, method: 'GET' },
      status: { url: `${baseUrl}/api/x402/status`, method: 'GET' },
      receipt: {
        url: `${baseUrl}/api/x402/receipt/{txHash}`,
        method: 'GET',
      },
      attestations: { url: `${baseUrl}/api/x402/attestations`, method: 'GET' },
      history: { url: `${baseUrl}/api/x402/history`, method: 'GET' },
    },
    usage: [
      '1. GET /api/x402/discovery — read this endpoint for pricing and params',
      '2. POST /api/x402/enroll with { "paperId": "..." } — receive 402 + PAYMENT-REQUIRED header',
      '3. Sign payment with @x402/fetch or any x402 v2 client — auto-retries with PAYMENT-SIGNATURE header',
      '4. Receive 200 with enrollment confirmation + PAYMENT-RESPONSE header',
      '5. GET /api/x402/receipt/{txHash} — verify the on-chain transaction',
    ],
  });
}
