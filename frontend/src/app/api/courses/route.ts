import { NextResponse } from 'next/server';
import { listCourses, fetchCoursesJson, fetchCourseReadme } from '@/lib/github';
import type { Paper } from '@/types/paper';

/** Convert slug to title case: "attention-is-all-you-need" → "Attention Is All You Need" */
function slugToTitle(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Extract title from README.md's first H1 line */
function extractTitleFromReadme(readme: string): string | null {
  const match = readme.match(/^#\s+(.+)/m);
  if (!match) return null;
  // Clean suffixes like "Learning Path", "Course", etc.
  return match[1]
    .replace(/\s+(Learning Path|Course|Tutorial)$/i, '')
    .trim();
}

/** Extract description paragraph from README (first non-heading paragraph after title) */
function extractDescriptionFromReadme(readme: string): string | null {
  const lines = readme.split('\n');
  let foundTitle = false;
  let descLines: string[] = [];
  let collecting = false;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      foundTitle = true;
      continue;
    }
    if (!foundTitle) continue;

    // Skip empty lines before the description
    if (!collecting && !line.trim()) continue;

    // Start collecting on first non-empty, non-heading line
    if (!collecting && line.trim() && !line.startsWith('#') && !line.startsWith('```')) {
      collecting = true;
    }

    if (collecting) {
      // Stop at section headers, code blocks, or empty lines after content
      if (line.startsWith('#') || line.startsWith('```') || (!line.trim() && descLines.length > 0)) {
        break;
      }
      if (line.trim()) {
        descLines.push(line.trim());
      }
    }
  }

  return descLines.length > 0 ? descLines.join(' ') : null;
}

// In-memory cache for the full course list response
let cachedResponse: { data: Paper[]; timestamp: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function GET() {
  // Return cached response if still fresh
  if (cachedResponse && Date.now() - cachedResponse.timestamp < CACHE_TTL) {
    return NextResponse.json(cachedResponse.data);
  }

  try {
    const entries = await listCourses();

    // Fetch details for each course in parallel
    const papers = await Promise.all(
      entries.map(async (entry) => {
        const courseId = `${entry.paperSlug}--${entry.courseSlug}`;

        // Fetch courses.json for stage count
        let totalStages = 0;
        try {
          const courses = await fetchCoursesJson(entry.paperSlug, entry.courseSlug);
          totalStages = courses.length;
        } catch {
          // courses.json fetch failed
        }

        // Fetch README for metadata extraction
        let title = slugToTitle(entry.paperSlug);
        let description = `Interactive learning course: ${title}`;
        try {
          const readme = await fetchCourseReadme(entry.paperSlug, entry.courseSlug);
          const readmeTitle = extractTitleFromReadme(readme);
          if (readmeTitle) title = readmeTitle;
          const readmeDesc = extractDescriptionFromReadme(readme);
          if (readmeDesc) description = readmeDesc;
        } catch {
          // README not available
        }

        // Append course slug if paper has multiple courses
        const courseLabel = entry.courseSlug !== 'bible' ? ` (${slugToTitle(entry.courseSlug)})` : '';

        const paper: Paper = {
          id: courseId,
          title: title + courseLabel,
          description,
          authors: [],
          publishedAt: '',
          thumbnailUrl: '',
          arxivUrl: '',
          submittedBy: 'papers-kg-builder',
          totalStages,
        };

        return paper;
      }),
    );

    // Filter out courses with 0 stages (failed to fetch)
    const validPapers = papers.filter((p) => p.totalStages > 0);

    cachedResponse = { data: validPapers, timestamp: Date.now() };
    return NextResponse.json(validPapers);
  } catch (error) {
    // If we have stale cache, return it
    if (cachedResponse) {
      return NextResponse.json(cachedResponse.data);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch courses' },
      { status: 502 },
    );
  }
}
