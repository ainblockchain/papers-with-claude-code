import { NextRequest, NextResponse } from 'next/server';

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_NETWORK = 'eip155:8453';

export async function GET(req: NextRequest) {
  try {
    const agentDID = process.env.NEXT_PUBLIC_AGENT_DID || '';
    const merchantWallet = process.env.BASE_MERCHANT_ADDRESS || '';

    // Try to get AIN account info for balance display
    let ainAddress: string | null = null;
    let ainBalance = 0;
    try {
      const { ainAdapter } = await import('@/lib/adapters/ain-blockchain');
      const accountInfo = await ainAdapter.getAccountInfo();
      ainAddress = accountInfo.address;
      ainBalance = accountInfo.balance;
    } catch {
      // AIN not configured — continue without it
    }

    return NextResponse.json({
      agentDID,
      walletAddress: merchantWallet || ainAddress,
      ainAddress,
      ainBalance,
      chainId: 8453,
      network: BASE_NETWORK,
      explorerUrl: merchantWallet
        ? `https://basescan.org/address/${merchantWallet}`
        : 'https://basescan.org',
      // Multi-chain x402 info for external agents
      x402: {
        version: '2',
        supportedChains: {
          base: {
            network: BASE_NETWORK,
            asset: BASE_USDC,
            assetName: 'USDC',
            facilitator: process.env.CDP_X402_URL || 'https://api.cdp.coinbase.com/platform/v2/x402',
            explorer: 'https://basescan.org',
          },
        },
        discoveryUrl: `${process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin}/api/x402/discovery`,
      },
      configured: !!merchantWallet,
    });
  } catch (error) {
    console.error('[x402/status] Error:', error);
    return NextResponse.json(
      {
        error: 'status_error',
        message:
          error instanceof Error ? error.message : 'Failed to fetch agent status',
      },
      { status: 500 }
    );
  }
}
