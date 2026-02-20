import { NextResponse } from 'next/server';
import { getAin } from '@/lib/ain-server';

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

/** Check if entry has an official paper reference (arxiv tag) */
function hasPaperRef(entry: any): boolean {
  const tags = entry.tags || '';
  return /arxiv:/i.test(tags) || /doi:/i.test(tags) || /paper:/i.test(tags);
}

/** Check if entry has a code repository reference */
function hasCodeRef(entry: any): boolean {
  const tags = entry.tags || '';
  const content = entry.content || '';
  const summary = entry.summary || '';
  const all = `${tags} ${content} ${summary}`;
  return /github\.com\/[\w-]+\/[\w.-]+/i.test(all) || /code:/i.test(tags) || /repo:/i.test(tags);
}

/** Extract significant words from a title */
function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

/** Jaccard similarity between two word sets (0-1) */
function similarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Deduplicate entries by title similarity (>60% word overlap), keeping the most recent */
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
