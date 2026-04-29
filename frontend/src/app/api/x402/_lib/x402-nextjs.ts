// Next.js App Router adapter for x402 payment gating on Base Mainnet (CDP facilitator)

import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from '@x402/next';
import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { registerExactEvmScheme } from '@x402/evm/exact/server';
import type { RouteConfig } from '@x402/core/server';
import type { Network } from '@x402/core/types';
import { generateJwt } from '@coinbase/cdp-sdk/auth';

// ── Base Mainnet Server (CDP facilitator) ──

const CDP_API_KEY_ID = process.env.CDP_API_KEY_ID || '';
const CDP_API_KEY_SECRET = process.env.CDP_API_KEY_SECRET || '';
const CDP_X402_URL = process.env.CDP_X402_URL || 'https://api.cdp.coinbase.com/platform/v2/x402';

async function cdpAuthHeader(method: string, path: string): Promise<Record<string, string>> {
  if (!CDP_API_KEY_ID || !CDP_API_KEY_SECRET) return {};
  const jwt = await generateJwt({
    apiKeyId: CDP_API_KEY_ID,
    apiKeySecret: CDP_API_KEY_SECRET,
    requestMethod: method,
    requestHost: 'api.cdp.coinbase.com',
    requestPath: `/platform/v2/x402/${path}`,
  });
  return { Authorization: `Bearer ${jwt}` };
}

const baseFacilitator = new HTTPFacilitatorClient({
  url: CDP_X402_URL,
  createAuthHeaders: async () => ({
    verify: await cdpAuthHeader('POST', 'verify'),
    settle: await cdpAuthHeader('POST', 'settle'),
    supported: await cdpAuthHeader('GET', 'supported'),
  }),
});
const baseServer = new x402ResourceServer(baseFacilitator);
registerExactEvmScheme(baseServer);

// ── Network Configuration ──

const BASE_NETWORK: Network = 'eip155:8453';

// USDC on Base Mainnet (6 decimals)
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const basePayTo = process.env.BASE_MERCHANT_ADDRESS || '';

export function getExplorerUrl(): string {
  return 'https://basescan.org';
}

/**
 * Build a RouteConfig for Base Mainnet (CDP facilitator).
 * Uses standard USDC with 6 decimals: 0.001 USDC = 1000 (1e3)
 */
export function buildBaseRouteConfig(overrides?: {
  description?: string;
  resource?: string;
}): RouteConfig {
  return {
    accepts: {
      scheme: 'exact',
      network: BASE_NETWORK,
      payTo: basePayTo,
      price: {
        amount: process.env.BASE_X402_PRICE_AMOUNT || '1000',
        asset: BASE_USDC,
        extra: { name: 'USD Coin', version: '2' },
      },
      maxTimeoutSeconds: 300,
    },
    description: overrides?.description || 'Papers LMS Learning Service',
    resource: overrides?.resource,
    mimeType: 'application/json',
  };
}

/**
 * Create a withX402-wrapped handler for Base Mainnet.
 */
export function createWrappedHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  routeConfig: RouteConfig,
) {
  return withX402(handler, routeConfig, baseServer, undefined, undefined, true);
}
