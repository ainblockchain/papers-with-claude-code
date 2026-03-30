import { NextRequest, NextResponse } from 'next/server';
import { getAinClient } from '@/lib/ain/client';

/** Count completed stages for a single user's exploration data */
function countStagesForUser(topics: Record<string, any>): number {
  let count = 0;

  for (const [topicKey, entries] of Object.entries(topics)) {
    if (!topicKey.startsWith('courses|')) continue;
    if (!entries || typeof entries !== 'object') continue;

    for (const [, entry] of Object.entries(entries as Record<string, any>)) {
      if (!entry || typeof entry !== 'object') continue;
      const depth: number = entry.depth || 0;

      // stage_complete (depth=2) — no duplicates guaranteed by client-side guard
      if (depth === 2) {
        count++;
      }
    }
  }

  return count;
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

    if (userStages === 0) {
      return NextResponse.json({
        ok: true,
        data: { totalUsers, userRank: 0, percentile: null, stagesCleared: 0 },
      });
    }

    // Rank: 1-based position (1 = most stages)
    stageCounts.sort((a, b) => b - a);
    const userRank = stageCounts.indexOf(userStages) + 1;

    // Top percent: what bracket the user falls in (1% = best)
    const topPercent = totalUsers <= 1
      ? 1
      : Math.max(1, Math.round((userRank / totalUsers) * 100));

    return NextResponse.json({
      ok: true,
      data: { totalUsers, userRank, topPercent, stagesCleared: userStages },
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message ?? 'Failed to compute ranking' },
      { status: 500 },
    );
  }
}
