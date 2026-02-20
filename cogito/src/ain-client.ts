/**
 * AIN Blockchain client for the Cogito Node.
 * Wraps ain-js to read lessons and write enriched content.
 */

import AinModule from '@ainblockchain/ain-js';
import { EnrichedContent } from './types.js';

// ESM/CJS interop: ain-js is CJS with `module.exports = class Ain`.
// In Node ESM, the default import is `{ default: Ain }`, not Ain directly.
const Ain: any = (AinModule as any).default ?? AinModule;

export class AinClient {
  private ain: any;
  private address: string = '';

  constructor(
    private providerUrl: string,
    private privateKey: string,
  ) {
    this.ain = new Ain(providerUrl);
  }

  async init(): Promise<void> {
    this.address = this.ain.wallet.addAndSetDefaultAccount(this.privateKey);
    console.log(`[AIN] Initialized with address: ${this.address}`);

    try {
      await this.ain.knowledge.setupApp();
      console.log('[AIN] Knowledge app ready');
    } catch (err: any) {
      console.log(`[AIN] Knowledge app setup: ${err.message || 'skipped'}`);
    }
  }

  getAddress(): string {
    return this.address;
  }

  /**
   * Register a topic path in the knowledge graph.
   */
  async registerTopic(topicPath: string): Promise<void> {
    const parts = topicPath.split('/');
    const title = parts[parts.length - 1].replace(/-/g, ' ');
    await this.ain.knowledge.registerTopic(topicPath, {
      title,
      description: `Explorations related to ${topicPath}`,
    });
    console.log(`[AIN] Registered topic: ${topicPath}`);
  }

  /**
   * Get ALL explorations by our address across all topics.
   * Used by the watcher to find new lesson_learned entries.
   */
  async getAllExplorations(): Promise<Record<string, any> | null> {
    return this.ain.knowledge.getExplorationsByUser(this.address);
  }

  /**
   * Get explorations for a specific topic.
   */
  async getExplorations(topicPath: string): Promise<Record<string, any> | null> {
    return this.ain.knowledge.getExplorations(this.address, topicPath);
  }

  /**
   * Get explorations by any address for a topic (for serving content).
   */
  async getExplorationsByAddress(address: string, topicPath: string): Promise<Record<string, any> | null> {
    return this.ain.knowledge.getExplorations(address, topicPath);
  }

  /**
   * Write enriched educational content as a gated exploration.
   */
  async writeEnrichedContent(
    topicPath: string,
    content: EnrichedContent,
    price: string,
  ): Promise<{ entryId: string }> {
    // Ensure topic exists
    try {
      await this.registerTopic(topicPath);
    } catch {}

    const result = await this.ain.knowledge.explore({
      topicPath,
      title: content.title,
      content: content.content,
      summary: content.summary,
      depth: Math.min(content.depth, 5) as 1 | 2 | 3 | 4 | 5,
      tags: content.tags.join(','),
      price,
    });

    console.log(`[AIN] Enriched content written: ${result.entryId}`);
    return { entryId: result.entryId };
  }

  /**
   * Write a raw lesson_learned exploration (used by the /lesson skill script).
   */
  async writeLesson(
    topicPath: string,
    lesson: {
      title: string;
      content: string;
      summary: string;
      tags: string[];
    },
  ): Promise<{ entryId: string }> {
    try {
      await this.registerTopic(topicPath);
    } catch {}

    const result = await this.ain.knowledge.explore({
      topicPath,
      title: lesson.title,
      content: lesson.content,
      summary: lesson.summary,
      depth: 2 as 1 | 2 | 3 | 4 | 5,
      tags: ['lesson_learned', ...lesson.tags].join(','),
    });

    console.log(`[AIN] Lesson written: ${result.entryId}`);
    return { entryId: result.entryId };
  }

  /**
   * Get the frontier map.
   */
  async getFrontierMap(): Promise<Array<{ topic: string; stats: any }>> {
    return this.ain.knowledge.getFrontierMap();
  }

  /**
   * Get the full knowledge graph.
   */
  async getGraph(): Promise<{ nodes: Record<string, any>; edges: Record<string, any> }> {
    return this.ain.knowledge.getGraph();
  }

  /**
   * Write the ERC-8004 registration file to AIN blockchain state.
   * This makes the agent discoverable per the ERC-8004 spec:
   * https://eips.ethereum.org/EIPS/eip-8004#registration-v1
   */
  async writeAgentRegistration(baseAddress: string): Promise<void> {
    const registrationFile = {
      type: 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1',
      name: 'Cogito Node',
      description: 'Autonomous knowledge agent that reads research papers, builds a global knowledge graph on AIN blockchain, and earns USDC via x402 micropayments on Base',
      services: [
        {
          name: 'A2A',
          endpoint: this.providerUrl,
          version: '1.0.0',
          skills: ['knowledge-exploration', 'paper-enrichment', 'course-generation'],
          domains: ['ai', 'crypto'],
        },
      ],
      x402Support: true,
      active: true,
      registrations: [
        {
          agentId: 18276,
          agentRegistry: 'eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
        },
      ],
      supportedTrust: ['reputation'],
    };

    try {
      await this.ain.db.ref('/apps/knowledge/agent_registration').setValue({
        value: registrationFile,
        nonce: -1,
      });
      console.log('[AIN] ERC-8004 registration file written to state');
    } catch (err: any) {
      console.log(`[AIN] Registration file write skipped: ${err.message}`);
    }
  }

  /**
   * Write the A2A agent card to AIN blockchain state.
   * Other agents discover this via the AIN devnet API at:
   *   GET /json?path=/apps/knowledge/a2a_agent_card
   */
  async writeA2AAgentCard(baseAddress: string): Promise<void> {
    const a2aCard = {
      name: 'Cogito Node',
      description: 'Autonomous knowledge agent — reads arXiv papers, builds knowledge graph on AIN blockchain, earns via x402 on Base',
      url: this.providerUrl,
      version: '1.0.0',
      capabilities: {
        streaming: true,
        pushNotifications: false,
      },
      skills: [
        {
          id: 'knowledge-exploration',
          name: 'Knowledge Exploration',
          description: 'Explore research topics with paper-grounded context from arXiv',
          tags: ['ai', 'research', 'papers', 'knowledge-graph'],
          examples: ['Explore transformer architecture', 'What are state-space models?'],
          inputModes: ['text/plain'],
          outputModes: ['text/plain', 'application/json'],
        },
        {
          id: 'paper-enrichment',
          name: 'Paper Enrichment',
          description: 'Enrich lessons with academic papers and their official GitHub code repositories',
          tags: ['papers', 'code', 'enrichment', 'github'],
          examples: ['Enrich a lesson about attention mechanisms'],
          inputModes: ['text/plain'],
          outputModes: ['application/json'],
        },
        {
          id: 'course-generation',
          name: 'Course Generation',
          description: 'Generate structured courses from accumulated knowledge explorations',
          tags: ['education', 'courses', 'x402'],
          examples: ['Generate a course on reinforcement learning'],
          inputModes: ['text/plain'],
          outputModes: ['application/json'],
        },
      ],
      defaultInputModes: ['text/plain'],
      defaultOutputModes: ['text/plain', 'application/json'],
      erc8004: {
        agentId: 18276,
        registry: 'eip155:8453:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
        address: baseAddress,
      },
    };

    try {
      await this.ain.db.ref('/apps/knowledge/a2a_agent_card').setValue({
        value: a2aCard,
        nonce: -1,
      });
      console.log('[AIN] A2A agent card written to state');
    } catch (err: any) {
      console.log(`[AIN] A2A agent card write skipped: ${err.message}`);
    }
  }
}
