// Marketplace HCS message protocol type definitions
// All inter-agent communication is recorded on HCS using these types
// Reviewer agent removed — requester (human) performs reviews directly

import type { AgentAccount } from '../hedera/client.js';

// ── HCS message protocol ──

export interface CourseRequestMessage {
  type: 'course_request';
  requestId: string;
  sender: string;        // requester (server posts on behalf)
  paperUrl: string;
  budget: number;        // total escrow budget (KNOW)
  description: string;
  timestamp: string;
}

export interface BidMessage {
  type: 'bid';
  requestId: string;
  sender: string;        // bidding agent account ID
  senderName?: string;   // human-facing name ("Iris", "Alex")
  role: 'analyst' | 'architect';
  price: number;         // requested amount (KNOW)
  pitch: string;         // bid proposal description
  timestamp: string;
}

export interface BidAcceptedMessage {
  type: 'bid_accepted';
  requestId: string;
  sender: string;        // requester (human-approved)
  bidderAccountId: string;
  role: 'analyst' | 'architect';
  price: number;
  timestamp: string;
}

export interface EscrowLockMessage {
  type: 'escrow_lock';
  requestId: string;
  sender: string;        // server (trusted intermediary)
  escrowAccountId: string;
  tokenId: string;
  amount: number;
  txId: string;
  timestamp: string;
}

export interface DeliverableMessage {
  type: 'deliverable';
  requestId: string;
  sender: string;        // Analyst or Architect account ID
  senderName?: string;   // human-facing name ("Iris", "Alex")
  role: 'analyst' | 'architect';
  content: Record<string, unknown>;  // work deliverable (flexible structure)
  timestamp: string;
}

/** Review performed directly by the requester (human) — replaces former ReviewerAgent auto-review */
export interface ClientReviewMessage {
  type: 'client_review';
  requestId: string;
  sender: string;        // requester (server posts on behalf)
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
  sender: string;        // server
  toAccountId: string;
  role: 'analyst' | 'architect';
  amount: number;
  txId: string;
  timestamp: string;
}

export interface CourseCompleteMessage {
  type: 'course_complete';
  requestId: string;
  sender: string;        // server
  courseTitle: string;
  modules: string[];
  timestamp: string;
}

/** Consultation request to Scholar (Analyst/Architect -> Scholar) */
export interface ConsultationRequestMessage {
  type: 'consultation_request';
  requestId: string;
  sender: string;        // requesting agent account ID
  question: string;
  offeredFee: number;    // consultation fee offered in KNOW tokens
  timestamp: string;
}

/** Scholar consultation response (after confirming KNOW receipt) */
export interface ConsultationResponseMessage {
  type: 'consultation_response';
  requestId: string;
  sender: string;        // Scholar account ID
  answer: string;
  fee: number;           // actual consultation fee charged
  timestamp: string;
}

/** Revision request — sent when client review rejects a deliverable (rework loop) */
export interface RevisionRequestMessage {
  type: 'revision_request';
  requestId: string;
  sender: string;        // server (on behalf of requester)
  targetRole: 'analyst' | 'architect';
  feedback: string;      // what needs fixing
  revisionNumber: number; // 1-based revision count
  timestamp: string;
}

/** Scholar fee quote — Scholar proposes a consultation fee before answering */
export interface ConsultationFeeQuoteMessage {
  type: 'consultation_fee_quote';
  requestId: string;
  sender: string;        // Scholar account ID
  fee: number;           // proposed fee in KNOW tokens
  estimatedDepth: 'brief' | 'standard' | 'deep';
  timestamp: string;
}

/** Fee accepted — agent agrees to Scholar's proposed fee */
export interface FeeAcceptedMessage {
  type: 'fee_accepted';
  requestId: string;
  sender: string;        // requesting agent account ID
  fee: number;           // accepted fee
  timestamp: string;
}

/** Fee rejected — agent rejects Scholar's proposed fee */
export interface FeeRejectedMessage {
  type: 'fee_rejected';
  requestId: string;
  sender: string;        // requesting agent account ID
  reason: string;
  timestamp: string;
}

/** Union of all HCS message types */
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
  | ConsultationResponseMessage
  | RevisionRequestMessage
  | ConsultationFeeQuoteMessage
  | FeeAcceptedMessage
  | FeeRejectedMessage;

/** Literal union of the type field from HCS messages */
export type MarketplaceMessageType = MarketplaceMessage['type'];

// ── Marketplace infrastructure ──

/** ERC-8004 agent registration info */
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
  /** ERC-8004 on-chain reputation — undefined when Sepolia is not configured */
  erc8004?: {
    analyst: ERC8004AgentInfo;
    architect: ERC8004AgentInfo;
    scholar: ERC8004AgentInfo;
  };
}

// ── Orchestrator state machine ──

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

/** Data passed when the requester approves bids */
export interface BidApproval {
  analystAccountId: string;
  analystPrice: number;
  architectAccountId: string;
  architectPrice: number;
  /** N-bid generalization — when present, overrides the fixed analyst/architect fields */
  selectedBids?: Array<{ accountId: string; role: string; price: number }>;
}

/** Data passed when the requester submits review results */
export interface ClientReview {
  analystApproved: boolean;
  analystScore: number;
  analystFeedback: string;
  architectApproved: boolean;
  architectScore: number;
  architectFeedback: string;
}

/** Tracks the active course request state per requestId */
export interface CourseSession {
  requestId: string;
  state: MarketplaceState;
  paperUrl: string;
  budget: number;
  description: string;

  // Escrow
  escrowTxId?: string;
  escrowLocked: number;
  escrowReleased: number;

  // Bids
  bids: BidMessage[];
  acceptedAnalyst?: { accountId: string; price: number };
  acceptedArchitect?: { accountId: string; price: number };

  // Deliverables
  analystDeliverable?: DeliverableMessage;
  architectDeliverable?: DeliverableMessage;

  // Client reviews
  clientReviews: ClientReviewMessage[];

  // Rework loop
  analystRevisionCount: number;
  architectRevisionCount: number;
  maxRevisions: number;          // default 2

  // Settlement
  releases: EscrowReleaseMessage[];
}

// ── SSE events (for dashboard) ──

export interface MarketplaceSSEEvent {
  type: 'marketplace_state' | 'hcs_message' | 'escrow_update' | 'agent_status' | 'course_preview';
  data: Record<string, unknown>;
}

// ── Default escrow distribution ──

/** Default budget split ratio — 50:50 after Reviewer removal */
export const DEFAULT_ESCROW_SPLIT = {
  analyst: 0.5,    // 50%
  architect: 0.5,  // 50%
} as const;

// ── Score-proportional payment calculation ──
// Why not just bidPrice * score / 100? Because:
//   - Below 50 = rejected quality → zero payment (penalty)
//   - 80+ = high quality → full payment (reward)
//   - 50-79 = proportional to score (incentive to do better)

export function calculatePayment(bidPrice: number, score: number, approved: boolean): number {
  if (!approved || score < 50) return 0;
  if (score >= 80) return bidPrice;
  return Math.floor(bidPrice * score / 100);
}

/** Default max revision rounds before force-accepting */
export const MAX_REVISIONS = 2;
