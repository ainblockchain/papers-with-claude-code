import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import type { Paper } from '@/types/paper';

let synced = false;

/**
 * Sync courses from GitHub to AIN blockchain as topics.
 * Only registers topics that don't already exist on-chain.
 * Runs at most once per session.
 */
export async function syncCoursesToAin(papers: Paper[]): Promise<void> {
  if (synced) return;
  synced = true;

  try {
    const existing = await ainAdapter.listTopics();
    const registeredPaths = new Set<string>();

    // Collect all registered topic paths (including nested like courses/xxx)
    function collectPaths(obj: any, prefix = '') {
      if (!obj || typeof obj !== 'object') return;
      for (const key of Object.keys(obj)) {
        const path = prefix ? `${prefix}/${key}` : key;
        registeredPaths.add(path);
        collectPaths(obj[key], path);
      }
    }
    collectPaths(existing);

    const unregistered = papers.filter(
      (p) => !registeredPaths.has(`courses/${p.id}`)
    );

    if (unregistered.length === 0) return;

    await Promise.allSettled(
      unregistered.map((paper) =>
        ainAdapter.registerTopic(`courses/${paper.id}`, paper.title, paper.description)
      )
    );
  } catch {
    // best effort — sync will retry next session
    synced = false;
  }
}
