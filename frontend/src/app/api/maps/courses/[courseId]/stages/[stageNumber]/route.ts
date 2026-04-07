import { NextRequest, NextResponse } from 'next/server';
import { generateStageData, type CourseEntry } from '@/lib/server/map-generator';

const REPO_OWNER = 'ainblockchain';
const REPO_NAME = 'awesome-papers-with-claude-code';
const REPO_BRANCH = process.env.GITHUB_BRANCH || 'main';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`;

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

  // courseId format: "paperSlug--courseSlug"
  const dashIdx = courseId.indexOf('--');
  if (dashIdx === -1) {
    return NextResponse.json(
      { ok: false, error: `Invalid course ID format: "${courseId}"` },
      { status: 400 },
    );
  }

  const paperSlug = courseId.slice(0, dashIdx);
  const courseSlug = courseId.slice(dashIdx + 2);

  try {
    const res = await fetch(
      `${RAW_BASE}/${paperSlug}/${courseSlug}/knowledge/courses.json`,
    );
    if (!res.ok) throw new Error('courses.json not found on GitHub');

    const courses: CourseEntry[] = await res.json();
    if (num > courses.length) {
      return NextResponse.json(
        { ok: false, error: `Stage ${num} out of range (1-${courses.length})` },
        { status: 404 },
      );
    }

    const stageData = generateStageData(num, courses[num - 1], courses.length);
    return NextResponse.json({ ok: true, data: stageData });
  } catch {
    return NextResponse.json(
      { ok: false, error: `Stage ${num} not found for course "${courseId}"` },
      { status: 404 },
    );
  }
}
