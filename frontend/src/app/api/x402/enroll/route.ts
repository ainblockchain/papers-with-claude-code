import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { KiteWalletManager } from '@/lib/kite/wallet';
import { SessionKeyManager } from '@/lib/kite/session-key';
import { KiteIdentityManager } from '@/lib/kite/identity';
import {
  getChainConfig,
  LEARNING_LEDGER_ADDRESS,
  LEARNING_LEDGER_ABI,
} from '@/lib/kite/contracts';
import { deriveEvmPrivateKey } from '@/lib/ain/passkey';
import { withX402Payment, buildRouteConfig } from '../_lib/x402-nextjs';

const ENROLL_PAYMENT = ethers.parseEther('0.001');

async function handleEnroll(
  _req: NextRequest,
  bodyText: string
): Promise<NextResponse> {
  // Parse and validate request body
  let body: { paperId?: string; passkeyPublicKey?: string };
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { paperId, passkeyPublicKey } = body;
  if (!paperId || typeof paperId !== 'string') {
    return NextResponse.json(
      { error: 'invalid_params', message: 'paperId is required' },
      { status: 400 }
    );
  }

  // Derive per-user EVM private key from passkey public key
  let agentPrivateKey = process.env.KITE_AGENT_PRIVATE_KEY || '';
  if (passkeyPublicKey) {
    agentPrivateKey = deriveEvmPrivateKey(passkeyPublicKey);
  }

  const chainConfig = getChainConfig();
  const walletManager = new KiteWalletManager({ agentPrivateKey });
  const sessionKeyManager = new SessionKeyManager();
  const identityManager = new KiteIdentityManager();
  const identity = identityManager.buildIdentityFromEnv();
  const wallet = walletManager.getWallet();
  const provider = walletManager.getProvider();

  if (!LEARNING_LEDGER_ADDRESS) {
    const mockTxHash = `0x${Date.now().toString(16)}${'0'.repeat(40)}`.slice(0, 66);
    return NextResponse.json({
      success: true,
      txHash: mockTxHash,
      explorerUrl: `${chainConfig.explorerUrl}tx/${mockTxHash}`,
      walletAddress: wallet.address,
      enrollment: {
        paperId,
        enrolledAt: new Date().toISOString(),
      },
      note: 'LearningLedger contract not deployed — enrollment event triggered with derived wallet',
    });
  }

  // Check spending limits
  const siDefaults = sessionKeyManager.buildDefaultStandingIntent(identity.did);
  const canSpendResult = await sessionKeyManager.canSpend(
    wallet.address,
    ENROLL_PAYMENT.toString(),
    { ...siDefaults, userSignature: 'env-default' }
  );
  if (!canSpendResult.allowed) {
    if (canSpendResult.reason?.includes('Daily cap')) {
      return NextResponse.json(
        {
          error: 'spending_limit_exceeded',
          message: canSpendResult.reason,
        },
        { status: 403 }
      );
    }
    return NextResponse.json(
      {
        error: 'spending_limit_exceeded',
        message: canSpendResult.reason || 'Spending limit exceeded',
      },
      { status: 403 }
    );
  }

  // Check balance
  const balance = await provider.getBalance(wallet.address);
  if (balance < ENROLL_PAYMENT) {
    const faucetUrl =
      'faucetUrl' in chainConfig ? chainConfig.faucetUrl : undefined;
    return NextResponse.json(
      {
        error: 'insufficient_funds',
        required: `${ethers.formatEther(ENROLL_PAYMENT)} KITE`,
        available: `${ethers.formatEther(balance)} KITE`,
        faucetUrl,
      },
      { status: 402 }
    );
  }

  // Call LearningLedger.enrollCourse
  try {
    const contract = new ethers.Contract(
      LEARNING_LEDGER_ADDRESS,
      LEARNING_LEDGER_ABI,
      wallet
    );

    const tx = await contract.enrollCourse(paperId, {
      value: ENROLL_PAYMENT,
    });
    const receipt = await tx.wait();

    // Record the spend
    sessionKeyManager.recordSpend(wallet.address, ENROLL_PAYMENT.toString());

    const txHash = receipt.hash;
    return NextResponse.json({
      success: true,
      txHash,
      explorerUrl: `${chainConfig.explorerUrl}tx/${txHash}`,
      enrollment: {
        paperId,
        enrolledAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[x402/enroll] Chain error:', error);
    const message =
      error instanceof Error ? error.message : 'Transaction failed';

    // Parse revert reasons
    if (message.includes('Already enrolled')) {
      return NextResponse.json(
        { error: 'invalid_params', message: 'Already enrolled in this course' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'chain_error', message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const routeConfig = buildRouteConfig({
    description: 'Enroll in a learning course',
    resource: '/api/x402/enroll',
  });

  return withX402Payment(req, routeConfig, handleEnroll);
}
