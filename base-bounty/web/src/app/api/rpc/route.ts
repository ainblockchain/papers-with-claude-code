import { NextRequest, NextResponse } from 'next/server';
import { getAin } from '@/lib/ain-server';

// ---------------------------------------------------------------------------
// Shared in-memory cache for all AIN blockchain data (avoids 429 rate limits)
// ---------------------------------------------------------------------------

interface CachedData {
  paths: string[];
  allEntries: any[];   // all explorations with entryId, explorer, topic_path
  graphStats: { node_count: number; edge_count: number; topic_count: number };
}

let cached: CachedData | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 120_000; // 2 minutes

async function getCachedData(): Promise<CachedData> {
  if (cached && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cached;
  }

  const ain = getAin();

  // Collect all topic paths
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

  // Collect all explorations in a single pass
  const allEntries: any[] = [];
  let nodeCount = 0;
  let edgeCount = 0;

  for (const tp of paths) {
    const explorers = await ain.knowledge.getExplorers(tp).catch(() => []);
    let topicNodeCount = 0;
    for (const addr of (explorers || [])) {
      const explorations = await ain.knowledge.getExplorations(addr, tp).catch(() => null);
      if (!explorations) continue;
      for (const [id, entry] of Object.entries(explorations as Record<string, any>)) {
        allEntries.push({
          ...entry,
          entryId: id,
          explorer: addr,
          topic_path: entry.topic_path || tp,
        });
        nodeCount++;
        topicNodeCount++;
      }
    }
    if (topicNodeCount > 1) edgeCount += topicNodeCount - 1;
  }

  cached = {
    paths,
    allEntries,
    graphStats: { node_count: nodeCount, edge_count: edgeCount, topic_count: paths.length },
  };
  cacheTimestamp = Date.now();
  return cached;
}

// ---------------------------------------------------------------------------
// Dedup helpers
// ---------------------------------------------------------------------------

function titleWords(title: string): Set<string> {
  return new Set(
    title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2)
  );
}

function similarity(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function deduplicateEntries(entries: any[]): any[] {
  const sorted = [...entries].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  const result: any[] = [];
  const wordSets: Set<string>[] = [];
  for (const entry of sorted) {
    const title = entry.title || '';
    if (!title.trim()) continue;
    const words = titleWords(title);
    if (words.size === 0) continue;
    if (wordSets.some(existing => similarity(existing, words) > 0.45)) continue;
    result.push(entry);
    wordSets.push(words);
  }
  return result;
}

// ---------------------------------------------------------------------------
// RPC handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const { action, params } = await request.json();

  try {
    let result: any;

    switch (action) {
      case 'getGraphStats': {
        const data = await getCachedData();
        result = data.graphStats;
        break;
      }

      case 'listTopics': {
        const ain = getAin();
        result = await ain.knowledge.listTopics();
        break;
      }

      case 'listSubtopics': {
        const ain = getAin();
        result = await ain.knowledge.listSubtopics(params.topicPath);
        break;
      }

      case 'getFrontierMap': {
        const ain = getAin();
        result = await ain.knowledge.getFrontierMap(params.topicPath);
        break;
      }

      case 'getFrontier': {
        const ain = getAin();
        result = await ain.knowledge.getFrontier(params.topicPath);
        break;
      }

      case 'getExplorers': {
        const ain = getAin();
        result = await ain.knowledge.getExplorers(params.topicPath);
        break;
      }

      case 'getExplorations': {
        const ain = getAin();
        result = await ain.knowledge.getExplorations(params.address, params.topicPath);
        break;
      }

      case 'getTopicStats': {
        const ain = getAin();
        result = await ain.knowledge.getTopicStats(params.topicPath);
        break;
      }

      case 'getTopicInfo': {
        const ain = getAin();
        result = await ain.knowledge.getTopicInfo(params.topicPath);
        break;
      }

      case 'getAllFrontierEntries': {
        const ain = getAin();
        const data = await getCachedData();
        const entries: any[] = [];
        for (const tp of data.paths) {
          const frontier = await ain.knowledge.getFrontierMap(tp).catch(() => []);
          if (Array.isArray(frontier)) entries.push(...frontier);
        }
        result = entries;
        break;
      }

      case 'getRecentExplorations': {
        const data = await getCachedData();
        // Filter to entries with paper references
        const withPapers = data.allEntries.filter((e) => /arxiv:|doi:|paper:/i.test(e.tags || ''));
        const filtered = withPapers.length > 0 ? withPapers : data.allEntries;
        result = deduplicateEntries(filtered).slice(0, params.limit || 20);
        break;
      }

      case 'getKnowledgeGraph': {
        const data = await getCachedData();
        const nodes = data.allEntries.map((entry) => ({
          id: `${entry.explorer}:${entry.topic_path}:${entry.entryId}`,
          title: entry.title || entry.entryId,
          topic_path: entry.topic_path,
          depth: entry.depth || 1,
          explorer: entry.explorer,
        }));

        const edges: any[] = [];
        // Connect entries within same topic
        const byTopic = new Map<string, any[]>();
        for (const n of nodes) {
          const list = byTopic.get(n.topic_path) || [];
          list.push(n);
          byTopic.set(n.topic_path, list);
        }
        for (const topicNodes of byTopic.values()) {
          for (let i = 1; i < topicNodes.length; i++) {
            edges.push({ source: topicNodes[i - 1].id, target: topicNodes[i].id, type: 'related' });
          }
        }
        // Connect subtopics to parent
        for (const tp of data.paths) {
          const parts = tp.split('/');
          if (parts.length > 1) {
            const parentPath = parts.slice(0, -1).join('/');
            const parentNodes = byTopic.get(parentPath);
            const childNodes = byTopic.get(tp);
            if (parentNodes?.length && childNodes?.length) {
              edges.push({ source: parentNodes[0].id, target: childNodes[0].id, type: 'subtopic' });
            }
          }
        }
        result = { nodes, edges };
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
