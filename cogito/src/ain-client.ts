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
}
