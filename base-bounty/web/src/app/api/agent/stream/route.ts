export const dynamic = 'force-dynamic';

import { getAin } from '@/lib/ain-server';

// Simple in-memory cache to avoid hammering AIN API
let cachedExplorations: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 1 minute

/** Check if entry has an official paper reference */
function hasPaperRef(entry: any): boolean {
  const tags = entry.tags || '';
  return /arxiv:/i.test(tags) || /doi:/i.test(tags) || /paper:/i.test(tags);
}

/** Extract significant words from a title */
function titleWords(title: string): Set<string> {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
  );
}

/** Jaccard similarity between two word sets */
function similarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Deduplicate entries by title similarity (>60% overlap), keeping the most recent */
function deduplicateByTitle(entries: any[]): any[] {
  const result: any[] = [];
  const wordSets: Set<string>[] = [];
  const sorted = [...entries].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  for (const entry of sorted) {
    const title = entry.title || '';
    if (!title.trim()) continue;
    const words = titleWords(title);
    if (words.size === 0) continue;
    const isDupe = wordSets.some(existing => similarity(existing, words) > 0.45);
    if (!isDupe) {
      result.push(entry);
      wordSets.push(words);
    }
  }
  return result;
}

async function getCachedExplorations(): Promise<any[]> {
  if (cachedExplorations && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedExplorations;
  }

  try {
    const ain = getAin();
    const topics = await ain.knowledge.listTopics().catch(() => []);
    const entries: any[] = [];

    // Only check top-level topics to minimize API calls
    for (const topic of (topics || []).slice(0, 8)) {
      const explorers = await ain.knowledge.getExplorers(topic).catch(() => []);
      for (const addr of (explorers || []).slice(0, 2)) {
        const explorations = await ain.knowledge.getExplorations(addr, topic).catch(() => null);
        if (!explorations) continue;
        for (const [id, entry] of Object.entries(explorations as Record<string, any>)) {
          entries.push({ ...entry, entryId: id, explorer: addr, topic_path: entry.topic_path || topic });
        }
      }
    }

    // Filter to entries with paper references and deduplicate
    const withPapers = entries.filter((e) => hasPaperRef(e));
    const deduped = deduplicateByTitle(withPapers.length > 0 ? withPapers : entries);

    deduped.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    cachedExplorations = deduped.slice(0, 10);
    cacheTimestamp = Date.now();
    return cachedExplorations;
  } catch {
    return cachedExplorations || [];
  }
}

export async function GET() {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: any) {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {}
      }

      try {
        // Send initial explorations from cache
        const explorations = await getCachedExplorations();
        send('status', { running: true, entries: explorations.length });

        if (explorations.length > 0) {
          send('cycle_start', { strategy: 'explore', cycleNumber: explorations.length });
          for (const exp of [...explorations].reverse()) {
            send('exploration', {
              topicPath: exp.topic_path,
              entryId: exp.entryId,
              title: exp.title || 'Untitled',
              paperRef: exp.summary,
            });
          }
          send('cycle_end', { strategy: 'explore', cycleNumber: explorations.length });
        }

        // Poll with longer interval using cached data
        const poll = setInterval(async () => {
          if (closed) { clearInterval(poll); return; }
          try {
            const latest = await getCachedExplorations();
            if (latest.length > 0 && latest[0]?.entryId !== explorations[0]?.entryId) {
              send('thinking', { topic: latest[0].topic_path, message: `New: ${latest[0].title}` });
              send('exploration', {
                topicPath: latest[0].topic_path,
                entryId: latest[0].entryId,
                title: latest[0].title || 'Untitled',
                paperRef: latest[0].summary,
              });
            }
          } catch {}
        }, 120000); // Poll every 2 minutes

        // Heartbeat every 30s
        const heartbeat = setInterval(() => {
          if (closed) { clearInterval(heartbeat); clearInterval(poll); return; }
          try {
            controller.enqueue(encoder.encode(`:heartbeat\n\n`));
          } catch { closed = true; clearInterval(heartbeat); clearInterval(poll); }
        }, 30000);

      } catch (err: any) {
        send('error', { message: err.message });
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
