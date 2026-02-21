// ERC-8004 (Trustless Agents) on-chain reputation client
// Connects to Identity + Reputation Registry on Ethereum Sepolia
// to register agents, record reputation, and query reputation.
// All methods act as no-ops when env vars are not configured (graceful degradation).

import { ethers } from 'ethers';
import {
  IDENTITY_REGISTRY_ABI,
  REPUTATION_REGISTRY_ABI,
  ERC8004_CONTRACTS,
} from './abi.js';

const DEFAULT_RPC = 'https://rpc.sepolia.org';
const ETHERSCAN_BASE = 'https://sepolia.etherscan.io';

export interface AgentRegistration {
  agentId: number;
  txHash: string;
  etherscanUrl: string;
}

export interface ReputationRecord {
  txHash: string;
  etherscanUrl: string;
}

export interface ReputationSummary {
  count: number;
  avgScore: number;
}

export class ERC8004Client {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Wallet | null = null;
  private identityRegistry: ethers.Contract | null = null;
  private reputationRegistry: ethers.Contract | null = null;
  private available: boolean = false;

  constructor() {
    const rpcUrl = process.env.SEPOLIA_RPC_URL || DEFAULT_RPC;
    const privateKey = process.env.ERC8004_PRIVATE_KEY;

    if (!privateKey) {
      // ERC-8004 not configured — all methods are no-ops
      return;
    }

    try {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      this.signer = new ethers.Wallet(privateKey, this.provider);

      this.identityRegistry = new ethers.Contract(
        ERC8004_CONTRACTS.identityRegistry,
        IDENTITY_REGISTRY_ABI,
        this.signer,
      );

      this.reputationRegistry = new ethers.Contract(
        ERC8004_CONTRACTS.reputationRegistry,
        REPUTATION_REGISTRY_ABI,
        this.signer,
      );

      this.available = true;
    } catch {
      // Initialization failed — graceful skip
      this.available = false;
    }
  }

  /** Whether ERC-8004 is configured */
  isAvailable(): boolean {
    return this.available;
  }

  /** Generate Etherscan transaction URL */
  txUrl(txHash: string): string {
    return `${ETHERSCAN_BASE}/tx/${txHash}`;
  }

  /** Register an agent in the Identity Registry (ERC-721 mint) */
  async registerAgent(
    name: string,
    hederaAccountId: string,
    role: 'analyst' | 'architect' | 'scholar',
  ): Promise<AgentRegistration | null> {
    if (!this.available || !this.identityRegistry) return null;

    // agentURI: agent metadata encoded as JSON
    const agentURI = JSON.stringify({
      name: `${name}-${role}`,
      role,
      hederaAccountId,
      platform: 'hedera-marketplace',
      registeredAt: new Date().toISOString(),
    });

    const tx = await this.identityRegistry.register(agentURI);
    const receipt = await tx.wait();

    // Extract agentId returned by register() from event logs
    // ERC-721 Transfer event: Transfer(address from, address to, uint256 tokenId)
    const transferLog = receipt.logs.find(
      (log: ethers.Log) => log.topics.length === 4, // Transfer has 3 indexed args
    );

    let agentId: number;
    if (transferLog) {
      agentId = Number(BigInt(transferLog.topics[3]));
    } else {
      // Fallback to totalSupply if event parsing fails
      const supply = await this.identityRegistry.totalSupply();
      agentId = Number(supply);
    }

    return {
      agentId,
      txHash: receipt.hash,
      etherscanUrl: this.txUrl(receipt.hash),
    };
  }

  /** Record a review score in the Reputation Registry */
  async recordReputation(
    agentId: number,
    score: number, // 0-100
    feedback: string,
    context: { requestId: string; role: string },
  ): Promise<ReputationRecord | null> {
    if (!this.available || !this.reputationRegistry) return null;

    // feedbackURI: review details encoded as JSON
    const feedbackURI = JSON.stringify({
      score,
      feedback,
      requestId: context.requestId,
      role: context.role,
      source: 'hedera-marketplace',
      timestamp: new Date().toISOString(),
    });

    // feedbackHash: keccak256 hash of the URI
    const feedbackHash = ethers.keccak256(ethers.toUtf8Bytes(feedbackURI));

    const tx = await this.reputationRegistry.giveFeedback(
      agentId,
      score,       // int128 value (0-100)
      0,           // uint8 valueDecimals (integer, so 0)
      'quality',   // tag1: evaluation category
      context.role, // tag2: agent role
      '',          // endpoint (empty)
      feedbackURI,
      feedbackHash,
    );

    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      etherscanUrl: this.txUrl(receipt.hash),
    };
  }

  /** Query agent reputation summary */
  async getReputation(agentId: number): Promise<ReputationSummary | null> {
    if (!this.available || !this.reputationRegistry) return null;

    const [count, summaryValue, decimals] = await this.reputationRegistry.getSummary(
      agentId,
      [],        // no reviewer filter (all reviewers)
      'quality', // tag1
      '',        // tag2 (all roles)
    );

    const countNum = Number(count);
    if (countNum === 0) return { count: 0, avgScore: 0 };

    const avg = Number(summaryValue) / (countNum * 10 ** Number(decimals));
    return { count: countNum, avgScore: Math.round(avg * 100) / 100 };
  }
}
