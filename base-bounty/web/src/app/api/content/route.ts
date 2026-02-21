import { NextResponse } from 'next/server';
import { getAin } from '@/lib/ain-server';
import { titleWords, similarity, hasPaperRef, hasCodeRef } from '@/lib/mcp/helpers/publication-criteria';

async function collectAllTopicPaths(ain: any): Promise<string[]> {
  const paths: string[] = [];

  async function recurse(topicPath: string) {
    paths.push(topicPath);
    const subtopics = await ain.knowledge.listSubtopics(topicPath).catch(() => []);
    for (const sub of (subtopics || [])) {
      await recurse(`${topicPath}/${sub}`);
    }
  }

  const topics = await ain.knowledge.listTopics();
  for (const topic of (topics || [])) {
    await recurse(topic);
  }
  return paths;
}

/** Deduplicate entries by title similarity (>45% word overlap), keeping the most recent */
function deduplicateByTitle(entries: any[]): any[] {
  const result: any[] = [];
  const wordSets: Set<string>[] = [];

  // Sort newest first so we keep the most recent
  const sorted = [...entries].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  for (const entry of sorted) {
    const title = entry.title || '';
    if (!title.trim()) continue;
    const words = titleWords(title);
    if (words.size === 0) continue;

    // Check if similar to any already-kept entry
    const isDupe = wordSets.some(existing => similarity(existing, words) > 0.45);
    if (!isDupe) {
      result.push(entry);
      wordSets.push(words);
    }
  }
  return result;
}

export async function GET() {
  try {
    const ain = getAin();
    const paths = await collectAllTopicPaths(ain);
    const entries: any[] = [];

    for (const tp of paths) {
      const explorers = await ain.knowledge.getExplorers(tp).catch(() => []);
      for (const addr of (explorers || [])) {
        const explorations = await ain.knowledge.getExplorations(addr, tp).catch(() => null);
        if (!explorations) continue;
        for (const [id, entry] of Object.entries(explorations as Record<string, any>)) {
          entries.push({
            ...entry,
            entryId: id,
            explorer: addr,
            topic_path: entry.topic_path || tp,
          });
        }
      }
    }

    // Filter: only entries with paper references AND code references
    const withPaperAndCode = entries.filter((e) => hasPaperRef(e) && hasCodeRef(e));

    // If strict filter yields nothing, fall back to entries with at least a paper reference
    const filtered = withPaperAndCode.length > 0
      ? withPaperAndCode
      : entries.filter((e) => hasPaperRef(e));

    // Deduplicate by title (keep newest)
    const deduped = deduplicateByTitle(filtered);

    deduped.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    return NextResponse.json({ entries: deduped });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, entries: [] }, { status: 500 });
  }
}
