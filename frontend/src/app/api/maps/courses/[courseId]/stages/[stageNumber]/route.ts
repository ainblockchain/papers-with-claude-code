import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string; stageNumber: string }> },
) {
  const { courseId, stageNumber } = await params;
  const num = parseInt(stageNumber, 10);

  if (isNaN(num) || num < 1) {
    return NextResponse.json(
      { ok: false, error: 'Invalid stage number' },
      { status: 400 },
    );
  }

  const filePath = path.join(
    process.cwd(),
    'public',
    'courses',
    courseId,
    'stages',
    `${num}.json`,
  );

  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json(
      { ok: false, error: `Stage ${num} not found for course "${courseId}"` },
      { status: 404 },
    );
  }
}
