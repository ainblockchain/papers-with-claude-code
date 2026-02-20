/**
 * Lesson Watcher.
 * Polls AIN blockchain for new lesson_learned entries,
 * enriches them with papers + code, and publishes gated content.
 */

import { AinClient } from './ain-client.js';
import { fetchPapersByKeywords, Paper } from './paper-discovery.js';
import { generateContent, extractKeywords } from './content-generator.js';
import { BaseChain } from './base-chain.js';
import { LessonLearned } from './types.js';

const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '30000');
const CONTENT_PRICE = process.env.CONTENT_PRICE || '0.005';

export class LessonWatcher {
  private processedEntries = new Set<string>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt: number = Date.now();
  private initialScanDone = false;

  private baseChain: BaseChain | null = null;

  constructor(private ain: AinClient, baseChain?: BaseChain) {
    this.baseChain = baseChain ?? null;
  }

  /**
   * Start watching for new lessons.
   * On first poll, marks all existing entries as already processed.
   * Only processes entries created after the watcher started.
   */
  start(): void {
    console.log(`[Watcher] Polling every ${POLL_INTERVAL_MS}ms for new lessons...`);
    this.startedAt = Date.now();

    // Run immediately, then on interval
    this.poll().catch(err => console.error(`[Watcher] Poll error: ${err.message}`));
    this.timer = setInterval(() => {
      this.poll().catch(err => console.error(`[Watcher] Poll error: ${err.message}`));
    }, POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Poll for new lesson_learned entries and process them.
   */
  private async poll(): Promise<void> {
    // Get all explorations for our address
    const explorations = await this.ain.getAllExplorations();
    if (!explorations) return;

    let newCount = 0;
    for (const [topicKey, entries] of Object.entries(explorations)) {
      if (!entries || typeof entries !== 'object') continue;

      for (const [entryId, entry] of Object.entries(entries as Record<string, any>)) {
        const fullId = `${topicKey}/${entryId}`;

        // Skip already processed
        if (this.processedEntries.has(fullId)) continue;

        const tags = (entry.tags || '').toLowerCase();

        // Skip enriched/generated content (only process raw lessons)
        if (tags.includes('x402_gated') || tags.includes('educational')) {
          this.processedEntries.add(fullId);
          continue;
        }

        // Only process lesson_learned entries
        if (!tags.includes('lesson_learned')) {
          this.processedEntries.add(fullId);
          continue;
        }

        // On first scan, mark pre-existing entries as processed without enriching
        if (!this.initialScanDone) {
          this.processedEntries.add(fullId);
          continue;
        }

        // Process this new lesson
        newCount++;
        console.log(`[Watcher] New lesson found: "${entry.title}" (${fullId})`);
        await this.processLesson(topicKey, entryId, entry);
        this.processedEntries.add(fullId);
      }
    }

    if (!this.initialScanDone) {
      this.initialScanDone = true;
      console.log(`[Watcher] Initial scan complete — ${this.processedEntries.size} existing entries catalogued, watching for new lessons`);
    } else if (newCount === 0) {
      // Quiet poll, no new lessons
    }
  }

  /**
   * Process a single lesson: find papers, generate content, publish.
   */
  private async processLesson(
    topicKey: string,
    entryId: string,
    entry: any,
  ): Promise<void> {
    const lesson: LessonLearned = {
      entryId,
      title: entry.title || 'Untitled Lesson',
      content: entry.content || entry.summary || '',
      summary: entry.summary || '',
      depth: entry.depth || 2,
      tags: entry.tags || '',
      created_at: entry.created_at || Date.now(),
    };

    try {
      // 1. Extract keywords for paper search
      const keywords = await extractKeywords(lesson);
      console.log(`[Watcher] Keywords: ${keywords.join(', ')}`);

      // 2. Find related papers + their official code repos
      let allPapers: Paper[] = [];
      try {
        allPapers = await fetchPapersByKeywords(keywords, 5);
      } catch (err: any) {
        console.log(`[Watcher] Paper search failed: ${err.message}`);
      }

      // Deduplicate papers
      const seen = new Set<string>();
      allPapers = allPapers.filter(p => {
        if (seen.has(p.arxivId)) return false;
        seen.add(p.arxivId);
        return true;
      });

      console.log(`[Watcher] Found ${allPapers.length} related papers`);

      // 3. Generate educational content
      const enriched = await generateContent(lesson, allPapers);
      console.log(`[Watcher] Generated article: "${enriched.title}"`);

      // 4. Publish as x402-gated content on AIN
      const topicPath = topicKey.replace(/_/g, '/');
      await this.ain.writeEnrichedContent(topicPath, enriched, CONTENT_PRICE);
      console.log(`[Watcher] Published gated content for "${enriched.title}"`);

      // 5. Record Base chain attribution with ERC-8021 builder codes
      if (this.baseChain && allPapers.length > 0) {
        await this.baseChain.recordAttribution(topicPath, allPapers);
      }

    } catch (err: any) {
      console.error(`[Watcher] Failed to process lesson "${lesson.title}": ${err.message}`);
    }
  }
}
