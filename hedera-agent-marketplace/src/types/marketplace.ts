// 마켓플레이스 HCS 메시지 프로토콜 타입 정의
// 모든 에이전트 간 통신은 이 타입들로 HCS에 기록됨
// Reviewer 에이전트 제거 — 의뢰인(사람)이 직접 리뷰 수행

import type { AgentAccount } from '../hedera/client.js';

// ── HCS 메시지 프로토콜 ──

export interface CourseRequestMessage {
  type: 'course_request';
  requestId: string;
  sender: string;        // 의뢰인 (서버가 대리 게시)
  paperUrl: string;
  budget: number;        // 총 에스크로 예산 (KNOW)
  description: string;
  timestamp: string;
}

export interface BidMessage {
  type: 'bid';
  requestId: string;
  sender: string;        // 입찰 에이전트 account ID
  role: 'analyst' | 'architect';
  price: number;         // 요청 금액 (KNOW)
  pitch: string;         // 입찰 제안 설명
  timestamp: string;
}

export interface BidAcceptedMessage {
  type: 'bid_accepted';
  requestId: string;
  sender: string;        // 의뢰인 (사람이 승인)
  bidderAccountId: string;
  role: 'analyst' | 'architect';
  price: number;
  timestamp: string;
}

export interface EscrowLockMessage {
  type: 'escrow_lock';
  requestId: string;
  sender: string;        // 서버 (trusted intermediary)
  escrowAccountId: string;
  tokenId: string;
  amount: number;
  txId: string;
  timestamp: string;
}

export interface DeliverableMessage {
  type: 'deliverable';
  requestId: string;
  sender: string;        // Analyst 또는 Architect account ID
  role: 'analyst' | 'architect';
  content: Record<string, unknown>;  // 작업 결과물 (유연한 구조)
  timestamp: string;
}

/** 의뢰인(사람)이 직접 수행하는 리뷰 — 기존 ReviewerAgent 자동 리뷰 대체 */
export interface ClientReviewMessage {
  type: 'client_review';
  requestId: string;
  sender: string;        // 의뢰인 (서버가 대리 게시)
  targetRole: 'analyst' | 'architect';
  targetAccountId: string;
  approved: boolean;
  score: number;         // 0-100
  feedback: string;
  timestamp: string;
}

export interface EscrowReleaseMessage {
  type: 'escrow_release';
  requestId: string;
  sender: string;        // 서버
  toAccountId: string;
  role: 'analyst' | 'architect';
  amount: number;
  txId: string;
  timestamp: string;
}

export interface CourseCompleteMessage {
  type: 'course_complete';
  requestId: string;
  sender: string;        // 서버
  courseTitle: string;
  modules: string[];
  timestamp: string;
}

/** Scholar에게 자문 요청 (Analyst/Architect → Scholar) */
export interface ConsultationRequestMessage {
  type: 'consultation_request';
  requestId: string;
  sender: string;        // 요청 에이전트 account ID
  question: string;
  offeredFee: number;    // KNOW 토큰으로 제안하는 자문비
  timestamp: string;
}

/** Scholar 자문 응답 (KNOW 수신 확인 후) */
export interface ConsultationResponseMessage {
  type: 'consultation_response';
  requestId: string;
  sender: string;        // Scholar account ID
  answer: string;
  fee: number;           // 실제 청구한 자문비
  timestamp: string;
}

/** 모든 HCS 메시지 타입의 유니온 */
export type MarketplaceMessage =
  | CourseRequestMessage
  | BidMessage
  | BidAcceptedMessage
  | EscrowLockMessage
  | DeliverableMessage
  | ClientReviewMessage
  | EscrowReleaseMessage
  | CourseCompleteMessage
  | ConsultationRequestMessage
  | ConsultationResponseMessage;

/** HCS 메시지의 type 필드 리터럴 유니온 */
export type MarketplaceMessageType = MarketplaceMessage['type'];

// ── 마켓플레이스 인프라 ──

/** ERC-8004 에이전트 등록 정보 */
export interface ERC8004AgentInfo {
  agentId: number;
  txHash: string;
  etherscanUrl: string;
}

export interface MarketplaceInfra {
  topicId: string;
  tokenId: string;
  escrowAccount: AgentAccount;
  analystAccount: AgentAccount;
  architectAccount: AgentAccount;
  scholarAccount: AgentAccount;
  /** ERC-8004 온체인 평판 — Sepolia 미설정 시 undefined */
  erc8004?: {
    analyst: ERC8004AgentInfo;
    architect: ERC8004AgentInfo;
    scholar: ERC8004AgentInfo;
  };
}

// ── 오케스트레이터 상태 머신 ──

export type MarketplaceState =
  | 'IDLE'
  | 'REQUEST'
  | 'BIDDING'
  | 'AWAITING_BID_APPROVAL'
  | 'ANALYST_WORKING'
  | 'ARCHITECT_WORKING'
  | 'AWAITING_REVIEW'
  | 'RELEASING'
  | 'COMPLETE'
  | 'ERROR';

/** 의뢰인이 입찰을 승인할 때 전달하는 데이터 */
export interface BidApproval {
  analystAccountId: string;
  analystPrice: number;
  architectAccountId: string;
  architectPrice: number;
}

/** 의뢰인이 리뷰 결과를 제출할 때 전달하는 데이터 */
export interface ClientReview {
  analystApproved: boolean;
  analystScore: number;
  analystFeedback: string;
  architectApproved: boolean;
  architectScore: number;
  architectFeedback: string;
}

/** requestId별 활성 코스 요청 상태 추적 */
export interface CourseSession {
  requestId: string;
  state: MarketplaceState;
  paperUrl: string;
  budget: number;
  description: string;

  // 에스크로
  escrowTxId?: string;
  escrowLocked: number;
  escrowReleased: number;

  // 입찰
  bids: BidMessage[];
  acceptedAnalyst?: { accountId: string; price: number };
  acceptedArchitect?: { accountId: string; price: number };

  // 결과물
  analystDeliverable?: DeliverableMessage;
  architectDeliverable?: DeliverableMessage;

  // 의뢰인 리뷰
  clientReviews: ClientReviewMessage[];

  // 정산
  releases: EscrowReleaseMessage[];
}

// ── SSE 이벤트 (대시보드용) ──

export interface MarketplaceSSEEvent {
  type: 'marketplace_state' | 'hcs_message' | 'escrow_update' | 'agent_status' | 'course_preview';
  data: Record<string, unknown>;
}

// ── 에스크로 분배 기본값 ──

/** 예산 기준 기본 분배 비율 — Reviewer 제거로 50:50 */
export const DEFAULT_ESCROW_SPLIT = {
  analyst: 0.5,    // 50%
  architect: 0.5,  // 50%
} as const;
