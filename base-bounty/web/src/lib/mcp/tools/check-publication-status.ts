/**
 * check_publication_status MCP tool.
 * Queries the AIN blockchain to check whether similar enriched content
 * already exists for a given topic, preventing duplicate publications.
 */

import { z } from 'zod';
import { getAin } from '@/lib/ain-server';
import { titleWords, similarity, hasPaperRef, hasCodeRef } from '../helpers/publication-criteria';

const SIMILARITY_THRESHOLD = 0.45;

export const checkPublicationStatusSchema = {
  topicPath: z.string().describe('AIN knowledge-graph topic path (e.g. "lessons/ai")'),
  title: z.string().describe('Title of the content to publish'),
  tags: z.array(z.string()).optional().describe('Optional tags for the content'),
};

interface ExistingMatch {
  entryId: string;
  title: string;
  similarity: number;
  hasPapers: boolean;
  hasCode: boolean;
}

interface CheckPublicationStatusResult {
  canPublish: boolean;
  reason: string;
  existingMatches: ExistingMatch[];
}

export async function checkPublicationStatus(args: {
  topicPath: string;
  title: string;
  tags?: string[];
}): Promise<CheckPublicationStatusResult> {
  const { topicPath, title } = args;
  const ain = getAin();
  const candidateWords = titleWords(title);

  if (candidateWords.size === 0) {
    return {
      canPublish: true,
      reason: 'Title has no significant words to compare — treated as novel.',
      existingMatches: [],
    };
  }

  const existingMatches: ExistingMatch[] = [];

  try {
    const explorers: string[] = await ain.knowledge.getExplorers(topicPath).catch(() => []);

    for (const addr of explorers || []) {
      const explorations = await ain.knowledge.getExplorations(addr, topicPath).catch(() => null);
      if (!explorations) continue;

      for (const [id, entry] of Object.entries(explorations as Record<string, any>)) {
        const entryTitle = entry.title || '';
        if (!entryTitle.trim()) continue;

        const entryWords = titleWords(entryTitle);
        if (entryWords.size === 0) continue;

        const sim = similarity(candidateWords, entryWords);
        if (sim > SIMILARITY_THRESHOLD) {
          existingMatches.push({
            entryId: id,
            title: entryTitle,
            similarity: Math.round(sim * 100) / 100,
            hasPapers: hasPaperRef(entry),
            hasCode: hasCodeRef(entry),
          });
        }
      }
    }
  } catch {
    // If blockchain query fails, allow publication but note the error
    return {
      canPublish: true,
      reason: 'Could not query existing entries — allowing publication.',
      existingMatches: [],
    };
  }

  // Block if any match is already enriched (has papers + code)
  const enrichedDuplicates = existingMatches.filter(m => m.hasPapers && m.hasCode);

  if (enrichedDuplicates.length > 0) {
    return {
      canPublish: false,
      reason: `Found ${enrichedDuplicates.length} existing enriched entry(s) with >45% title similarity. Publishing would create a duplicate.`,
      existingMatches,
    };
  }

  // Block if any match has at least paper references
  const paperDuplicates = existingMatches.filter(m => m.hasPapers);

  if (paperDuplicates.length > 0) {
    return {
      canPublish: false,
      reason: `Found ${paperDuplicates.length} existing entry(s) with paper references and >45% title similarity.`,
      existingMatches,
    };
  }

  if (existingMatches.length > 0) {
    return {
      canPublish: true,
      reason: `Found ${existingMatches.length} similar entry(s) but none are enriched with papers/code — publishing is allowed.`,
      existingMatches,
    };
  }

  return {
    canPublish: true,
    reason: 'No similar entries found — topic is novel.',
    existingMatches: [],
  };
}
