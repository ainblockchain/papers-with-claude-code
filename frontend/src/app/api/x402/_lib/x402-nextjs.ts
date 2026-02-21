// Next.js App Router adapter for x402 payment gating
// Supports Kite (Pieverse facilitator) and Base Mainnet (CDP facilitator)

import { NextRequest, NextResponse } from 'next/server';
import { withX402 } from '@x402/next';
import { x402ResourceServer, HTTPFacilitatorClient } from '@x402/core/server';
import { registerExactEvmScheme } from '@x402/evm/exact/server';
import type { RouteConfig } from '@x402/core/server';
import type { Network } from '@x402/core/types';
import { generateJwt } from '@coinbase/cdp-sdk/auth';
import { MERCHANT_WALLET_ADDRESS, KITE_TEST_USDT_ADDRESS } from '@/lib/kite/contracts';

// ── Kite Server (Pieverse facilitator) ──

const kiteFacilitator = new HTTPFacilitatorClient({
  url: process.env.X402_FACILITATOR_URL || 'https://facilitator.pieverse.io',
});
const kiteServer = new x402ResourceServer(kiteFacilitator);
registerExactEvmScheme(kiteServer);

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

const KITE_NETWORK: Network = `eip155:${process.env.NEXT_PUBLIC_KITE_CHAIN_ID || '2368'}`;
const BASE_NETWORK: Network = 'eip155:8453';

// USDC on Base Mainnet (6 decimals)
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// ── Exported helpers ──

const payTo = MERCHANT_WALLET_ADDRESS || process.env.KITE_MERCHANT_WALLET || '';

export function getServerForChain(chain: string): x402ResourceServer {
  return chain === 'base' ? baseServer : kiteServer;
}

export function getExplorerUrl(chain: string): string {
  return chain === 'base'
    ? 'https://basescan.org'
    : `https://testnet.kitescan.ai`;
}

/**
 * Build a RouteConfig for Kite chain (Pieverse).
 */
export function buildKiteRouteConfig(overrides?: {
  description?: string;
  resource?: string;
}): RouteConfig {
  const defaultPrice: { amount: string; asset: string; extra: Record<string, unknown> } = {
    amount: process.env.KITE_X402_PRICE_AMOUNT || '1000000000000000',
    asset: KITE_TEST_USDT_ADDRESS,
    extra: { name: 'Test USD', version: '1' },
  };

  return {
    accepts: {
      scheme: 'exact',
      network: KITE_NETWORK,
      payTo,
      price: defaultPrice,
      maxTimeoutSeconds: 300,
    },
    description: overrides?.description || 'Papers LMS Learning Service',
    resource: overrides?.resource,
    mimeType: 'application/json',
  };
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
      payTo,
      price: {
        amount: process.env.BASE_X402_PRICE_AMOUNT || '1000',
        asset: BASE_USDC,
        extra: { name: 'USDC', version: '2' },
      },
      maxTimeoutSeconds: 300,
    },
    description: overrides?.description || 'Papers LMS Learning Service',
    resource: overrides?.resource,
    mimeType: 'application/json',
  };
}

// Backward-compatible alias
export function buildRouteConfig(overrides?: {
  price?: { amount: string; asset: string } | string;
  description?: string;
  resource?: string;
}): RouteConfig {
  return buildKiteRouteConfig(overrides);
}

/**
 * Create a withX402-wrapped handler for a specific chain.
 */
export function createWrappedHandler(
  handler: (req: NextRequest) => Promise<NextResponse>,
  routeConfig: RouteConfig,
  chain: 'kite' | 'base',
) {
  const server = getServerForChain(chain);
  return withX402(handler, routeConfig, server, undefined, undefined, true);
}

/**
 * Wraps a Next.js POST handler with x402 payment protection (Kite only, backward-compatible).
 */
export function withX402Payment(
  routeConfig: RouteConfig,
  handler: (req: NextRequest) => Promise<NextResponse>,
) {
  return withX402(handler, routeConfig, kiteServer, undefined, undefined, true);
}
