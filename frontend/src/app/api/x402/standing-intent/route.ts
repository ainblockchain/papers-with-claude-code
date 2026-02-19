import { NextRequest, NextResponse } from 'next/server';
import { SessionKeyManager } from '@/lib/kite/session-key';
import { KiteIdentityManager } from '@/lib/kite/identity';

export async function GET() {
  try {
    const identityManager = new KiteIdentityManager();
    const sessionKeyManager = new SessionKeyManager();
    const identity = identityManager.buildIdentityFromEnv();
    const si = sessionKeyManager.buildDefaultStandingIntent(identity.did);

    return NextResponse.json({
      standingIntent: {
        ...si,
        userSignature: '', // Default SI is not user-signed
      },
    });
  } catch (error) {
    console.error('[x402/standing-intent] Error:', error);
    return NextResponse.json(
      {
        error: 'chain_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to get standing intent',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      agentDID,
      maxTransactionAmount,
      dailyCap,
      allowedContracts,
      allowedFunctions,
      expiresAt,
    } = body;

    // Validate required fields
    if (!agentDID || !maxTransactionAmount || !dailyCap || !expiresAt) {
      return NextResponse.json(
        {
          error: 'invalid_params',
          message:
            'Missing required fields: agentDID, maxTransactionAmount, dailyCap, expiresAt',
        },
        { status: 400 }
      );
    }

    // Validate numeric values
    try {
      BigInt(maxTransactionAmount);
      BigInt(dailyCap);
    } catch {
      return NextResponse.json(
        {
          error: 'invalid_params',
          message: 'maxTransactionAmount and dailyCap must be valid wei values',
        },
        { status: 400 }
      );
    }

    if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json(
        {
          error: 'invalid_params',
          message: 'expiresAt must be in the future',
        },
        { status: 400 }
      );
    }

    // Store the Standing Intent configuration
    // In production, this would be persisted to a database or on-chain
    // For now, we validate and acknowledge the update
    const sessionKeyManager = new SessionKeyManager();
    const isValid = sessionKeyManager.validateStandingIntent({
      agentDID,
      maxTransactionAmount,
      dailyCap,
      allowedContracts: allowedContracts || [],
      allowedFunctions: allowedFunctions || [],
      expiresAt: Number(expiresAt),
      userSignature: body.userSignature || 'pending',
    });

    if (!isValid) {
      return NextResponse.json(
        {
          error: 'invalid_params',
          message: 'Standing Intent validation failed',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      standingIntent: {
        agentDID,
        maxTransactionAmount,
        dailyCap,
        allowedContracts: allowedContracts || [],
        allowedFunctions: allowedFunctions || [],
        expiresAt: Number(expiresAt),
      },
    });
  } catch (error) {
    console.error('[x402/standing-intent] Error:', error);
    return NextResponse.json(
      {
        error: 'chain_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to update standing intent',
      },
      { status: 500 }
    );
  }
}
