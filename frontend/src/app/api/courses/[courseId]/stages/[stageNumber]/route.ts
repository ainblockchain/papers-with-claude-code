import { NextRequest, NextResponse } from 'next/server';
import { fetchCoursesJson } from '@/lib/github';
import { generateStageData } from '@/lib/server/map-generator';

/** Parse composite courseId "paperSlug--courseSlug" */
function parseCourseId(courseId: string): { paperSlug: string; courseSlug: string } | null {
  const parts = courseId.split('--');
  if (parts.length !== 2) return null;
  return { paperSlug: parts[0], courseSlug: parts[1] };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string; stageNumber: string }> },
) {
  const { courseId, stageNumber: stageStr } = await params;
  const parsed = parseCourseId(courseId);

  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid courseId format. Expected: paperSlug--courseSlug' },
      { status: 400 },
    );
  }

  const stageNumber = parseInt(stageStr, 10);
  if (isNaN(stageNumber) || stageNumber < 1) {
    return NextResponse.json(
      { error: 'Invalid stage number. Must be a positive integer.' },
      { status: 400 },
    );
  }

  try {
    const courses = await fetchCoursesJson(parsed.paperSlug, parsed.courseSlug);

    if (stageNumber > courses.length) {
      return NextResponse.json(
        { error: `Stage ${stageNumber} not found. This course has ${courses.length} stages.` },
        { status: 404 },
      );
    }

    const stageData = generateStageData(
      stageNumber,
      courses[stageNumber - 1],
      courses.length,
    );

    return NextResponse.json(stageData);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate stage data';
    const status = message.includes('not found') ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
