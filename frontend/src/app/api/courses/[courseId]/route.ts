import { NextRequest, NextResponse } from 'next/server';
import { fetchCoursesJson } from '@/lib/github';
import { generateCourseInfo } from '@/lib/server/map-generator';

/** Parse composite courseId "paperSlug--courseSlug" */
function parseCourseId(courseId: string): { paperSlug: string; courseSlug: string } | null {
  const parts = courseId.split('--');
  if (parts.length !== 2) return null;
  return { paperSlug: parts[0], courseSlug: parts[1] };
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;
  const parsed = parseCourseId(courseId);

  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid courseId format. Expected: paperSlug--courseSlug' },
      { status: 400 },
    );
  }

  try {
    const courses = await fetchCoursesJson(parsed.paperSlug, parsed.courseSlug);
    const info = generateCourseInfo(parsed.paperSlug, parsed.courseSlug, courses);
    return NextResponse.json(info);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch course info';
    const status = message.includes('not found') ? 404 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
