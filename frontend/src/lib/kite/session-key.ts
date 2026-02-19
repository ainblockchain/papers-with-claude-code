import { ethers } from 'ethers';

export interface StandingIntent {
  agentDID: string;
  maxTransactionAmount: string; // wei
  dailyCap: string; // wei
  allowedContracts: string[];
  allowedFunctions: string[];
  expiresAt: number; // Unix timestamp
  userSignature: string;
}

export interface DelegationToken {
  standingIntentHash: string;
  sessionKeyAddress: string;
  validFrom: number;
  validUntil: number;
  agentSignature: string;
}

// In-memory daily usage tracker (per agent address)
const dailyUsageMap = new Map<string, { date: string; total: bigint }>();

export class SessionKeyManager {
  /**
   * Create a Standing Intent and sign it with the user's signer.
   */
  async createStandingIntent(
    params: Omit<StandingIntent, 'userSignature'>,
    userSigner: ethers.Signer
  ): Promise<StandingIntent> {
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'uint256', 'uint256', 'address[]', 'string[]', 'uint256'],
      [
        params.agentDID,
        params.maxTransactionAmount,
        params.dailyCap,
        params.allowedContracts,
        params.allowedFunctions,
        params.expiresAt,
      ]
    );
    const hash = ethers.keccak256(payload);
    const userSignature = await userSigner.signMessage(ethers.getBytes(hash));

    return {
      ...params,
      userSignature,
    };
  }

  /**
   * Issue a Delegation Token for a session key, signed by the agent.
   */
  async issueDelegationToken(
    standingIntent: StandingIntent,
    sessionKeyAddress: string,
    agentSigner: ethers.Signer,
    ttlSeconds: number = 60
  ): Promise<DelegationToken> {
    const siPayload = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'uint256', 'uint256', 'uint256', 'string'],
      [
        standingIntent.agentDID,
        standingIntent.maxTransactionAmount,
        standingIntent.dailyCap,
        standingIntent.expiresAt,
        standingIntent.userSignature,
      ]
    );
    const standingIntentHash = ethers.keccak256(siPayload);

    const now = Math.floor(Date.now() / 1000);
    const validFrom = now;
    const validUntil = now + ttlSeconds;

    const dtPayload = ethers.AbiCoder.defaultAbiCoder().encode(
      ['bytes32', 'address', 'uint256', 'uint256'],
      [standingIntentHash, sessionKeyAddress, validFrom, validUntil]
    );
    const dtHash = ethers.keccak256(dtPayload);
    const agentSignature = await agentSigner.signMessage(ethers.getBytes(dtHash));

    return {
      standingIntentHash,
      sessionKeyAddress,
      validFrom,
      validUntil,
      agentSignature,
    };
  }

  /**
   * Validate that a Standing Intent is currently valid.
   */
  validateStandingIntent(si: StandingIntent): boolean {
    const now = Math.floor(Date.now() / 1000);

    if (si.expiresAt <= now) {
      return false;
    }
    if (!si.userSignature) {
      return false;
    }
    if (BigInt(si.maxTransactionAmount) <= BigInt(0)) {
      return false;
    }
    if (BigInt(si.dailyCap) <= BigInt(0)) {
      return false;
    }

    return true;
  }

  /**
   * Get cumulative daily usage for an agent address.
   */
  async getDailyUsage(agentAddress: string): Promise<string> {
    const today = new Date().toISOString().split('T')[0];
    const entry = dailyUsageMap.get(agentAddress);

    if (!entry || entry.date !== today) {
      return '0';
    }
    return entry.total.toString();
  }

  /**
   * Record a spend amount for daily tracking.
   */
  recordSpend(agentAddress: string, amountWei: string): void {
    const today = new Date().toISOString().split('T')[0];
    const entry = dailyUsageMap.get(agentAddress);

    if (!entry || entry.date !== today) {
      dailyUsageMap.set(agentAddress, {
        date: today,
        total: BigInt(amountWei),
      });
    } else {
      entry.total += BigInt(amountWei);
    }
  }

  /**
   * Check if the agent can spend the given amount under its Standing Intent limits.
   */
  async canSpend(
    agentAddress: string,
    amount: string,
    standingIntent: StandingIntent
  ): Promise<{ allowed: boolean; reason?: string }> {
    if (!this.validateStandingIntent(standingIntent)) {
      return { allowed: false, reason: 'Standing Intent expired or invalid' };
    }

    const amountBig = BigInt(amount);
    const maxTx = BigInt(standingIntent.maxTransactionAmount);
    if (amountBig > maxTx) {
      return {
        allowed: false,
        reason: `Amount ${amount} exceeds per-transaction limit ${standingIntent.maxTransactionAmount}`,
      };
    }

    const dailyUsed = BigInt(await this.getDailyUsage(agentAddress));
    const dailyCap = BigInt(standingIntent.dailyCap);
    if (dailyUsed + amountBig > dailyCap) {
      return {
        allowed: false,
        reason: `Daily cap would be exceeded. Used: ${dailyUsed}, Cap: ${dailyCap}`,
      };
    }

    return { allowed: true };
  }

  /**
   * Build a default Standing Intent from environment variables.
   */
  buildDefaultStandingIntent(agentDID: string): Omit<StandingIntent, 'userSignature'> {
    const ttlHours = Number(process.env.KITE_SI_TTL_HOURS || '24');
    const expiresAt = Math.floor(Date.now() / 1000) + ttlHours * 3600;

    return {
      agentDID,
      maxTransactionAmount:
        process.env.KITE_SI_MAX_TX || '10000000000000000', // 0.01 KITE
      dailyCap:
        process.env.KITE_SI_DAILY_CAP || '100000000000000000', // 0.1 KITE
      allowedContracts: process.env.NEXT_PUBLIC_LEARNING_LEDGER_ADDRESS
        ? [process.env.NEXT_PUBLIC_LEARNING_LEDGER_ADDRESS]
        : [],
      allowedFunctions: ['enrollCourse', 'completeStage'],
      expiresAt,
    };
  }
}
