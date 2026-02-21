import { ainAdapter } from '@/lib/adapters/ain-blockchain';
import type { Paper } from '@/types/paper';

/**
 * Sync courses from GitHub to AIN blockchain as topics.
 * Fire-and-forget — errors are silently ignored.
 */
export async function syncCoursesToAin(papers: Paper[]): Promise<void> {
  await Promise.allSettled(
    papers.map((paper) =>
      ainAdapter.registerTopic(`courses/${paper.id}`, paper.title, paper.description)
    )
  );
}
