import { NextRequest, NextResponse } from 'next/server';
import { MERCHANT_WALLET_ADDRESS, KITE_TEST_USDT_ADDRESS } from '@/lib/kite/contracts';

export async function GET(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  const payTo = MERCHANT_WALLET_ADDRESS || process.env.KITE_MERCHANT_WALLET || '';
  const kiteNetwork = `eip155:${process.env.NEXT_PUBLIC_KITE_CHAIN_ID || '2368'}`;

  const kitePrice = process.env.KITE_X402_PRICE_AMOUNT || '1000000000000000';
  const basePrice = process.env.BASE_X402_PRICE_AMOUNT || '1000';
  const BASE_SEPOLIA_USDC = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

  return NextResponse.json({
    x402: {
      version: '2',
      provider: 'Papers LMS',
      description:
        'AI-powered learning platform. Enroll in courses and unlock stages with x402 payments.',
    },
    payTo,
    chains: {
      kite: {
        network: kiteNetwork,
        name: 'Kite AI Testnet',
        asset: KITE_TEST_USDT_ADDRESS,
        assetName: 'Test USDT',
        assetDecimals: 18,
        facilitator:
          process.env.X402_FACILITATOR_URL || 'https://facilitator.pieverse.io',
        explorer: 'https://testnet.kitescan.ai',
        faucet: 'https://faucet.gokite.ai',
      },
      base: {
        network: 'eip155:84532',
        name: 'Base Sepolia',
        asset: BASE_SEPOLIA_USDC,
        assetName: 'USDC',
        assetDecimals: 6,
        facilitator: 'https://x402.org/facilitator',
        explorer: 'https://sepolia.basescan.org',
        faucet: 'https://faucet.circle.com/',
        note: 'Recommended for external agents. Standard USDC.',
      },
    },
    endpoints: {
      enroll: {
        url: `${baseUrl}/api/x402/enroll`,
        method: 'POST',
        description: 'Enroll in a learning course. Returns 402 with payment requirements.',
        params: {
          body: { paperId: 'string (required)' },
          query: { chain: '"kite" | "base" (default: "kite")' },
        },
        payment: {
          kite: { scheme: 'exact', network: kiteNetwork, asset: KITE_TEST_USDT_ADDRESS, amount: kitePrice },
          base: { scheme: 'exact', network: 'eip155:84532', asset: BASE_SEPOLIA_USDC, amount: basePrice },
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
          query: { chain: '"kite" | "base" (default: "kite")' },
        },
        payment: {
          kite: { scheme: 'exact', network: kiteNetwork, asset: KITE_TEST_USDT_ADDRESS, amount: kitePrice },
          base: { scheme: 'exact', network: 'eip155:84532', asset: BASE_SEPOLIA_USDC, amount: basePrice },
        },
      },
    },
    freeEndpoints: {
      discovery: { url: `${baseUrl}/api/x402/discovery`, method: 'GET' },
      status: { url: `${baseUrl}/api/x402/status`, method: 'GET' },
      receipt: {
        url: `${baseUrl}/api/x402/receipt/{txHash}`,
        method: 'GET',
        params: { query: { chain: '"kite" | "base" (default: "kite")' } },
      },
      attestations: { url: `${baseUrl}/api/x402/attestations`, method: 'GET' },
      history: { url: `${baseUrl}/api/x402/history`, method: 'GET' },
    },
    usage: [
      '1. GET /api/x402/discovery — read this endpoint for pricing and params',
      '2. POST /api/x402/enroll?chain=base with { "paperId": "..." } — receive 402 + PAYMENT-REQUIRED header',
      '3. Sign payment with @x402/fetch or any x402 v2 client — auto-retries with PAYMENT-SIGNATURE header',
      '4. Receive 200 with enrollment confirmation + PAYMENT-RESPONSE header',
      '5. GET /api/x402/receipt/{txHash}?chain=base — verify the on-chain transaction',
    ],
  });
}
