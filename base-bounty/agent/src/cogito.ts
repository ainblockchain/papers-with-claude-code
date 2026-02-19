import Ain from '@ainblockchain/ain-js';
import { AgentConfig, loadConfig } from './config.js';
import { ThinkResult, Strategy } from './types.js';

const SEED_TOPICS = [
  { path: 'ai/transformers', title: 'Transformer Architecture', description: 'Neural network architecture based on self-attention mechanism' },
  { path: 'ai/reinforcement-learning', title: 'Reinforcement Learning', description: 'Learning paradigm through environment interaction and rewards' },
  { path: 'crypto/consensus', title: 'Consensus Mechanisms', description: 'Distributed agreement protocols for blockchain networks' },
  { path: 'crypto/defi', title: 'Decentralized Finance', description: 'Financial instruments built on blockchain technology' },
  { path: 'math/category-theory', title: 'Category Theory', description: 'Abstract mathematical theory of structures and relationships' },
];

export class CogitoNode {
  private config: AgentConfig;
  private ain: Ain;
  private address: string = '';
  private loopTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private thinkCount = 0;

  constructor(config: AgentConfig) {
    this.config = config;
    this.ain = new Ain(config.ainProviderUrl, config.ainWsUrl);
  }

  async start(): Promise<void> {
    console.log(`[Cogito] Starting ${this.config.agentName}...`);

    // Init wallet
    this.address = this.ain.wallet.addAndSetDefaultAccount(this.config.ainPrivateKey);
    console.log(`[Cogito] Address: ${this.address}`);

    // Setup knowledge app (idempotent)
    try {
      await this.ain.knowledge.setupApp({ address: this.address });
      console.log('[Cogito] Knowledge app setup complete.');
    } catch (err: any) {
      console.log(`[Cogito] Knowledge app setup skipped (may already exist): ${err.message}`);
    }

    // Register seed topics
    await this.registerSeedTopics();

    this.running = true;
    console.log(`[Cogito] Autonomous loop starting (interval: ${this.config.thinkIntervalMs}ms)`);

    // Initial think
    await this.runCycle();

    // Start loop
    this.loopTimer = setInterval(() => this.runCycle(), this.config.thinkIntervalMs);
  }

  async stop(): Promise<void> {
    console.log('[Cogito] Stopping...');
    this.running = false;
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }
  }

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
          // x402 server runs persistently, nothing to do per-cycle
          break;
      }
    } catch (err: any) {
      console.error(`[Cogito] Cycle error: ${err.message}`);
    }

    this.thinkCount++;
  }

  private pickStrategy(): Strategy {
    // Simple round-robin weighted strategy
    const cycle = this.thinkCount % 5;
    if (cycle < 3) return 'explore'; // 60% explore
    if (cycle === 3) return 'align';  // 20% align
    return 'sustain';                  // 20% sustain
  }

  async think(): Promise<ThinkResult | null> {
    console.log('[Cogito] Thinking...');

    // Read frontier map to pick a topic
    const frontierMap = await this.ain.knowledge.getFrontierMap();
    let targetTopic: string;

    if (frontierMap.length === 0) {
      // Pick a random seed topic
      const seed = SEED_TOPICS[Math.floor(Math.random() * SEED_TOPICS.length)];
      targetTopic = seed.path;
    } else {
      // Pick the topic with fewest explorations (lowest explorer count)
      const sorted = [...frontierMap].sort((a, b) => a.stats.explorer_count - b.stats.explorer_count);
      targetTopic = sorted[0].topic;
    }

    console.log(`[Cogito] Exploring topic: ${targetTopic}`);

    // Use AI explore — generates content via LLM and writes to chain
    const result = await this.ain.knowledge.aiExplore(targetTopic, {
      context: `Exploration by ${this.config.agentName}, cycle #${this.thinkCount + 1}`,
    });

    console.log(`[Cogito] Exploration written: entryId=${result.entryId}`);

    return {
      topicPath: targetTopic,
      entryId: result.entryId,
      title: `Exploration of ${targetTopic}`,
      depth: 1,
    };
  }

  async align(): Promise<void> {
    console.log('[Cogito] Aligning with peer explorations...');

    // Get all topics and check for other explorers
    const topics = await this.ain.knowledge.listTopics();
    for (const topic of topics.slice(0, 3)) {
      const explorers = await this.ain.knowledge.getExplorers(topic);
      const peers = explorers.filter(addr => addr !== this.address);

      if (peers.length > 0) {
        console.log(`[Cogito] Found ${peers.length} peers on topic: ${topic}`);

        // Read peer explorations and cross-reference via LLM
        for (const peer of peers.slice(0, 2)) {
          const peerExplorations = await this.ain.knowledge.getExplorations(peer, topic);
          if (!peerExplorations) continue;

          const peerSummaries = Object.values(peerExplorations)
            .map(e => `"${e.title}": ${e.summary}`)
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

  async sustain(): Promise<void> {
    console.log('[Cogito] Checking sustainability...');
    // In a full implementation, this would check USDC balance on Base
    // and adjust strategy based on revenue/cost ratio.
    // For now, just log status.
    const topics = await this.ain.knowledge.listTopics();
    console.log(`[Cogito] Status: ${topics.length} topics, ${this.thinkCount} cycles completed`);
  }

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

  getAddress(): string {
    return this.address;
  }

  getAin(): Ain {
    return this.ain;
  }

  getThinkCount(): number {
    return this.thinkCount;
  }
}
