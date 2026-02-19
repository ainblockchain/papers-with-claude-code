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

const SEED_TOPICS = [
  { path: 'ai/transformers', title: 'Transformer Architecture', description: 'Neural network architecture based on self-attention mechanism' },
  { path: 'ai/reinforcement-learning', title: 'Reinforcement Learning', description: 'Learning paradigm through environment interaction and rewards' },
  { path: 'crypto/consensus', title: 'Consensus Mechanisms', description: 'Distributed agreement protocols for blockchain networks' },
  { path: 'crypto/defi', title: 'Decentralized Finance', description: 'Financial instruments built on blockchain technology' },
  { path: 'math/category-theory', title: 'Category Theory', description: 'Abstract mathematical theory of structures and relationships' },
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

  constructor(config: AgentConfig) {
    this.config = config;
    this.ain = config.ainWsUrl
      ? new Ain(config.ainProviderUrl, config.ainWsUrl)
      : new Ain(config.ainProviderUrl);
    this.revenue = new RevenueTracker();
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
    console.log(`[Cogito] Cycle #${this.thinkCount + 1} — strategy: ${strategy}`);

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
    }

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
  // Think: explore a topic via LLM
  // ---------------------------------------------------------------------------

  async think(): Promise<ThinkResult | null> {
    console.log('[Cogito] Thinking...');

    const frontierMap = await this.ain.knowledge.getFrontierMap();
    let targetTopic: string;

    if (frontierMap.length === 0) {
      const seed = SEED_TOPICS[Math.floor(Math.random() * SEED_TOPICS.length)];
      targetTopic = seed.path;
    } else {
      // Pick the topic with fewest explorations
      const sorted = [...frontierMap].sort((a, b) => a.stats.explorer_count - b.stats.explorer_count);
      targetTopic = sorted[0].topic;
    }

    console.log(`[Cogito] Exploring topic: ${targetTopic}`);

    const result = await this.ain.knowledge.aiExplore(targetTopic, {
      context: `Exploration by ${this.config.agentName}, cycle #${this.thinkCount + 1}`,
    });

    console.log(`[Cogito] Exploration written: entryId=${result.entryId}`);

    // Track for course auto-generation
    const count = (this.explorationCounts.get(targetTopic) || 0) + 1;
    this.explorationCounts.set(targetTopic, count);

    const thinkResult: ThinkResult = {
      topicPath: targetTopic,
      entryId: result.entryId,
      title: `Exploration of ${targetTopic}`,
      depth: 1,
    };

    // Keep last 10 explorations for status endpoint
    this.recentExplorations.unshift(thinkResult);
    if (this.recentExplorations.length > 10) this.recentExplorations.pop();

    return thinkResult;
  }

  // ---------------------------------------------------------------------------
  // Align: cross-reference with peers
  // ---------------------------------------------------------------------------

  async align(): Promise<void> {
    console.log('[Cogito] Aligning with peer explorations...');

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
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Sustain: check financial health
  // ---------------------------------------------------------------------------

  async sustain(): Promise<void> {
    console.log('[Cogito] Checking sustainability...');

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
}
