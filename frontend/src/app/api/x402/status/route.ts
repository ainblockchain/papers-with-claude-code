import { NextRequest, NextResponse } from 'next/server';
import { getChainConfig, KITE_TEST_USDT_ADDRESS, MERCHANT_WALLET_ADDRESS } from '@/lib/kite/contracts';

export async function GET(req: NextRequest) {
  try {
    const chainConfig = getChainConfig();
    const agentDID =
      process.env.NEXT_PUBLIC_AGENT_DID || 'did:kite:learner.eth/claude-tutor/v1';
    const merchantWallet = MERCHANT_WALLET_ADDRESS || process.env.KITE_MERCHANT_WALLET || '';

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
      // Kite chain info (backward compatible)
      chainId: chainConfig.chainId,
      network: chainConfig.network,
      explorerUrl: merchantWallet
        ? `${chainConfig.explorerUrl}address/${merchantWallet}`
        : chainConfig.explorerUrl,
      protocol: {
        scheme: 'gokite-aa',
        asset: KITE_TEST_USDT_ADDRESS,
        assetName: 'Test USDT',
        facilitator: process.env.X402_FACILITATOR_URL || 'https://facilitator.pieverse.io',
      },
      // Multi-chain x402 info for external agents
      x402: {
        version: '2',
        supportedChains: {
          kite: {
            network: `eip155:${chainConfig.chainId}`,
            asset: KITE_TEST_USDT_ADDRESS,
            assetName: 'Test USDT',
            facilitator: process.env.X402_FACILITATOR_URL || 'https://facilitator.pieverse.io',
            explorer: chainConfig.explorerUrl,
          },
          base: {
            network: 'eip155:8453',
            asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
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
