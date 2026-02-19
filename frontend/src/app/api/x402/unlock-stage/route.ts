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
import { withX402Payment, buildRouteConfig } from '../_lib/x402-nextjs';

const STAGE_PAYMENT = ethers.parseEther('0.001');

async function handleUnlockStage(
  _req: NextRequest,
  bodyText: string
): Promise<NextResponse> {
  // Parse and validate request body
  let body: {
    paperId?: string;
    stageId?: string;
    stageNum?: number;
    score?: number;
  };
  try {
    body = JSON.parse(bodyText);
  } catch {
    return NextResponse.json(
      { error: 'invalid_params', message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const { paperId, stageNum, score } = body;

  if (!paperId || typeof paperId !== 'string') {
    return NextResponse.json(
      { error: 'invalid_params', message: 'paperId is required' },
      { status: 400 }
    );
  }
  if (stageNum === undefined || typeof stageNum !== 'number' || stageNum < 0) {
    return NextResponse.json(
      { error: 'invalid_params', message: 'stageNum must be a non-negative number' },
      { status: 400 }
    );
  }
  if (score === undefined || typeof score !== 'number' || score < 0 || score > 100) {
    return NextResponse.json(
      { error: 'invalid_params', message: 'score must be between 0 and 100' },
      { status: 400 }
    );
  }

  if (!LEARNING_LEDGER_ADDRESS) {
    return NextResponse.json(
      {
        error: 'chain_error',
        message: 'LearningLedger contract address not configured',
      },
      { status: 500 }
    );
  }

  const chainConfig = getChainConfig();
  const walletManager = new KiteWalletManager();
  const sessionKeyManager = new SessionKeyManager();
  const identityManager = new KiteIdentityManager();
  const identity = identityManager.buildIdentityFromEnv();
  const wallet = walletManager.getWallet();
  const provider = walletManager.getProvider();

  // Check spending limits
  const siDefaults = sessionKeyManager.buildDefaultStandingIntent(identity.did);
  const canSpendResult = await sessionKeyManager.canSpend(
    wallet.address,
    STAGE_PAYMENT.toString(),
    { ...siDefaults, userSignature: 'env-default' }
  );
  if (!canSpendResult.allowed) {
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
  if (balance < STAGE_PAYMENT) {
    const faucetUrl =
      'faucetUrl' in chainConfig ? chainConfig.faucetUrl : undefined;
    return NextResponse.json(
      {
        error: 'insufficient_funds',
        required: `${ethers.formatEther(STAGE_PAYMENT)} KITE`,
        available: `${ethers.formatEther(balance)} KITE`,
        faucetUrl,
      },
      { status: 402 }
    );
  }

  // Call LearningLedger.completeStage
  try {
    const contract = new ethers.Contract(
      LEARNING_LEDGER_ADDRESS,
      LEARNING_LEDGER_ABI,
      wallet
    );

    const tx = await contract.completeStage(paperId, stageNum, score, {
      value: STAGE_PAYMENT,
    });
    const receipt = await tx.wait();

    // Record the spend
    sessionKeyManager.recordSpend(wallet.address, STAGE_PAYMENT.toString());

    const txHash = receipt.hash;

    // Read back the stage completion to get the attestation hash
    const [completedAt, returnedScore, attestationHash] =
      await contract.getStageCompletion(wallet.address, paperId, stageNum);

    return NextResponse.json({
      success: true,
      txHash,
      explorerUrl: `${chainConfig.explorerUrl}tx/${txHash}`,
      stageCompletion: {
        paperId,
        stageNum,
        score,
        attestationHash,
        completedAt: new Date(Number(completedAt) * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('[x402/unlock-stage] Chain error:', error);
    const message =
      error instanceof Error ? error.message : 'Transaction failed';

    // Parse revert reasons
    if (message.includes('Not enrolled')) {
      return NextResponse.json(
        { error: 'invalid_params', message: 'Not enrolled in this course' },
        { status: 400 }
      );
    }
    if (message.includes('Stage already completed')) {
      return NextResponse.json(
        { error: 'invalid_params', message: 'Stage already completed' },
        { status: 400 }
      );
    }
    if (message.includes('Invalid score')) {
      return NextResponse.json(
        { error: 'invalid_params', message: 'Score must be 0-100' },
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
    description: 'Unlock a learning stage',
    resource: '/api/x402/unlock-stage',
  });

  return withX402Payment(req, routeConfig, handleUnlockStage);
}
