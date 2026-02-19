import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { KiteWalletManager } from '@/lib/kite/wallet';
import { KiteIdentityManager } from '@/lib/kite/identity';
import { SessionKeyManager } from '@/lib/kite/session-key';
import { getChainConfig } from '@/lib/kite/contracts';
import { deriveEvmPrivateKey } from '@/lib/ain/passkey';

export async function GET(req: NextRequest) {
  try {
    const chainConfig = getChainConfig();

    // Accept passkey public key as query param for per-user wallet derivation
    const passkeyPublicKey = req.nextUrl.searchParams.get('passkeyPublicKey');
    let agentPrivateKey = process.env.KITE_AGENT_PRIVATE_KEY || '';
    if (passkeyPublicKey) {
      agentPrivateKey = deriveEvmPrivateKey(passkeyPublicKey);
    }

    const walletManager = new KiteWalletManager({ agentPrivateKey });

    if (!walletManager.getIsConfigured()) {
      return NextResponse.json({
        agentDID: process.env.NEXT_PUBLIC_AGENT_DID || 'did:kite:learner.eth/claude-tutor/v1',
        walletAddress: null,
        balance: '0',
        balanceWei: '0',
        chainId: chainConfig.chainId,
        explorerUrl: chainConfig.explorerUrl,
        standingIntent: null,
        configured: false,
        message: 'No passkey registered and KITE_AGENT_PRIVATE_KEY not set. Register a passkey to enable wallet.',
      });
    }

    const identityManager = new KiteIdentityManager();
    const sessionKeyManager = new SessionKeyManager();

    // Get wallet info
    const wallet = await walletManager.getOrCreateWallet();

    // Get identity
    const identity = identityManager.buildIdentityFromEnv();

    // Get daily usage
    const dailyUsed = await sessionKeyManager.getDailyUsage(wallet.address);

    // Build Standing Intent info from defaults
    const siDefaults = sessionKeyManager.buildDefaultStandingIntent(identity.did);

    // Format balance
    const balanceWei = wallet.balance;
    const balance = ethers.formatEther(balanceWei);

    // Format daily values
    const dailyCap = siDefaults.dailyCap;
    const dailyCapFormatted = ethers.formatEther(dailyCap);
    const dailyUsedFormatted = ethers.formatEther(dailyUsed);
    const maxTxFormatted = ethers.formatEther(siDefaults.maxTransactionAmount);

    return NextResponse.json({
      agentDID: identity.did,
      walletAddress: wallet.address,
      balance,
      balanceWei,
      chainId: wallet.chainId,
      explorerUrl: `${chainConfig.explorerUrl}address/${wallet.address}`,
      standingIntent: {
        maxTransaction: `${maxTxFormatted} KITE`,
        dailyCap: `${dailyCapFormatted} KITE`,
        dailyUsed: `${dailyUsedFormatted} KITE`,
        expiresAt: new Date(siDefaults.expiresAt * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('[x402/status] Error:', error);
    return NextResponse.json(
      {
        error: 'chain_error',
        message: error instanceof Error ? error.message : 'Failed to fetch agent status',
      },
      { status: 500 }
    );
  }
}
