import { NextRequest, NextResponse } from 'next/server';
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

async function computeGraphStats(ain: any) {
  const allPaths = await collectAllTopicPaths(ain);
  let nodeCount = 0;
  let edgeCount = 0;

  for (const tp of allPaths) {
    const explorers = await ain.knowledge.getExplorers(tp).catch(() => []);
    for (const addr of (explorers || [])) {
      const explorations = await ain.knowledge.getExplorations(addr, tp).catch(() => null);
      if (explorations) {
        const count = Object.keys(explorations).length;
        nodeCount += count;
        if (count > 1) edgeCount += count - 1;
      }
    }
  }

  return { node_count: nodeCount, edge_count: edgeCount, topic_count: allPaths.length };
}

export async function POST(request: NextRequest) {
  const { action, params } = await request.json();
  const ain = getAin();

  try {
    let result: any;

    switch (action) {
      case 'getGraphStats':
        result = await computeGraphStats(ain);
        break;

      case 'listTopics':
        result = await ain.knowledge.listTopics();
        break;

      case 'listSubtopics':
        result = await ain.knowledge.listSubtopics(params.topicPath);
        break;

      case 'getFrontierMap':
        result = await ain.knowledge.getFrontierMap(params.topicPath);
        break;

      case 'getFrontier':
        result = await ain.knowledge.getFrontier(params.topicPath);
        break;

      case 'getExplorers':
        result = await ain.knowledge.getExplorers(params.topicPath);
        break;

      case 'getExplorations':
        result = await ain.knowledge.getExplorations(params.address, params.topicPath);
        break;

      case 'getTopicStats':
        result = await ain.knowledge.getTopicStats(params.topicPath);
        break;

      case 'getTopicInfo':
        result = await ain.knowledge.getTopicInfo(params.topicPath);
        break;

      case 'getAllFrontierEntries': {
        // Recursively collect frontier entries from all topics
        const allPaths = await collectAllTopicPaths(ain);
        const entries: any[] = [];
        for (const tp of allPaths) {
          const frontier = await ain.knowledge.getFrontierMap(tp).catch(() => []);
          if (Array.isArray(frontier)) entries.push(...frontier);
        }
        result = entries;
        break;
      }

      case 'getRecentExplorations': {
        const paths = await collectAllTopicPaths(ain);
        const exps: any[] = [];
        for (const tp of paths) {
          const explorers = await ain.knowledge.getExplorers(tp).catch(() => []);
          for (const addr of (explorers || [])) {
            const explorations = await ain.knowledge.getExplorations(addr, tp).catch(() => null);
            if (!explorations) continue;
            for (const [id, entry] of Object.entries(explorations as Record<string, any>)) {
              exps.push({ ...entry, entryId: id, explorer: addr, topic_path: entry.topic_path || tp });
            }
          }
        }
        exps.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
        result = exps.slice(0, params.limit || 20);
        break;
      }

      case 'getKnowledgeGraph': {
        const kgPaths = await collectAllTopicPaths(ain);
        const nodes: any[] = [];
        const edges: any[] = [];
        for (const tp of kgPaths) {
          const explorers = await ain.knowledge.getExplorers(tp).catch(() => []);
          for (const addr of (explorers || [])) {
            const explorations = await ain.knowledge.getExplorations(addr, tp).catch(() => null);
            if (!explorations) continue;
            for (const [id, entry] of Object.entries(explorations as Record<string, any>)) {
              nodes.push({
                id: `${addr}:${tp}:${id}`,
                title: entry.title || id,
                topic_path: entry.topic_path || tp,
                depth: entry.depth || 1,
                explorer: addr,
              });
            }
          }
          const topicNodes = nodes.filter(n => n.topic_path === tp);
          for (let i = 1; i < topicNodes.length; i++) {
            edges.push({ source: topicNodes[i - 1].id, target: topicNodes[i].id, type: 'related' });
          }
        }
        // Also connect topics to their parent topic
        for (const tp of kgPaths) {
          const parts = tp.split('/');
          if (parts.length > 1) {
            const parentPath = parts.slice(0, -1).join('/');
            const parentNodes = nodes.filter(n => n.topic_path === parentPath);
            const childNodes = nodes.filter(n => n.topic_path === tp);
            if (parentNodes.length > 0 && childNodes.length > 0) {
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
