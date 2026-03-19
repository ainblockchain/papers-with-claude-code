import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
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

  // 1. Try static file
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
    // Static file not found — try GitHub fallback
  }

  // 2. Fallback: fetch courses.json from GitHub and generate on-the-fly
  try {
    // courseId format: "paperSlug--courseSlug"
    const dashIdx = courseId.indexOf('--');
    if (dashIdx === -1) {
      return NextResponse.json(
        { ok: false, error: `Stage ${num} not found for course "${courseId}"` },
        { status: 404 },
      );
    }
    const paperSlug = courseId.slice(0, dashIdx);
    const courseSlug = courseId.slice(dashIdx + 2);

    const res = await fetch(
      `${RAW_BASE}/${paperSlug}/${courseSlug}/knowledge/courses.json`,
    );
    if (!res.ok) throw new Error('courses.json not found on GitHub');

    const courses: CourseEntry[] = await res.json();
    if (num < 1 || num > courses.length) {
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
