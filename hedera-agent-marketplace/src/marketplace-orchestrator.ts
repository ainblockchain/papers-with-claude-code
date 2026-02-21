// 마켓플레이스 오케스트레이터 — 에이전트 자율 경제 + 인간 의뢰인 리뷰
//
// 핵심 변경: 서버가 에이전트에게 직접 통신하지 않음.
// 에이전트는 OpenClaw cron(5초 간격)으로 HCS를 자율 폴링하며,
// 오케스트레이터는 HCS 메시지를 감지하고 인간 승인을 중개하는 역할만 수행.
//
// 상태 흐름:
// course_request → bid(들) → AWAITING_BID_APPROVAL(사람) → bid_accepted
// → deliverable(analyst) → deliverable(architect) → AWAITING_REVIEW(사람)
// → client_review → escrow_release → course_complete

import {
  HederaContext,
  submitMessage,
  getTokenBalance,
  escrowRelease,
  hashscanUrl,
} from './hedera/client.js';
import type {
  MarketplaceInfra,
  MarketplaceState,
  CourseSession,
  BidMessage,
  DeliverableMessage,
  BidApproval,
  ClientReview,
} from './types/marketplace.js';
import { DEFAULT_ESCROW_SPLIT } from './types/marketplace.js';
import { pollForHcsMessage } from './openclaw/hcs-poller.js';
import { ERC8004Client } from './erc8004/client.js';

export type SSEEmitter = (type: string, data: any) => void;

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function genRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class MarketplaceOrchestrator {
  private erc8004: ERC8004Client;
  private state: MarketplaceState = 'IDLE';
  private session: CourseSession | null = null;

  // Promise resolver 패턴 — 인간 승인 대기
  private bidApprovalResolver: ((approval: BidApproval) => void) | null = null;
  private reviewResolver: ((review: ClientReview) => void) | null = null;

  constructor(private ctx: HederaContext) {
    this.erc8004 = new ERC8004Client();
  }

  getState(): MarketplaceState {
    return this.state;
  }

  getSession(): CourseSession | null {
    return this.session;
  }

  /** 의뢰인이 입찰 승인 제출 시 호출 */
  submitBidApproval(approval: BidApproval): void {
    if (this.bidApprovalResolver) {
      this.bidApprovalResolver(approval);
      this.bidApprovalResolver = null;
    }
  }

  /** 의뢰인이 리뷰 결과 제출 시 호출 */
  submitReview(review: ClientReview): void {
    if (this.reviewResolver) {
      this.reviewResolver(review);
      this.reviewResolver = null;
    }
  }

  // ── 메인 실행 ──
  // HCS에 일감 게시 → 에이전트 자율 입찰 대기 → 인간 승인 → 에이전트 자율 작업 → 인간 리뷰

  async run(
    infra: MarketplaceInfra,
    paperUrl: string,
    budget: number,
    description: string,
    emit: SSEEmitter,
  ): Promise<void> {
    emit('mode', { mode: 'autonomous' });

    if (this.erc8004.isAvailable()) {
      emit('log', { icon: '🔗', msg: 'ERC-8004 온체인 평판 시스템 활성화 (Ethereum Sepolia)' });
    }

    await this.registerERC8004Agents(infra, emit);

    const { topicId, tokenId, escrowAccount, analystAccount, architectAccount } = infra;
    const requestId = genRequestId();

    this.session = {
      requestId,
      state: 'REQUEST',
      paperUrl,
      budget,
      description,
      escrowLocked: budget,
      escrowReleased: 0,
      bids: [],
      clientReviews: [],
      releases: [],
    };

    let lastSeq = 0;

    this.transition('REQUEST', emit);

    // ── Step 1: course_request + escrow_lock 게시 ──
    emit('step', { step: 2, title: 'Course Request → HCS' });
    emit('log', { icon: '📄', msg: `코스 요청 게시: ${paperUrl}` });

    const requestPayload = JSON.stringify({
      type: 'course_request',
      requestId,
      sender: 'requester',
      paperUrl,
      budget,
      description,
      timestamp: new Date().toISOString(),
    });
    const requestRecord = await submitMessage(this.ctx, topicId, requestPayload);
    lastSeq = requestRecord.sequenceNumber;
    emit('hcs_message', this.formatHcsEvent(requestRecord.sequenceNumber, 'course_request', 'requester', 'requester', {
      requestId, paperUrl, budget, description,
    }, requestRecord.timestamp));

    emit('log', { icon: '🔒', msg: `에스크로에 ${budget} KNOW 잠금 완료` });
    const lockPayload = JSON.stringify({
      type: 'escrow_lock',
      requestId,
      sender: 'server',
      escrowAccountId: escrowAccount.accountId,
      tokenId,
      amount: budget,
      txId: 'treasury-to-escrow',
      timestamp: new Date().toISOString(),
    });
    const lockRecord = await submitMessage(this.ctx, topicId, lockPayload);
    lastSeq = lockRecord.sequenceNumber;
    emit('hcs_message', this.formatHcsEvent(lockRecord.sequenceNumber, 'escrow_lock', 'server', 'server', {
      escrowAccountId: escrowAccount.accountId, amount: budget,
    }, lockRecord.timestamp));
    emit('escrow_update', { locked: budget, released: 0, remaining: budget });

    // ── Step 2: BIDDING — 에이전트가 자율적으로 HCS에 bid 게시 대기 ──
    this.transition('BIDDING', emit);
    emit('step', { step: 3, title: 'Bidding Phase (Autonomous Agents)' });
    emit('log', { icon: '🏷️', msg: '에이전트들의 자율 입찰 대기 중... (HCS 폴링)' });

    const bidMessages = await pollForHcsMessage(
      topicId,
      { type: 'bid', requestId, afterSeq: lastSeq },
      2,
      300_000, // 5분 대기 — 에이전트가 cron으로 감지할 시간 필요
      emit,
    );

    const collectedBids: BidMessage[] = [];
    for (const bm of bidMessages) {
      const bid = bm.parsed as BidMessage;
      lastSeq = Math.max(lastSeq, bm.sequenceNumber);
      collectedBids.push(bid);
      this.session.bids.push(bid);
      emit('hcs_message', this.formatHcsEvent(bm.sequenceNumber, 'bid', bid.sender, bid.role, {
        role: bid.role, price: bid.price, pitch: bid.pitch,
      }, bm.timestamp));
    }

    // ── Step 3: AWAITING_BID_APPROVAL — 의뢰인 승인 대기 ──
    this.transition('AWAITING_BID_APPROVAL', emit);
    emit('step', { step: 3.5, title: 'Awaiting Bid Approval (Human)' });
    emit('log', { icon: '👤', msg: '의뢰인의 입찰 승인 대기 중...' });

    // 의뢰인에게 입찰 정보 전달 → UI에서 승인/거절 버튼 표시
    emit('awaiting_bid_approval', { bids: collectedBids });

    // Promise 패턴으로 인간 승인 대기
    const approval = await new Promise<BidApproval>((resolve) => {
      this.bidApprovalResolver = resolve;
    });

    // bid_accepted 게시
    const analystPrice = approval.analystPrice;
    const architectPrice = approval.architectPrice;

    for (const [role, accountId, price] of [
      ['analyst', approval.analystAccountId, analystPrice] as const,
      ['architect', approval.architectAccountId, architectPrice] as const,
    ]) {
      const acceptPayload = JSON.stringify({
        type: 'bid_accepted',
        requestId,
        sender: 'requester',
        bidderAccountId: accountId,
        role,
        price,
        timestamp: new Date().toISOString(),
      });
      const acceptRecord = await submitMessage(this.ctx, topicId, acceptPayload);
      lastSeq = acceptRecord.sequenceNumber;
      emit('hcs_message', this.formatHcsEvent(acceptRecord.sequenceNumber, 'bid_accepted', 'requester', 'requester', {
        bidderAccountId: accountId, role, price,
      }, acceptRecord.timestamp));
    }

    this.session.acceptedAnalyst = { accountId: approval.analystAccountId, price: analystPrice };
    this.session.acceptedArchitect = { accountId: approval.architectAccountId, price: architectPrice };

    // ── Step 4: ANALYST_WORKING — analyst가 자율적으로 작업 후 deliverable 게시 대기 ──
    this.transition('ANALYST_WORKING', emit);
    emit('step', { step: 4, title: 'Analyst Working (Autonomous)' });
    emit('log', { icon: '🔬', msg: 'Analyst 에이전트의 자율 분석 대기 중...' });
    emit('agent_status', { role: 'analyst', status: 'working', statusText: 'Analyzing...' });

    const analystDeliverables = await pollForHcsMessage(
      topicId,
      { type: 'deliverable', role: 'analyst', requestId, afterSeq: lastSeq },
      1,
      300_000,
      emit,
    );

    if (analystDeliverables.length > 0) {
      const ad = analystDeliverables[0];
      const adParsed = ad.parsed as DeliverableMessage;
      lastSeq = Math.max(lastSeq, ad.sequenceNumber);
      this.session.analystDeliverable = adParsed;

      emit('hcs_message', this.formatHcsEvent(ad.sequenceNumber, 'deliverable', adParsed.sender, 'analyst', {
        role: 'analyst',
        preview: JSON.stringify(adParsed.content).slice(0, 200) + '...',
      }, ad.timestamp));
      emit('agent_status', { role: 'analyst', status: 'delivered', statusText: 'Delivered' });
    } else {
      emit('log', { icon: '⚠️', msg: 'Analyst 결과물 미감지 — 타임아웃' });
      emit('agent_status', { role: 'analyst', status: 'timeout', statusText: 'Timeout' });
    }

    // ── Step 5: ARCHITECT_WORKING — architect가 자율적으로 설계 후 deliverable 게시 대기 ──
    this.transition('ARCHITECT_WORKING', emit);
    emit('step', { step: 5, title: 'Architect Working (Autonomous)' });
    emit('log', { icon: '🏗️', msg: 'Architect 에이전트의 자율 설계 대기 중...' });
    emit('agent_status', { role: 'architect', status: 'working', statusText: 'Designing...' });

    const architectDeliverables = await pollForHcsMessage(
      topicId,
      { type: 'deliverable', role: 'architect', requestId, afterSeq: lastSeq },
      1,
      300_000,
      emit,
    );

    if (architectDeliverables.length > 0) {
      const archD = architectDeliverables[0];
      const archParsed = archD.parsed as DeliverableMessage;
      lastSeq = Math.max(lastSeq, archD.sequenceNumber);
      this.session.architectDeliverable = archParsed;

      emit('hcs_message', this.formatHcsEvent(archD.sequenceNumber, 'deliverable', archParsed.sender, 'architect', {
        role: 'architect',
        preview: JSON.stringify(archParsed.content).slice(0, 200) + '...',
      }, archD.timestamp));
      emit('agent_status', { role: 'architect', status: 'delivered', statusText: 'Delivered' });
    } else {
      emit('log', { icon: '⚠️', msg: 'Architect 결과물 미감지 — 타임아웃' });
      emit('agent_status', { role: 'architect', status: 'timeout', statusText: 'Timeout' });
    }

    // ── Step 6: AWAITING_REVIEW — 의뢰인 리뷰 대기 ──
    this.transition('AWAITING_REVIEW', emit);
    emit('step', { step: 6, title: 'Awaiting Your Review (Human)' });
    emit('log', { icon: '👤', msg: '의뢰인의 리뷰 대기 중...' });

    emit('awaiting_review', {
      analystDeliverable: this.session.analystDeliverable ?? null,
      architectDeliverable: this.session.architectDeliverable ?? null,
    });

    const review = await new Promise<ClientReview>((resolve) => {
      this.reviewResolver = resolve;
    });

    // client_review HCS 기록
    for (const [role, accountId, approved, score, feedback] of [
      ['analyst', analystAccount.accountId, review.analystApproved, review.analystScore, review.analystFeedback] as const,
      ['architect', architectAccount.accountId, review.architectApproved, review.architectScore, review.architectFeedback] as const,
    ]) {
      const reviewPayload = JSON.stringify({
        type: 'client_review',
        requestId,
        sender: 'requester',
        targetRole: role,
        targetAccountId: accountId,
        approved,
        score,
        feedback,
        timestamp: new Date().toISOString(),
      });
      const reviewRecord = await submitMessage(this.ctx, topicId, reviewPayload);
      lastSeq = reviewRecord.sequenceNumber;
      emit('hcs_message', this.formatHcsEvent(reviewRecord.sequenceNumber, 'client_review', 'requester', 'requester', {
        targetRole: role, approved, score, feedback,
      }, reviewRecord.timestamp));
    }

    // ERC-8004 평판 기록 (의뢰인 리뷰 점수 기반)
    await this.recordERC8004Reputation(infra, requestId, [
      { role: 'analyst', score: review.analystScore, feedback: review.analystFeedback },
      { role: 'architect', score: review.architectScore, feedback: review.architectFeedback },
    ], emit);

    // ── Step 7: RELEASING — 에스크로 해제 (50:50, 승인된 에이전트만) ──
    this.transition('RELEASING', emit);
    emit('log', { icon: '💰', msg: '에스크로 지급 처리 중...' });

    let totalReleased = 0;

    if (review.analystApproved) {
      const txId = await escrowRelease(this.ctx, escrowAccount, tokenId, analystAccount, analystPrice);
      totalReleased += analystPrice;
      const releasePayload = JSON.stringify({
        type: 'escrow_release', requestId, sender: 'server',
        toAccountId: analystAccount.accountId, role: 'analyst', amount: analystPrice, txId,
        timestamp: new Date().toISOString(),
      });
      const releaseRecord = await submitMessage(this.ctx, topicId, releasePayload);
      emit('hcs_message', this.formatHcsEvent(releaseRecord.sequenceNumber, 'escrow_release', 'server', 'server', {
        toAccountId: analystAccount.accountId, role: 'analyst', amount: analystPrice, txId,
      }, releaseRecord.timestamp));
    }

    if (review.architectApproved) {
      const txId = await escrowRelease(this.ctx, escrowAccount, tokenId, architectAccount, architectPrice);
      totalReleased += architectPrice;
      const releasePayload = JSON.stringify({
        type: 'escrow_release', requestId, sender: 'server',
        toAccountId: architectAccount.accountId, role: 'architect', amount: architectPrice, txId,
        timestamp: new Date().toISOString(),
      });
      const releaseRecord = await submitMessage(this.ctx, topicId, releasePayload);
      emit('hcs_message', this.formatHcsEvent(releaseRecord.sequenceNumber, 'escrow_release', 'server', 'server', {
        toAccountId: architectAccount.accountId, role: 'architect', amount: architectPrice, txId,
      }, releaseRecord.timestamp));
    }

    emit('escrow_update', { locked: budget, released: totalReleased, remaining: budget - totalReleased });

    // 잔액 조회
    emit('log', { icon: '⏳', msg: '잔액 반영 대기 (6초)...' });
    await delay(6000);

    const [analystBal, architectBal, scholarBal, escrowBal] = await Promise.all([
      getTokenBalance(analystAccount.accountId, tokenId),
      getTokenBalance(architectAccount.accountId, tokenId),
      getTokenBalance(infra.scholarAccount.accountId, tokenId),
      getTokenBalance(escrowAccount.accountId, tokenId),
    ]);
    emit('balance', { analyst: analystBal, architect: architectBal, scholar: scholarBal, escrow: escrowBal });

    // ── Step 8: 코스 완성 ──
    this.transition('COMPLETE', emit);
    emit('step', { step: 7, title: 'Course Complete' });

    const completePayload = JSON.stringify({
      type: 'course_complete',
      requestId,
      sender: 'server',
      courseTitle: `Course from: ${paperUrl}`,
      modules: [],
      timestamp: new Date().toISOString(),
    });
    const completeRecord = await submitMessage(this.ctx, topicId, completePayload);
    emit('hcs_message', this.formatHcsEvent(completeRecord.sequenceNumber, 'course_complete', 'server', 'server', {
      courseTitle: `Course from: ${paperUrl}`,
    }, completeRecord.timestamp));

    emit('agent_status', { role: 'analyst', status: 'done', statusText: 'Done' });
    emit('agent_status', { role: 'architect', status: 'done', statusText: 'Done' });
  }

  // ── 상태 전이 ──

  private transition(newState: MarketplaceState, emit: SSEEmitter): void {
    this.state = newState;
    if (this.session) this.session.state = newState;
    emit('marketplace_state', { state: newState });
  }

  // ── SSE 이벤트 포맷 헬퍼 ──

  private formatHcsEvent(
    seq: number,
    type: string,
    sender: string,
    senderRole: string,
    payload: Record<string, unknown>,
    timestamp: string,
  ): Record<string, unknown> {
    return { seq, type, sender, senderRole, payload, timestamp };
  }

  // ── ERC-8004: Identity Registry 에이전트 등록 ──

  private async registerERC8004Agents(
    infra: MarketplaceInfra,
    emit: SSEEmitter,
  ): Promise<void> {
    if (!this.erc8004.isAvailable()) return;

    const roles = [
      { role: 'analyst' as const, account: infra.analystAccount },
      { role: 'architect' as const, account: infra.architectAccount },
      { role: 'scholar' as const, account: infra.scholarAccount },
    ];

    const registrations: Partial<NonNullable<MarketplaceInfra['erc8004']>> = {};

    for (const { role, account } of roles) {
      try {
        const result = await this.erc8004.registerAgent(
          `marketplace-${role}`,
          account.accountId,
          role,
        );
        if (result) {
          registrations[role] = result;
          emit('reputation', {
            event: 'registered',
            role,
            agentId: result.agentId,
            txHash: result.txHash,
            etherscanUrl: result.etherscanUrl,
          });
          emit('log', { icon: '🔗', msg: `ERC-8004: ${role} 등록 완료 (ID: ${result.agentId})` });
        }
      } catch (err: any) {
        emit('log', { icon: '⚠️', msg: `ERC-8004 ${role} 등록 실패 (계속 진행): ${err.message}` });
      }
    }

    if (registrations.analyst && registrations.architect && registrations.scholar) {
      infra.erc8004 = registrations as NonNullable<MarketplaceInfra['erc8004']>;
    }
  }

  // ── ERC-8004: Reputation Registry 평판 기록 (의뢰인 리뷰 점수 기반) ──

  private async recordERC8004Reputation(
    infra: MarketplaceInfra,
    requestId: string,
    reviews: { role: 'analyst' | 'architect'; score: number; feedback: string }[],
    emit: SSEEmitter,
  ): Promise<void> {
    if (!this.erc8004.isAvailable() || !infra.erc8004) return;

    for (const review of reviews) {
      const agentInfo = infra.erc8004[review.role];
      if (!agentInfo) continue;

      try {
        const result = await this.erc8004.recordReputation(
          agentInfo.agentId,
          review.score,
          review.feedback,
          { requestId, role: review.role },
        );
        if (result) {
          emit('reputation', {
            event: 'feedback_recorded',
            role: review.role,
            agentId: agentInfo.agentId,
            score: review.score,
            txHash: result.txHash,
            etherscanUrl: result.etherscanUrl,
          });
          emit('log', { icon: '🔗', msg: `ERC-8004: ${review.role} 평판 기록 완료 (score: ${review.score})` });
        }
      } catch (err: any) {
        emit('log', { icon: '⚠️', msg: `ERC-8004 ${review.role} 평판 기록 실패 (계속 진행): ${err.message}` });
      }
    }
  }
}
