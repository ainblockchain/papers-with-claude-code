import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

/** Count completed stages for a single user's exploration data */
function countStagesForUser(topics: Record<string, any>): number {
  const completedStages = new Set<string>();

  for (const [topicKey, entries] of Object.entries(topics)) {
    if (!topicKey.startsWith('courses|')) continue;
    if (!entries || typeof entries !== 'object') continue;

    for (const [, entry] of Object.entries(entries as Record<string, any>)) {
      if (!entry || typeof entry !== 'object') continue;
      const summary: string = entry.summary || '';
      const depth: number = entry.depth || 0;

      // stage_complete (depth=2)
      if (depth === 2) {
        const stageMatch = summary.match(/stage\s+(\d+)/i);
        const stageIndex = stageMatch ? parseInt(stageMatch[1], 10) : 0;
        completedStages.add(`${topicKey}:${stageIndex}`);
      }
    }
  }

  return completedStages.size;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { ok: false, error: 'address query parameter is required' },
        { status: 400 },
      );
    }

    const ain = getAinClient();
    const allExplorations = await ain.db
      .ref('/apps/knowledge/explorations')
      .getValue();

    if (!allExplorations || typeof allExplorations !== 'object') {
      return NextResponse.json({
        ok: true,
        data: { totalUsers: 0, userRank: 0, percentile: null, stagesCleared: 0 },
      });
    }

    // Count stages per user
    const stageCounts: number[] = [];
    let userStages = 0;

    for (const [addr, topics] of Object.entries(allExplorations)) {
      if (!topics || typeof topics !== 'object') continue;
      const count = countStagesForUser(topics as Record<string, any>);
      if (count === 0) continue; // exclude users with no stage completions
      stageCounts.push(count);
      if (addr.toLowerCase() === address.toLowerCase()) {
        userStages = count;
      }
    }

    const totalUsers = stageCounts.length;

    if (totalUsers <= 1 || userStages === 0) {
      return NextResponse.json({
        ok: true,
        data: { totalUsers, userRank: totalUsers > 0 ? 1 : 0, percentile: null, stagesCleared: userStages },
      });
    }

    // Percentile: percentage of users with fewer stages
    const usersWithFewer = stageCounts.filter(c => c < userStages).length;
    const percentile = Math.round((usersWithFewer / totalUsers) * 100);

    // Rank: 1-based position (1 = most stages)
    stageCounts.sort((a, b) => b - a);
    const userRank = stageCounts.indexOf(userStages) + 1;

    return NextResponse.json({
      ok: true,
      data: { totalUsers, userRank, percentile, stagesCleared: userStages },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to compute ranking' },
      { status: 500 },
    );
  }
}
