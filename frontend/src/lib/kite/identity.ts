import { ethers } from 'ethers';

export interface AgentIdentity {
  did: string;
  walletAddress: string;
  kitePassHash: string;
  createdAt: number;
}

export interface StandingIntentForPass {
  agentDID: string;
  maxTransactionAmount: string;
  dailyCap: string;
  allowedContracts: string[];
  allowedFunctions: string[];
  expiresAt: number;
}

export class KiteIdentityManager {
  /**
   * Derive agent address from mnemonic using BIP-32 hierarchical key derivation.
   * Path: m/44'/2368'/0'/0/{agentIndex}
   */
  deriveAgentAddress(
    userMnemonic: string,
    agentIndex: number
  ): { address: string; privateKey: string } {
    const path = `m/44'/2368'/0'/0/${agentIndex}`;
    const hdNode = ethers.HDNodeWallet.fromMnemonic(
      ethers.Mnemonic.fromPhrase(userMnemonic),
      path
    );

    return {
      address: hdNode.address,
      privateKey: hdNode.privateKey,
    };
  }

  /**
   * Create a DID in the format: did:kite:{userIdentifier}/{agentType}/{agentVersion}
   */
  createDID(
    userIdentifier: string,
    agentType: string,
    agentVersion: string
  ): string {
    return `did:kite:${userIdentifier}/${agentType}/${agentVersion}`;
  }

  /**
   * Create a KitePass by hashing the agent identity bound to a Standing Intent.
   * Returns a keccak256 hash representing the cryptographic identity credential.
   */
  async createKitePass(
    agentIdentity: AgentIdentity,
    standingIntent: StandingIntentForPass
  ): Promise<string> {
    const payload = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string', 'address', 'string', 'uint256', 'uint256', 'uint256'],
      [
        agentIdentity.did,
        agentIdentity.walletAddress,
        standingIntent.agentDID,
        standingIntent.maxTransactionAmount,
        standingIntent.dailyCap,
        standingIntent.expiresAt,
      ]
    );
    return ethers.keccak256(payload);
  }

  /**
   * Verify a KitePass hash against an agent address.
   * In a full implementation, this would check on-chain state.
   */
  async verifyKitePass(
    kitePassHash: string,
    agentAddress: string
  ): Promise<boolean> {
    // Basic validation: hash is non-empty and address is valid
    if (!kitePassHash || kitePassHash === ethers.ZeroHash) {
      return false;
    }
    if (!ethers.isAddress(agentAddress)) {
      return false;
    }
    return true;
  }

  /**
   * Build a complete AgentIdentity from environment config.
   */
  buildIdentityFromEnv(): AgentIdentity {
    const did =
      process.env.NEXT_PUBLIC_AGENT_DID ||
      'did:kite:learner.eth/claude-tutor/v1';

    const mnemonic = process.env.KITE_USER_MNEMONIC;
    const agentIndex = Number(process.env.KITE_AGENT_INDEX || '0');

    let walletAddress = '';
    if (mnemonic) {
      const derived = this.deriveAgentAddress(mnemonic, agentIndex);
      walletAddress = derived.address;
    }

    return {
      did,
      walletAddress,
      kitePassHash: '',
      createdAt: Date.now(),
    };
  }
}
