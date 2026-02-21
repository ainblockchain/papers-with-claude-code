import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Query AIN blockchain for learning attestations
    let progress;
    try {
      const { ainAdapter } = await import('@/lib/adapters/ain-blockchain');
      const accountInfo = await ainAdapter.getAccountInfo();
      progress = await ainAdapter.getProgress(accountInfo.address);
    } catch {
      // AIN not available — return empty attestations
      return NextResponse.json({ attestations: [] });
    }

    // Transform AIN progress entries into attestation format
    const attestations: Array<{
      paperId: string;
      paperTitle: string;
      stageNum: number;
      score: number;
      attestationHash: string;
      completedAt: string;
    }> = [];

    for (const topic of progress.topics) {
      for (const entry of topic.entries) {
        if (entry.depth >= 2) {
          // depth >= 2 means stage completion
          const crypto = await import('crypto');
          const paperId = topic.topicPath.replace('courses/', '');
          const stageNum = entry.depth - 1;
          const score = 100; // completed entries default to 100
          const hash = crypto
            .createHash('sha256')
            .update(
              `${paperId}:${stageNum}:${score}:${new Date(entry.createdAt).getTime()}`
            )
            .digest('hex');

          attestations.push({
            paperId,
            paperTitle: entry.title,
            stageNum,
            score,
            attestationHash: `0x${hash}`,
            completedAt: new Date(entry.createdAt).toISOString(),
          });
        }
      }
    }

    // Sort by completedAt descending
    attestations.sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    );

    return NextResponse.json({ attestations });
  } catch (error) {
    console.error('[x402/attestations] Error:', error);
    return NextResponse.json(
      {
        error: 'attestations_error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to fetch attestations',
      },
      { status: 500 }
    );
  }
}
