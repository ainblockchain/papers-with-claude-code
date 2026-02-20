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

    entries.sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
    return NextResponse.json({ entries });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, entries: [] }, { status: 500 });
  }
}
