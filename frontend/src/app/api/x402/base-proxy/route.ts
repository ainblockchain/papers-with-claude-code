// Server-side proxy for Base Sepolia x402 payments.
// Uses @x402/fetch with a server wallet to automatically handle 402 responses.

import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { wrapFetchWithPayment, x402Client } from '@x402/fetch';
import { toClientEvmSigner } from '@x402/evm';
import { ExactEvmScheme } from '@x402/evm/exact/client';

const BASE_AGENT_KEY = process.env.BASE_AGENT_PRIVATE_KEY;

function createPaymentFetch() {
  if (!BASE_AGENT_KEY) return null;

  const account = privateKeyToAccount(BASE_AGENT_KEY as `0x${string}`);
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(),
  });
  const signer = toClientEvmSigner(account, publicClient);

  const client = new x402Client();
  const scheme = new ExactEvmScheme(signer);
  client.register('eip155:84532' as `${string}:${string}`, scheme);

  return wrapFetchWithPayment(fetch, client);
}

// Module-level singleton
const x402Fetch = createPaymentFetch();

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  if (!x402Fetch) {
    return NextResponse.json(
      {
        error: 'base_not_configured',
        message: 'Base Sepolia payment wallet not configured. Set BASE_AGENT_PRIVATE_KEY.',
      },
      { status: 503 },
    );
  }

  let body: {
    action: 'enroll' | 'unlock-stage';
    paperId?: string;
    stageId?: string;
    stageNum?: number;
    score?: number;
    passkeyPublicKey?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  const { action, ...params } = body;
  if (!action || !['enroll', 'unlock-stage'].includes(action)) {
    return NextResponse.json(
      { error: 'invalid_params', message: 'action must be "enroll" or "unlock-stage"' },
      { status: 400 },
    );
  }

  const targetUrl = `${baseUrl}/api/x402/${action}?chain=base`;

  try {
    const res = await x402Fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json().catch(() => null);

    if (res.status === 402) {
      console.error('[x402/base-proxy] Auto-payment failed — wallet may lack USDC on Base Sepolia');
      return NextResponse.json(
        {
          error: 'insufficient_funds',
          message:
            'Base Sepolia agent wallet has insufficient USDC. Fund the wallet or use Kite Chain.',
        },
        { status: 402 },
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        data || { error: 'proxy_error', message: `Upstream returned ${res.status}` },
        { status: res.status },
      );
    }

    // Extract txHash from PAYMENT-RESPONSE header (base64-encoded JSON from withX402)
    let txHash: string | undefined;
    const paymentResponseHeader =
      res.headers.get('PAYMENT-RESPONSE') || res.headers.get('X-PAYMENT-RESPONSE');
    if (paymentResponseHeader) {
      try {
        const decoded = JSON.parse(
          Buffer.from(paymentResponseHeader, 'base64').toString('utf-8'),
        );
        txHash = decoded.transaction || decoded.txHash;
      } catch {
        console.warn('[x402/base-proxy] Failed to decode PAYMENT-RESPONSE header');
      }
    }

    const explorerUrl = txHash
      ? `https://sepolia.basescan.org/tx/${txHash}`
      : 'https://sepolia.basescan.org';

    return NextResponse.json({
      ...data,
      txHash,
      explorerUrl,
    });
  } catch (err) {
    console.error('[x402/base-proxy] Payment proxy error:', err);
    return NextResponse.json(
      {
        error: 'proxy_error',
        message: err instanceof Error ? err.message : 'Payment proxy failed',
      },
      { status: 502 },
    );
  }
}
