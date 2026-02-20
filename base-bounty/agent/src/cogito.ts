import { EventEmitter } from 'events';
import Ain, { AinInstance } from './ain-import.js';
import { AgentConfig } from './config.js';
import { ThinkResult, Strategy } from './types.js';
import { startX402Server } from './server/x402-server.js';
import { AlignmentEngine } from './alignment.js';
import { RevenueTracker } from './revenue-tracker.js';
import { CourseBuilder } from './course-builder.js';
import { PeerClient } from './peer-client.js';
import { AgentIdentity } from './base-chain/identity.js';
import { BaseWallet } from './base-chain/wallet.js';
import { buildAuthorCodes } from './base-chain/builder-codes.js';
import { fetchPapers, fetchRecentPapers, buildPaperContext, suggestSubtopic, Paper } from './paper-source.js';

const SEED_TOPICS = [
  { path: 'ai/transformers', title: 'Transformer Architecture', description: 'Neural network architecture based on self-attention mechanism' },
  { path: 'ai/reinforcement-learning', title: 'Reinforcement Learning', description: 'Learning paradigm through environment interaction and rewards' },
  { path: 'ai/state-space-models', title: 'State-Space Models', description: 'Sequence modeling via continuous-time state spaces (S4, Mamba)' },
  { path: 'ai/multimodal', title: 'Multimodal AI', description: 'Models that reason across vision, language, and other modalities' },
  { path: 'ai/alignment', title: 'AI Alignment', description: 'Methods for aligning AI systems with human values (RLHF, DPO)' },
  { path: 'ai/agents', title: 'AI Agents', description: 'Autonomous LLM-based agents with tool use and planning' },
  { path: 'crypto/consensus', title: 'Consensus Mechanisms', description: 'Distributed agreement protocols for blockchain networks' },
  { path: 'crypto/zk', title: 'Zero-Knowledge Proofs', description: 'Cryptographic proofs that reveal nothing beyond statement validity' },
];

// Auto-generate course after this many explorations on a topic
const COURSE_THRESHOLD = 3;

export class CogitoNode {
  private config: AgentConfig;
  private ain: AinInstance;
  private address: string = '';
  private loopTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private thinkCount = 0;

  // Sub-modules
  private alignment: AlignmentEngine | null = null;
  private revenue: RevenueTracker;
  private courseBuilder: CourseBuilder | null = null;
  private peerClient: PeerClient | null = null;
  private identity: AgentIdentity | null = null;
  private baseWallet: BaseWallet | null = null;

  // Track explorations per topic for course auto-generation
  private explorationCounts: Map<string, number> = new Map();
  private recentExplorations: ThinkResult[] = [];
  // Track explored papers to avoid re-exploring the same ones
  private exploredPaperIds: Set<string> = new Set();

  // Streaming events and user chat
  private emitter = new EventEmitter();
  private chatQueue: string[] = [];

  constructor(config: AgentConfig) {
    this.config = config;
    this.ain = config.ainWsUrl
      ? new Ain(config.ainProviderUrl, config.ainWsUrl)
      : new Ain(config.ainProviderUrl);
    this.revenue = new RevenueTracker();
    this.emitter.setMaxListeners(50);
  }

  async start(): Promise<void> {
    console.log(`[Cogito] Starting ${this.config.agentName}...`);

    // 1. Init AIN wallet
    this.address = this.ain.wallet.addAndSetDefaultAccount(this.config.ainPrivateKey);
    console.log(`[Cogito] AIN address: ${this.address}`);

    // 2. Init Base chain modules (same key — AIN and Base are both EVM-compatible)
    try {
      this.identity = new AgentIdentity(this.config.baseRpcUrl, this.config.ainPrivateKey);
      this.baseWallet = new BaseWallet(this.config.baseRpcUrl, this.config.ainPrivateKey);
      this.peerClient = new PeerClient(this.identity);
      console.log(`[Cogito] Base address: ${this.baseWallet.getAddress()} (same key as AIN)`);
    } catch (err: any) {
      console.log(`[Cogito] Base chain init skipped: ${err.message}`);
    }

    // 3. Init sub-modules that depend on ain
    this.courseBuilder = new CourseBuilder(this.ain);
    this.alignment = new AlignmentEngine(this.ain, this.address);

    // 4. Setup knowledge app (idempotent)
    try {
      await this.ain.knowledge.setupApp({ address: this.address });
      console.log('[Cogito] Knowledge app setup complete.');
    } catch (err: any) {
      console.log(`[Cogito] Knowledge app setup skipped (may already exist): ${err.message}`);
    }

    // 5. Register seed topics
    await this.registerSeedTopics();

    // 6. Start x402 server (runs persistently)
    try {
      await startX402Server({
        ain: this.ain,
        config: this.config,
        baseAddress: this.baseWallet?.getAddress() || '',
        getStatus: () => this.getStatus(),
        getEmitter: () => this.emitter,
        addChatMessage: (msg: string) => this.addChatMessage(msg),
      });
    } catch (err: any) {
      console.error(`[Cogito] x402 server failed to start: ${err.message}`);
    }

    // 7. Start alignment event listener
    try {
      await this.alignment.startListening();
    } catch (err: any) {
      console.log(`[Cogito] Alignment listener skipped: ${err.message}`);
    }

    // 8. Start autonomous loop
    this.running = true;
    console.log(`[Cogito] Autonomous loop starting (interval: ${this.config.thinkIntervalMs}ms)`);

    await this.runCycle();
    this.loopTimer = setInterval(() => this.runCycle(), this.config.thinkIntervalMs);
  }

  async stop(): Promise<void> {
    console.log('[Cogito] Stopping...');
    this.running = false;
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
    this.alignment?.stop();
    this.revenue.prune();
  }

  // ---------------------------------------------------------------------------
  // Autonomous cycle
  // ---------------------------------------------------------------------------

  private async runCycle(): Promise<void> {
    if (!this.running) return;

    const strategy = this.pickStrategy();
    const cycleNumber = this.thinkCount + 1;
    console.log(`[Cogito] Cycle #${cycleNumber} — strategy: ${strategy}`);
    this.emitter.emit('cycle_start', { strategy, cycleNumber });

    try {
      switch (strategy) {
        case 'explore':
          await this.think();
          break;
        case 'align':
          await this.align();
          break;
        case 'sustain':
          await this.sustain();
          break;
        case 'earn':
          // x402 server runs persistently; per-cycle we try course generation
          await this.tryCourseGeneration();
          break;
      }
    } catch (err: any) {
      console.error(`[Cogito] Cycle error: ${err.message}`);
      this.emitter.emit('thinking', { topic: 'error', message: `Cycle error: ${err.message}` });
    }

    this.emitter.emit('cycle_end', { strategy, cycleNumber });
    this.thinkCount++;
  }

  private pickStrategy(): Strategy {
    // Weighted round-robin: explore(60%), align(20%), earn(10%), sustain(10%)
    const cycle = this.thinkCount % 10;
    if (cycle < 6) return 'explore';
    if (cycle < 8) return 'align';
    if (cycle === 8) return 'earn';
    return 'sustain';
  }

  // ---------------------------------------------------------------------------
  // Think: explore research papers and write structured knowledge
  // ---------------------------------------------------------------------------

  async think(): Promise<ThinkResult | null> {
    // 0. Process any queued user chat messages
    const userMessages = this.chatQueue.splice(0);

    // 1. Pick target topic
    const targetTopic = await this.pickTopic();
    console.log(`[Cogito] Target topic: ${targetTopic}`);
    this.emitter.emit('thinking', { topic: targetTopic, message: `Picked topic: ${targetTopic}` });

    // 2. Fetch papers from arXiv for this topic
    let papers: Paper[] = [];
    try {
      // Alternate between seminal papers and recent ones
      const useRecent = this.thinkCount % 3 === 2;
      papers = useRecent
        ? await fetchRecentPapers(targetTopic, 5)
        : await fetchPapers(targetTopic, 5);

      // Filter out papers we've already explored
      papers = papers.filter(p => !this.exploredPaperIds.has(p.arxivId));

      if (papers.length > 0) {
        console.log(`[Cogito] Found ${papers.length} papers for "${targetTopic}":`);
        this.emitter.emit('thinking', { topic: targetTopic, message: `Found ${papers.length} papers from arXiv` });
        for (const p of papers.slice(0, 3)) {
          console.log(`  - ${p.title} (${p.authors[0]} et al., ${p.published.slice(0, 4)})`);
        }
      } else {
        console.log(`[Cogito] No new papers found for "${targetTopic}", exploring with general context`);
        this.emitter.emit('thinking', { topic: targetTopic, message: 'No new papers found, exploring with general context' });
      }
    } catch (err: any) {
      console.log(`[Cogito] arXiv fetch failed: ${err.message} — exploring without papers`);
      this.emitter.emit('thinking', { topic: targetTopic, message: `arXiv fetch failed: ${err.message}` });
    }

    // 3. Build rich context from papers + user messages
    let context = papers.length > 0
      ? buildPaperContext(papers, targetTopic)
      : `Explore the topic "${targetTopic}" in depth. Identify key concepts, seminal papers, and open research questions. Structure your exploration as a knowledge contribution.`;

    if (userMessages.length > 0) {
      const userContext = userMessages.map(m => `User suggests: ${m}`).join('\n');
      context = `${userContext}\n\n${context}`;
      this.emitter.emit('thinking', { topic: targetTopic, message: `Incorporating ${userMessages.length} user suggestion(s)` });
      for (const msg of userMessages) {
        this.emitter.emit('user_message_ack', { message: msg, response: 'Incorporated into exploration context' });
      }
    }

    // 4. Determine subtopic if papers suggest a more specific area
    let exploreTopic = targetTopic;
    if (papers.length > 0) {
      const suggested = suggestSubtopic(papers[0], targetTopic);
      if (suggested !== targetTopic) {
        exploreTopic = suggested;
        // Register the subtopic if new
        try {
          const info = await this.ain.knowledge.getTopicInfo(exploreTopic);
          if (!info) {
            await this.ain.knowledge.registerTopic(exploreTopic, {
              title: papers[0].title.split(':')[0].trim(),
              description: `Papers-driven exploration of ${suggested.split('/').pop()}`,
            });
            console.log(`[Cogito] Registered subtopic: ${exploreTopic}`);
          }
        } catch {
          // Topic may already exist or registration may fail
        }
      }
    }

    // 5. Record on Base with ERC-8021 builder codes (every few cycles)
    if (this.baseWallet && papers.length > 0 && this.thinkCount % 3 === 0) {
      await this.recordOnBase(papers, exploreTopic);
    }

    // 6. Call aiExplore with paper-grounded context
    console.log(`[Cogito] Exploring: ${exploreTopic}`);
    this.emitter.emit('thinking', { topic: exploreTopic, message: `Exploring: ${exploreTopic}` });
    let result: { entryId: string };
    try {
      result = await this.ain.knowledge.aiExplore(exploreTopic, {
        context,
        depth: this.pickDepth(exploreTopic),
      });
    } catch (err: any) {
      console.log(`[Cogito] aiExplore failed: ${err.message} — recording paper discovery only`);
      // Still track papers even if LLM exploration fails
      for (const p of papers) this.exploredPaperIds.add(p.arxivId);
      const count = (this.explorationCounts.get(exploreTopic) || 0) + 1;
      this.explorationCounts.set(exploreTopic, count);
      return {
        topicPath: exploreTopic,
        entryId: 'pending',
        title: papers.length > 0 ? papers[0].title : `Exploration of ${exploreTopic}`,
        depth: this.pickDepth(exploreTopic),
        paperRef: papers.length > 0 ? `${papers[0].authors[0]} et al., ${papers[0].published.slice(0, 4)} — ${papers[0].title}` : undefined,
      };
    }

    // 7. Mark papers as explored
    for (const p of papers) {
      this.exploredPaperIds.add(p.arxivId);
    }

    // 8. Track for course auto-generation
    const count = (this.explorationCounts.get(exploreTopic) || 0) + 1;
    this.explorationCounts.set(exploreTopic, count);

    const paperRef = papers.length > 0
      ? `${papers[0].authors[0]} et al., ${papers[0].published.slice(0, 4)} — ${papers[0].title}`
      : undefined;

    const thinkResult: ThinkResult = {
      topicPath: exploreTopic,
      entryId: result.entryId,
      title: papers.length > 0 ? papers[0].title : `Exploration of ${exploreTopic}`,
      depth: this.pickDepth(exploreTopic),
      paperRef,
    };

    console.log(`[Cogito] Exploration written: ${result.entryId} — "${thinkResult.title}"`);
    this.emitter.emit('exploration', {
      topicPath: thinkResult.topicPath,
      entryId: thinkResult.entryId,
      title: thinkResult.title,
      paperRef: thinkResult.paperRef,
    });

    // Keep last 10 explorations for status endpoint
    this.recentExplorations.unshift(thinkResult);
    if (this.recentExplorations.length > 10) this.recentExplorations.pop();

    return thinkResult;
  }

  /**
   * Record an exploration attestation on Base with ERC-8021 builder codes.
   * Sends a 0-value self-transfer with builder code attribution in calldata.
   */
  private async recordOnBase(papers: Paper[], topicPath: string): Promise<void> {
    if (!this.baseWallet) return;

    try {
      // Build author attributions from papers
      const authors = papers.length > 0 ? buildAuthorCodes(papers[0]) : [];

      // Encode topic as calldata prefix (0x + hex-encoded topic string)
      const topicHex = Buffer.from(`cogito:explore:${topicPath}`).toString('hex');

      const tx = await this.baseWallet.sendTransaction(
        {
          to: this.baseWallet.getAddress(), // self-transfer
          value: 0,
          data: '0x' + topicHex,
        },
        authors,
      );

      console.log(`[Cogito] Base tx recorded: ${tx.hash} (topic: ${topicPath}, codes: cogito_node${authors.length > 0 ? '+' + authors.length + ' authors' : ''})`);
      this.revenue.recordTransaction({
        txHash: tx.hash,
        timestamp: Date.now(),
        type: 'exploration',
        builderCodes: ['cogito_node', ...authors.map(a => `${a.type}_${a.identifier}`)],
      });
    } catch (err: any) {
      console.log(`[Cogito] Base tx failed: ${err.message}`);
    }
  }

  /**
   * Pick the best topic to explore next.
   * Prefers topics with gaps in the frontier, falls back to seed topics.
   */
  private async pickTopic(): Promise<string> {
    const frontierMap = await this.ain.knowledge.getFrontierMap();

    if (frontierMap.length === 0) {
      // No frontier yet — pick a seed topic we haven't explored much
      const leastExplored = SEED_TOPICS
        .map(s => ({ ...s, count: this.explorationCounts.get(s.path) || 0 }))
        .sort((a, b) => a.count - b.count);
      return leastExplored[0].path;
    }

    // Pick the topic with fewest explorers (most room for contribution)
    const sorted = [...frontierMap].sort((a, b) => {
      // Prefer topics with lower depth (less explored)
      const depthDiff = a.stats.avg_depth - b.stats.avg_depth;
      if (Math.abs(depthDiff) > 0.5) return depthDiff;
      // Then by explorer count (fewer = more opportunity)
      return a.stats.explorer_count - b.stats.explorer_count;
    });

    return sorted[0].topic;
  }

  /**
   * Pick exploration depth based on how much we've already explored a topic.
   */
  private pickDepth(topicPath: string): 1 | 2 | 3 | 4 | 5 {
    const count = this.explorationCounts.get(topicPath) || 0;
    if (count === 0) return 1;
    if (count < 3) return 2;
    if (count < 6) return 3;
    if (count < 10) return 4;
    return 5;
  }

  // ---------------------------------------------------------------------------
  // Align: cross-reference with peers
  // ---------------------------------------------------------------------------

  async align(): Promise<void> {
    console.log('[Cogito] Aligning with peer explorations...');
    this.emitter.emit('thinking', { topic: 'alignment', message: 'Aligning with peer explorations...' });

    // Try peer discovery via ERC-8004 registry
    if (this.peerClient) {
      try {
        const peers = await this.peerClient.discoverPeers();
        if (peers.length > 0) {
          console.log(`[Cogito] Discovered ${peers.length} peers via ERC-8004`);
          for (const peer of peers.slice(0, 2)) {
            try {
              const status = await this.peerClient.getPeerStatus(peer.endpoint);
              console.log(`[Cogito] Peer ${peer.name}: ${status.thinkCount || 0} cycles`);
            } catch {
              // Peer may be offline
            }
          }
        }
      } catch (err: any) {
        console.log(`[Cogito] Peer discovery skipped: ${err.message}`);
      }
    }

    // Cross-reference on-chain explorations
    const topics = await this.ain.knowledge.listTopics();
    for (const topic of topics.slice(0, 3)) {
      const explorers = await this.ain.knowledge.getExplorers(topic);
      const peers = explorers.filter((addr: string) => addr !== this.address);

      if (peers.length > 0) {
        console.log(`[Cogito] Found ${peers.length} on-chain peers on topic: ${topic}`);

        for (const peer of peers.slice(0, 2)) {
          const peerExplorations = await this.ain.knowledge.getExplorations(peer, topic);
          if (!peerExplorations) continue;

          const peerSummaries = Object.values(peerExplorations)
            .map((e: any) => `"${e.title}": ${e.summary}`)
            .join('\n');

          const analysis = await this.ain.llm.chat([
            { role: 'system', content: 'You are a knowledge alignment agent. Identify gaps and overlaps between your explorations and a peer\'s explorations. Suggest topics for future exploration that would complement both.' },
            { role: 'user', content: `Peer (${peer}) explored topic "${topic}" with:\n${peerSummaries}\n\nWhat gaps exist? What should I explore next?` },
          ]);

          console.log(`[Cogito] Alignment insight for ${topic}: ${analysis.substring(0, 100)}...`);
          this.emitter.emit('thinking', { topic, message: `Alignment insight: ${analysis.substring(0, 150)}` });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sustain: check financial health
  // ---------------------------------------------------------------------------

  async sustain(): Promise<void> {
    console.log('[Cogito] Checking sustainability...');
    this.emitter.emit('thinking', { topic: 'sustainability', message: 'Checking financial sustainability...' });

    const topics = await this.ain.knowledge.listTopics();
    const revenueSnapshot = this.revenue.getSnapshot();

    // Check Base USDC balance if wallet is available
    let usdcBalance = 0;
    let ethBalance = 0;
    if (this.baseWallet) {
      try {
        usdcBalance = await this.baseWallet.getUSDCBalance();
        ethBalance = await this.baseWallet.getETHBalance();
      } catch (err: any) {
        console.log(`[Cogito] Balance check failed: ${err.message}`);
      }
    }

    console.log(`[Cogito] Status: ${topics.length} topics, ${this.thinkCount} cycles`);
    console.log(`[Cogito] Revenue: income=$${revenueSnapshot.incomeLast24h.toFixed(4)}, cost=$${revenueSnapshot.costLast24h.toFixed(4)}, ratio=${revenueSnapshot.sustainabilityRatio}`);
    console.log(`[Cogito] Base wallet: ${usdcBalance.toFixed(2)} USDC, ${ethBalance.toFixed(4)} ETH`);
    this.emitter.emit('thinking', {
      topic: 'sustainability',
      message: `${topics.length} topics, ${usdcBalance.toFixed(2)} USDC, ratio: ${revenueSnapshot.sustainabilityRatio}`,
    });

    // Prune old revenue events
    this.revenue.prune();
  }

  // ---------------------------------------------------------------------------
  // Earn: auto-generate courses from accumulated explorations
  // ---------------------------------------------------------------------------

  private async tryCourseGeneration(): Promise<void> {
    if (!this.courseBuilder) return;

    for (const [topicPath, count] of this.explorationCounts) {
      if (count >= COURSE_THRESHOLD) {
        console.log(`[Cogito] Topic "${topicPath}" has ${count} explorations — generating course`);

        try {
          const stages = await this.courseBuilder.transformToCourse(topicPath);
          console.log(`[Cogito] Generated ${stages.length} course stages for "${topicPath}"`);

          // Reset count so we don't regenerate every cycle
          this.explorationCounts.set(topicPath, 0);
        } catch (err: any) {
          console.error(`[Cogito] Course generation failed for ${topicPath}: ${err.message}`);
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Status (exposed via x402 /status endpoint)
  // ---------------------------------------------------------------------------

  getStatus(): any {
    return {
      agentName: this.config.agentName,
      ainAddress: this.address,
      baseAddress: this.baseWallet?.getAddress() || null,
      thinkCount: this.thinkCount,
      running: this.running,
      explorationCounts: Object.fromEntries(this.explorationCounts),
      recentExplorations: this.recentExplorations,
      revenue: this.revenue.getSnapshot(),
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private async registerSeedTopics(): Promise<void> {
    for (const seed of SEED_TOPICS) {
      try {
        const existing = await this.ain.knowledge.getTopicInfo(seed.path);
        if (!existing) {
          await this.ain.knowledge.registerTopic(seed.path, {
            title: seed.title,
            description: seed.description,
          });
          console.log(`[Cogito] Registered topic: ${seed.path}`);
        }
      } catch (err: any) {
        console.log(`[Cogito] Topic registration skipped for ${seed.path}: ${err.message}`);
      }
    }
  }

  getAddress(): string { return this.address; }
  getAin(): AinInstance { return this.ain; }
  getThinkCount(): number { return this.thinkCount; }
  getRevenue(): RevenueTracker { return this.revenue; }
  getEmitter(): EventEmitter { return this.emitter; }

  addChatMessage(msg: string): number {
    this.chatQueue.push(msg);
    return this.chatQueue.length;
  }
}
