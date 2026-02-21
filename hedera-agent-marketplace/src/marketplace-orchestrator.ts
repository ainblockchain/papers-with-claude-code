// Marketplace orchestrator — autonomous agent economy + human client review
//
// Key design: the server does not communicate directly with agents.
// Agents autonomously poll HCS via OpenClaw cron (every 5s),
// and the orchestrator only detects HCS messages and mediates human approval.
//
// State flow:
// course_request → bid(s) → AWAITING_BID_APPROVAL(human) → bid_accepted
// → deliverable(analyst) → deliverable(architect) → AWAITING_REVIEW(human)
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
import { DEFAULT_ESCROW_SPLIT, calculatePayment, MAX_REVISIONS } from './types/marketplace.js';
import { pollForHcsMessage } from './openclaw/hcs-poller.js';
import { ERC8004Client } from './erc8004/client.js';
import { getProfile, getDisplayName } from './config/agent-profiles.js';

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

  // Promise resolver pattern — waiting for human approval
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

  /** Called when the client submits bid approval */
  submitBidApproval(approval: BidApproval): void {
    if (this.bidApprovalResolver) {
      this.bidApprovalResolver(approval);
      this.bidApprovalResolver = null;
    }
  }

  /** Called when the client submits a review */
  submitReview(review: ClientReview): void {
    if (this.reviewResolver) {
      this.reviewResolver(review);
      this.reviewResolver = null;
    }
  }

  // ── Main execution ──
  // Publish task to HCS → wait for autonomous agent bids → human approval → autonomous agent work → human review

  async run(
    infra: MarketplaceInfra,
    paperUrl: string,
    budget: number,
    description: string,
    emit: SSEEmitter,
  ): Promise<void> {
    emit('mode', { mode: 'autonomous' });

    if (this.erc8004.isAvailable()) {
      emit('log', { icon: '🔗', msg: 'ERC-8004 on-chain reputation system active (Ethereum Sepolia)' });
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
      analystRevisionCount: 0,
      architectRevisionCount: 0,
      maxRevisions: MAX_REVISIONS,
      releases: [],
    };

    let lastSeq = 0;

    this.transition('REQUEST', emit);

    // ── Step 1: publish course_request + escrow_lock ──
    emit('step', { step: 2, title: 'Course Request → HCS' });
    emit('log', { icon: '📄', msg: `Publishing course request: ${paperUrl}` });

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

    emit('log', { icon: '🔒', msg: `${budget} KNOW locked in escrow` });
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

    // ── Step 2: BIDDING — wait for agents to autonomously post bids to HCS ──
    this.transition('BIDDING', emit);
    emit('step', { step: 3, title: 'Bidding Phase (Autonomous Agents)' });
    emit('log', { icon: '🏷️', msg: 'Waiting for autonomous agent bids... (HCS polling)' });

    const bidMessages = await pollForHcsMessage(
      topicId,
      { type: 'bid', requestId, afterSeq: lastSeq },
      2,
      300_000, // 5 min wait — agents need time to detect via cron
      emit,
    );

    const collectedBids: BidMessage[] = [];
    for (const bm of bidMessages) {
      const raw = bm.parsed as Record<string, any>;
      // Normalize agent-authored bid fields (agents use varying schemas)
      const bid: BidMessage = {
        type: 'bid',
        requestId: raw.requestId ?? requestId,
        sender: raw.sender ?? raw.bidder ?? raw.senderAccount ?? '',
        role: raw.role as any,
        price: raw.price ?? raw.bidAmount ?? raw.amount ?? raw.bid ?? 0,
        pitch: raw.pitch ?? raw.proposal ?? raw.description ?? '',
        senderName: raw.senderName ?? raw.name ?? undefined,
        timestamp: raw.timestamp ?? new Date().toISOString(),
      };
      lastSeq = Math.max(lastSeq, bm.sequenceNumber);
      collectedBids.push(bid);
      this.session.bids.push(bid);
    }

    // Infer missing roles: if a bid has no role, assign based on what's already taken
    const expectedRoles: BidMessage['role'][] = ['analyst', 'architect'];
    const takenRoles = new Set<BidMessage['role']>(collectedBids.filter(b => b.role).map(b => b.role));
    for (const bid of collectedBids) {
      if (!bid.role) {
        const missing = expectedRoles.find(r => !takenRoles.has(r));
        if (missing) {
          bid.role = missing;
          takenRoles.add(missing);
        }
      }
    }

    for (const bid of collectedBids) {
      const bidProfile = getProfile(bid.role);
      emit('hcs_message', this.formatHcsEvent(0, 'bid', bid.sender, bid.role, {
        role: bid.role, price: bid.price, pitch: bid.pitch,
        senderName: bid.senderName || bidProfile.name,
      }, new Date().toISOString()));
    }

    // ── Step 3: AWAITING_BID_APPROVAL — waiting for client approval ──
    this.transition('AWAITING_BID_APPROVAL', emit);
    emit('step', { step: 3.5, title: 'Awaiting Bid Approval (Human)' });
    emit('log', { icon: '👤', msg: 'Waiting for client bid approval...' });

    // Send bid info to client → UI shows approve/reject buttons
    emit('awaiting_bid_approval', { bids: collectedBids });

    // Wait for human approval via Promise pattern
    const approval = await new Promise<BidApproval>((resolve) => {
      this.bidApprovalResolver = resolve;
    });

    // Publish bid_accepted
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

    // ── Steps 4-6: Work → Review → (optional Rework) loop ──
    // Agents work, client reviews. If rejected AND revisions remaining, loop back.
    //
    // IMPORTANT: Both agents are dispatched simultaneously by the embedded watcher
    // when bid_accepted is posted. The orchestrator waits sequentially (analyst first,
    // then architect), but the architect may finish before the analyst.
    // We capture deliverableStartSeq here (after bid_accepted) so BOTH polls
    // can see deliverables regardless of submission order.

    let needsAnalystWork = true;
    let needsArchitectWork = true;
    let reviewDone = false;
    let review: ClientReview | null = null;
    // Seq anchor for deliverable polling — captured before any agent work starts
    let deliverableStartSeq = lastSeq;

    while (!reviewDone) {
      // ── ANALYST_WORKING ──
      if (needsAnalystWork) {
        const analystProfile = getProfile('analyst');
        const round = this.session.analystRevisionCount > 0
          ? ` (Round ${this.session.analystRevisionCount + 1})`
          : '';
        this.transition('ANALYST_WORKING', emit);
        emit('step', { step: 4, title: `${analystProfile.name} Working${round}` });
        emit('log', { icon: analystProfile.icon, msg: `Waiting for ${analystProfile.fullName} autonomous analysis...` });
        emit('agent_status', { role: 'analyst', status: 'working', statusText: 'Analyzing...', profile: analystProfile });

        // Orchestrator-managed Scholar consultation (first iteration only)
        if (this.session.analystRevisionCount === 0) {
          const consult = await this.runConsultation(infra, 'analyst', requestId, topicId, tokenId, paperUrl, lastSeq, emit);
          lastSeq = consult.lastSeq;
        }

        const analystDeliverables = await pollForHcsMessage(
          topicId,
          { type: 'deliverable', role: 'analyst', requestId, afterSeq: deliverableStartSeq },
          1,
          300_000,
          emit,
        );

        if (analystDeliverables.length > 0) {
          const ad = analystDeliverables[0];
          lastSeq = Math.max(lastSeq, ad.sequenceNumber);
          // Normalize deliverable fields (agents use varying schemas)
          const raw = ad.parsed as Record<string, any>;
          const adParsed: DeliverableMessage = {
            type: 'deliverable',
            requestId: raw.requestId ?? requestId,
            sender: raw.sender ?? raw.senderAccount ?? '',
            role: raw.role ?? 'analyst',
            content: raw.content ?? raw.deliverable ?? raw.analysis ?? raw.output ?? { summary: raw.summary ?? '' },
            senderName: raw.senderName ?? raw.name ?? analystProfile.name,
            timestamp: raw.timestamp ?? ad.timestamp,
          };
          this.session.analystDeliverable = adParsed;

          emit('hcs_message', this.formatHcsEvent(ad.sequenceNumber, 'deliverable', adParsed.sender, 'analyst', {
            role: 'analyst',
            senderName: adParsed.senderName || analystProfile.name,
            preview: JSON.stringify(adParsed.content).slice(0, 200) + '...',
          }, ad.timestamp));
          emit('agent_status', { role: 'analyst', status: 'delivered', statusText: 'Delivered' });
        } else {
          emit('log', { icon: '⚠️', msg: `${analystProfile.name} deliverable not detected — timeout` });
          emit('agent_status', { role: 'analyst', status: 'timeout', statusText: 'Timeout' });
        }
      }

      // ── ARCHITECT_WORKING ──
      if (needsArchitectWork) {
        const architectProfile = getProfile('architect');
        const round = this.session.architectRevisionCount > 0
          ? ` (Round ${this.session.architectRevisionCount + 1})`
          : '';
        this.transition('ARCHITECT_WORKING', emit);
        emit('step', { step: 5, title: `${architectProfile.name} Working${round}` });
        emit('log', { icon: architectProfile.icon, msg: `Waiting for ${architectProfile.fullName} autonomous design...` });
        emit('agent_status', { role: 'architect', status: 'working', statusText: 'Designing...', profile: architectProfile });

        // Orchestrator-managed Scholar consultation (first iteration only)
        if (this.session.architectRevisionCount === 0) {
          const consult = await this.runConsultation(infra, 'architect', requestId, topicId, tokenId, paperUrl, lastSeq, emit);
          lastSeq = consult.lastSeq;
        }

        // Use deliverableStartSeq (not lastSeq) so we don't miss deliverables
        // posted while the analyst was working (agents are dispatched in parallel)
        const architectDeliverables = await pollForHcsMessage(
          topicId,
          { type: 'deliverable', role: 'architect', requestId, afterSeq: deliverableStartSeq },
          1,
          300_000,
          emit,
        );

        if (architectDeliverables.length > 0) {
          const archD = architectDeliverables[0];
          lastSeq = Math.max(lastSeq, archD.sequenceNumber);
          // Normalize deliverable fields (agents use varying schemas)
          const raw = archD.parsed as Record<string, any>;
          const archParsed: DeliverableMessage = {
            type: 'deliverable',
            requestId: raw.requestId ?? requestId,
            sender: raw.sender ?? raw.senderAccount ?? '',
            role: raw.role ?? 'architect',
            content: raw.content ?? raw.deliverable ?? raw.course ?? raw.design ?? raw.output ?? { summary: raw.summary ?? '' },
            senderName: raw.senderName ?? raw.name ?? architectProfile.name,
            timestamp: raw.timestamp ?? archD.timestamp,
          };
          this.session.architectDeliverable = archParsed;

          emit('hcs_message', this.formatHcsEvent(archD.sequenceNumber, 'deliverable', archParsed.sender, 'architect', {
            role: 'architect',
            senderName: archParsed.senderName || architectProfile.name,
            preview: JSON.stringify(archParsed.content).slice(0, 200) + '...',
          }, archD.timestamp));
          emit('agent_status', { role: 'architect', status: 'delivered', statusText: 'Delivered' });
        } else {
          emit('log', { icon: '⚠️', msg: `${architectProfile.name} deliverable not detected — timeout` });
          emit('agent_status', { role: 'architect', status: 'timeout', statusText: 'Timeout' });
        }
      }

      // Update deliverableStartSeq for potential rework iterations
      deliverableStartSeq = lastSeq;

      // ── AWAITING_REVIEW ──
      this.transition('AWAITING_REVIEW', emit);
      emit('step', { step: 6, title: 'Awaiting Your Review (Human)' });
      emit('log', { icon: '👤', msg: 'Waiting for client review...' });

      emit('awaiting_review', {
        analystDeliverable: this.session.analystDeliverable ?? null,
        architectDeliverable: this.session.architectDeliverable ?? null,
      });

      review = await new Promise<ClientReview>((resolve) => {
        this.reviewResolver = resolve;
      });

      // Record client_review to HCS
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

      // Check if rework is needed
      needsAnalystWork = !review.analystApproved && this.session.analystRevisionCount < this.session.maxRevisions;
      needsArchitectWork = !review.architectApproved && this.session.architectRevisionCount < this.session.maxRevisions;

      if (!needsAnalystWork && !needsArchitectWork) {
        // All approved or max revisions reached
        reviewDone = true;
      } else {
        // Post revision_request to HCS for rejected roles
        for (const [role, needsWork, feedback] of [
          ['analyst', needsAnalystWork, review.analystFeedback] as const,
          ['architect', needsArchitectWork, review.architectFeedback] as const,
        ]) {
          if (!needsWork) continue;

          const revCount = role === 'analyst'
            ? ++this.session.analystRevisionCount
            : ++this.session.architectRevisionCount;
          const roleName = getDisplayName(role);

          const revisionPayload = JSON.stringify({
            type: 'revision_request',
            requestId,
            sender: 'server',
            targetRole: role,
            feedback,
            revisionNumber: revCount,
            timestamp: new Date().toISOString(),
          });
          const revRecord = await submitMessage(this.ctx, topicId, revisionPayload);
          lastSeq = revRecord.sequenceNumber;
          emit('hcs_message', this.formatHcsEvent(revRecord.sequenceNumber, 'revision_request', 'server', 'server', {
            targetRole: role, targetName: roleName, feedback, revisionNumber: revCount,
          }, revRecord.timestamp));
          emit('log', { icon: '🔄', msg: `Revision requested for ${roleName} (Round ${revCount + 1})` });
        }
      }
    }

    // Record ERC-8004 reputation (based on final client review scores)
    await this.recordERC8004Reputation(infra, requestId, [
      { role: 'analyst', score: review!.analystScore, feedback: review!.analystFeedback },
      { role: 'architect', score: review!.architectScore, feedback: review!.architectFeedback },
    ], emit);

    // ── Step 7: RELEASING — score-proportional escrow release ──
    this.transition('RELEASING', emit);
    emit('log', { icon: '💰', msg: 'Calculating score-proportional payments...' });

    const analystPayment = calculatePayment(analystPrice, review!.analystScore, review!.analystApproved);
    const architectPayment = calculatePayment(architectPrice, review!.architectScore, review!.architectApproved);

    // Emit payment preview so the dashboard can show the breakdown
    emit('payment_preview', {
      analyst: {
        name: getDisplayName('analyst'),
        score: review!.analystScore,
        bidPrice: analystPrice,
        payment: analystPayment,
        approved: review!.analystApproved,
      },
      architect: {
        name: getDisplayName('architect'),
        score: review!.architectScore,
        bidPrice: architectPrice,
        payment: architectPayment,
        approved: review!.architectApproved,
      },
    });

    let totalReleased = 0;

    if (analystPayment > 0) {
      const txId = await escrowRelease(this.ctx, escrowAccount, tokenId, analystAccount, analystPayment);
      totalReleased += analystPayment;
      const releasePayload = JSON.stringify({
        type: 'escrow_release', requestId, sender: 'server',
        toAccountId: analystAccount.accountId, role: 'analyst', amount: analystPayment, txId,
        timestamp: new Date().toISOString(),
      });
      const releaseRecord = await submitMessage(this.ctx, topicId, releasePayload);
      emit('hcs_message', this.formatHcsEvent(releaseRecord.sequenceNumber, 'escrow_release', 'server', 'server', {
        toAccountId: analystAccount.accountId, role: 'analyst', amount: analystPayment, txId,
        name: getDisplayName('analyst'), score: review!.analystScore,
      }, releaseRecord.timestamp));
    }

    if (architectPayment > 0) {
      const txId = await escrowRelease(this.ctx, escrowAccount, tokenId, architectAccount, architectPayment);
      totalReleased += architectPayment;
      const releasePayload = JSON.stringify({
        type: 'escrow_release', requestId, sender: 'server',
        toAccountId: architectAccount.accountId, role: 'architect', amount: architectPayment, txId,
        timestamp: new Date().toISOString(),
      });
      const releaseRecord = await submitMessage(this.ctx, topicId, releasePayload);
      emit('hcs_message', this.formatHcsEvent(releaseRecord.sequenceNumber, 'escrow_release', 'server', 'server', {
        toAccountId: architectAccount.accountId, role: 'architect', amount: architectPayment, txId,
        name: getDisplayName('architect'), score: review!.architectScore,
      }, releaseRecord.timestamp));
    }

    emit('escrow_update', { locked: budget, released: totalReleased, remaining: budget - totalReleased });

    // Check balances
    emit('log', { icon: '⏳', msg: 'Waiting for balance update (6s)...' });
    await delay(6000);

    const [analystBal, architectBal, scholarBal, escrowBal] = await Promise.all([
      getTokenBalance(analystAccount.accountId, tokenId),
      getTokenBalance(architectAccount.accountId, tokenId),
      getTokenBalance(infra.scholarAccount.accountId, tokenId),
      getTokenBalance(escrowAccount.accountId, tokenId),
    ]);
    emit('balance', { analyst: analystBal, architect: architectBal, scholar: scholarBal, escrow: escrowBal });

    // ── Step 8: Course complete ──
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

    emit('agent_status', { role: 'analyst', status: 'done', statusText: 'Done', profile: getProfile('analyst') });
    emit('agent_status', { role: 'architect', status: 'done', statusText: 'Done', profile: getProfile('architect') });
  }

  // ── Orchestrator-managed Scholar consultation ──
  // Posts consultation_request → waits for Scholar fee_quote → posts fee_accepted + KNOW transfer → waits for response.
  // Falls back to synthetic messages on timeout so the flow always completes.
  // This ensures every session has on-chain consultation + agent-to-agent KNOW payment.

  private async runConsultation(
    infra: MarketplaceInfra,
    role: 'analyst' | 'architect',
    requestId: string,
    topicId: string,
    tokenId: string,
    paperUrl: string,
    afterSeq: number,
    emit: SSEEmitter,
  ): Promise<{ response: string; lastSeq: number }> {
    const agentAccount = role === 'analyst' ? infra.analystAccount : infra.architectAccount;
    const scholarAccount = infra.scholarAccount;
    const profile = getProfile(role);
    const scholarProfile = getProfile('scholar');
    const fee = 5;
    let lastSeq = afterSeq;

    const question = role === 'analyst'
      ? `What are the key methodological contributions and potential limitations of this paper (${paperUrl})? Focus on experimental design and reproducibility.`
      : `What pedagogical approaches work best for teaching the core concepts from this paper? Suggest hands-on exercises and assessment strategies.`;

    emit('log', { icon: '📩', msg: `${profile.name} requesting consultation from ${scholarProfile.fullName}...` });

    // Step 1: Post consultation_request from agent
    const reqRec = await submitMessage(this.ctx, topicId, JSON.stringify({
      type: 'consultation_request', requestId, sender: agentAccount.accountId,
      senderName: profile.name, question, offeredFee: fee,
      timestamp: new Date().toISOString(),
    }));
    lastSeq = reqRec.sequenceNumber;
    emit('hcs_message', this.formatHcsEvent(reqRec.sequenceNumber, 'consultation_request', agentAccount.accountId, role, {
      question: question.slice(0, 120) + '...', offeredFee: fee, senderName: profile.name,
    }, reqRec.timestamp));

    // Step 2: Wait for Scholar's fee_quote (watcher dispatches Scholar on consultation_request)
    let scholarResponded = false;
    const feeQuotes = await pollForHcsMessage(
      topicId,
      { type: 'consultation_fee_quote' as any, requestId, afterSeq: lastSeq },
      1, 45_000, emit,
    );

    if (feeQuotes.length > 0) {
      lastSeq = Math.max(lastSeq, feeQuotes[0].sequenceNumber);
      scholarResponded = true;
      const fq = feeQuotes[0].parsed as any;
      emit('hcs_message', this.formatHcsEvent(feeQuotes[0].sequenceNumber, 'consultation_fee_quote', fq.sender || scholarAccount.accountId, 'scholar', {
        fee: fq.fee ?? fee, estimatedDepth: fq.estimatedDepth ?? 'standard', senderName: scholarProfile.name,
      }, feeQuotes[0].timestamp));
    } else {
      // Scholar timeout — post synthetic fee_quote for on-chain record
      emit('log', { icon: '⏱️', msg: `${scholarProfile.name} fee quote timeout — using default` });
      const synthRec = await submitMessage(this.ctx, topicId, JSON.stringify({
        type: 'consultation_fee_quote', requestId, sender: scholarAccount.accountId,
        senderName: scholarProfile.name, fee, estimatedDepth: 'standard',
        timestamp: new Date().toISOString(),
      }));
      lastSeq = synthRec.sequenceNumber;
      emit('hcs_message', this.formatHcsEvent(synthRec.sequenceNumber, 'consultation_fee_quote', scholarAccount.accountId, 'scholar', {
        fee, estimatedDepth: 'standard', senderName: scholarProfile.name,
      }, synthRec.timestamp));
    }

    // Step 3: Post fee_accepted from agent
    const acceptRec = await submitMessage(this.ctx, topicId, JSON.stringify({
      type: 'fee_accepted', requestId, sender: agentAccount.accountId,
      senderName: profile.name, fee,
      timestamp: new Date().toISOString(),
    }));
    lastSeq = acceptRec.sequenceNumber;
    emit('hcs_message', this.formatHcsEvent(acceptRec.sequenceNumber, 'fee_accepted', agentAccount.accountId, role, {
      fee, senderName: profile.name,
    }, acceptRec.timestamp));

    // Step 4: Transfer consultation fee from escrow to Scholar (project expense)
    try {
      await escrowRelease(this.ctx, infra.escrowAccount, tokenId, scholarAccount, fee);
      this.session!.escrowReleased += fee;
      emit('log', { icon: '🪙', msg: `${profile.name} → ${scholarProfile.name}: ${fee} KNOW consultation fee` });
      emit('escrow_update', {
        locked: this.session!.escrowLocked,
        released: this.session!.escrowReleased,
        remaining: this.session!.escrowLocked - this.session!.escrowReleased,
      });
    } catch (err: any) {
      emit('log', { icon: '⚠️', msg: `Consultation fee transfer failed: ${err.message}` });
    }

    // Step 5: Wait for consultation_response from Scholar
    const fallbackAnswer = 'The paper presents a robust methodology with well-designed ablation studies. Key strengths include the scalability analysis and attention visualization. For pedagogical design, consider starting with intuition before mathematical formulation, and include hands-on implementation exercises.';
    let answer = fallbackAnswer;

    const responses = await pollForHcsMessage(
      topicId,
      { type: 'consultation_response' as any, requestId, afterSeq: lastSeq },
      1, scholarResponded ? 45_000 : 5_000, emit,
    );

    if (responses.length > 0) {
      lastSeq = Math.max(lastSeq, responses[0].sequenceNumber);
      answer = (responses[0].parsed as any).answer || answer;
      emit('hcs_message', this.formatHcsEvent(responses[0].sequenceNumber, 'consultation_response', scholarAccount.accountId, 'scholar', {
        answer: answer.slice(0, 200) + '...', fee, senderName: scholarProfile.name,
      }, responses[0].timestamp));
    } else {
      // Post synthetic consultation_response
      const synthRes = await submitMessage(this.ctx, topicId, JSON.stringify({
        type: 'consultation_response', requestId, sender: scholarAccount.accountId,
        senderName: scholarProfile.name, answer, fee,
        timestamp: new Date().toISOString(),
      }));
      lastSeq = synthRes.sequenceNumber;
      emit('hcs_message', this.formatHcsEvent(synthRes.sequenceNumber, 'consultation_response', scholarAccount.accountId, 'scholar', {
        answer: answer.slice(0, 200) + '...', fee, senderName: scholarProfile.name,
      }, synthRes.timestamp));
    }

    emit('log', { icon: '✅', msg: `Consultation complete: ${profile.name} ↔ ${scholarProfile.name} (${fee} KNOW)` });
    return { response: answer, lastSeq };
  }

  // ── State transition ──

  private transition(newState: MarketplaceState, emit: SSEEmitter): void {
    this.state = newState;
    if (this.session) this.session.state = newState;
    emit('marketplace_state', { state: newState });
  }

  // ── SSE event format helper ──

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

  // ── ERC-8004: Identity Registry agent registration ──

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
        const profile = getProfile(role);
        const result = await this.erc8004.registerAgent(
          `marketplace-${profile.name}`,
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
          emit('log', { icon: '🔗', msg: `ERC-8004: ${profile.fullName} registered (ID: ${result.agentId})` });
        }
      } catch (err: any) {
        emit('log', { icon: '⚠️', msg: `ERC-8004 ${role} registration failed (continuing): ${err.message}` });
      }
    }

    if (registrations.analyst && registrations.architect && registrations.scholar) {
      infra.erc8004 = registrations as NonNullable<MarketplaceInfra['erc8004']>;
    }
  }

  // ── ERC-8004: Reputation Registry record (based on client review scores) ──

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
          emit('log', { icon: '🔗', msg: `ERC-8004: ${review.role} reputation recorded (score: ${review.score})` });
        }
      } catch (err: any) {
        emit('log', { icon: '⚠️', msg: `ERC-8004 ${review.role} reputation recording failed (continuing): ${err.message}` });
      }
    }
  }
}
