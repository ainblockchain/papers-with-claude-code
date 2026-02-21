// Next.js App Router adapter for x402 payment gating
// Uses official @x402/next library with Coinbase x402 protocol

import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from '@x402/next';
import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { registerExactEvmScheme } from '@x402/evm/exact/server';
import type { RouteConfig } from '@x402/core/server';
import type { Network } from '@x402/core/types';
import { MERCHANT_WALLET_ADDRESS } from '@/lib/kite/contracts';

// ── Facilitator & Server Setup ──

const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
});

const resourceServer = new x402ResourceServer(facilitatorClient);
registerExactEvmScheme(resourceServer);

// ── Network Configuration ──
// Kite testnet uses EIP-155 chain ID 2368
const KITE_NETWORK: Network = `eip155:${process.env.NEXT_PUBLIC_KITE_CHAIN_ID || '2368'}`;

// ── Exported helpers ──

/**
 * Get the configured x402ResourceServer singleton.
 */
export function getResourceServer(): x402ResourceServer {
  return resourceServer;
}

/**
 * Build a RouteConfig for a payment-gated endpoint.
 *
 * @param overrides - partial overrides for the route config
 */
export function buildRouteConfig(overrides?: {
  price?: string;
  description?: string;
  resource?: string;
}): RouteConfig {
  return {
    accepts: {
      scheme: 'exact',
      network: KITE_NETWORK,
      payTo: MERCHANT_WALLET_ADDRESS || process.env.KITE_MERCHANT_WALLET || '',
      price: overrides?.price || process.env.KITE_X402_PRICE || '$0.001',
      maxTimeoutSeconds: 300,
    },
    description: overrides?.description || 'Papers LMS Learning Service',
    resource: overrides?.resource,
    mimeType: 'application/json',
  };
}

/**
 * Wraps a Next.js POST handler with x402 payment protection.
 *
 * The @x402/next `withX402` wrapper:
 *  1. Returns 402 with payment requirements when no valid payment header is present
 *  2. Verifies & settles payment via the facilitator when X-PAYMENT header is present
 *  3. Calls the handler only after payment is confirmed
 */
export function withX402Payment(
  routeConfig: RouteConfig,
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return withX402(handler, routeConfig, resourceServer);
}
