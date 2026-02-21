// ERC-8004 (Trustless Agents) 온체인 평판 클라이언트
// Ethereum Sepolia의 Identity + Reputation Registry에 연결하여
// 에이전트 등록, 평판 기록, 평판 조회를 수행한다.
// 환경변수 미설정 시 모든 메서드가 no-op으로 동작 (graceful degradation).

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
      // ERC-8004 미설정 — 모든 메서드가 no-op
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
      // 초기화 실패 — graceful skip
      this.available = false;
    }
  }

  /** ERC-8004 설정 여부 */
  isAvailable(): boolean {
    return this.available;
  }

  /** Etherscan 트랜잭션 URL 생성 */
  txUrl(txHash: string): string {
    return `${ETHERSCAN_BASE}/tx/${txHash}`;
  }

  /** 에이전트를 Identity Registry에 등록 (ERC-721 민트) */
  async registerAgent(
    name: string,
    hederaAccountId: string,
    role: 'analyst' | 'architect' | 'scholar',
  ): Promise<AgentRegistration | null> {
    if (!this.available || !this.identityRegistry) return null;

    // agentURI: 에이전트 메타데이터를 JSON으로 인코딩
    const agentURI = JSON.stringify({
      name: `${name}-${role}`,
      role,
      hederaAccountId,
      platform: 'hedera-marketplace',
      registeredAt: new Date().toISOString(),
    });

    const tx = await this.identityRegistry.register(agentURI);
    const receipt = await tx.wait();

    // register()가 반환하는 agentId를 이벤트 로그에서 추출
    // ERC-721 Transfer 이벤트: Transfer(address from, address to, uint256 tokenId)
    const transferLog = receipt.logs.find(
      (log: ethers.Log) => log.topics.length === 4, // Transfer는 3개의 indexed arg
    );

    let agentId: number;
    if (transferLog) {
      agentId = Number(BigInt(transferLog.topics[3]));
    } else {
      // 이벤트 파싱 실패 시 totalSupply로 추정
      const supply = await this.identityRegistry.totalSupply();
      agentId = Number(supply);
    }

    return {
      agentId,
      txHash: receipt.hash,
      etherscanUrl: this.txUrl(receipt.hash),
    };
  }

  /** 리뷰 점수를 Reputation Registry에 기록 */
  async recordReputation(
    agentId: number,
    score: number, // 0-100
    feedback: string,
    context: { requestId: string; role: string },
  ): Promise<ReputationRecord | null> {
    if (!this.available || !this.reputationRegistry) return null;

    // feedbackURI: 리뷰 상세를 JSON으로 인코딩
    const feedbackURI = JSON.stringify({
      score,
      feedback,
      requestId: context.requestId,
      role: context.role,
      source: 'hedera-marketplace',
      timestamp: new Date().toISOString(),
    });

    // feedbackHash: URI의 keccak256 해시
    const feedbackHash = ethers.keccak256(ethers.toUtf8Bytes(feedbackURI));

    const tx = await this.reputationRegistry.giveFeedback(
      agentId,
      score,       // int128 value (0-100)
      0,           // uint8 valueDecimals (정수이므로 0)
      'quality',   // tag1: 평가 카테고리
      context.role, // tag2: 에이전트 역할
      '',          // endpoint (비어 있음)
      feedbackURI,
      feedbackHash,
    );

    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      etherscanUrl: this.txUrl(receipt.hash),
    };
  }

  /** 에이전트 평판 요약 조회 */
  async getReputation(agentId: number): Promise<ReputationSummary | null> {
    if (!this.available || !this.reputationRegistry) return null;

    const [count, summaryValue, decimals] = await this.reputationRegistry.getSummary(
      agentId,
      [],        // reviewers 필터 없음 (모든 리뷰어)
      'quality', // tag1
      '',        // tag2 (모든 역할)
    );

    const countNum = Number(count);
    if (countNum === 0) return { count: 0, avgScore: 0 };

    const avg = Number(summaryValue) / (countNum * 10 ** Number(decimals));
    return { count: countNum, avgScore: Math.round(avg * 100) / 100 };
  }
}
