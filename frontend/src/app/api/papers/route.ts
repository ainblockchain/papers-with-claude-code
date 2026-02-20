// GitHub 레포(awesome-papers-with-claude-code)를 파싱하여 논문/코스 목록을 반환하는 API
// 디렉토리 구조: <paper-slug>/<course-slug>/{ README.md, CLAUDE.md, knowledge/courses.json }
import { NextResponse } from 'next/server';
import type { Paper, CourseInfo } from '@/types/paper';

const REPO_OWNER = 'ainblockchain';
const REPO_NAME = 'awesome-papers-with-claude-code';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10분

interface CachedData {
  papers: Paper[];
  timestamp: number;
}

let cache: CachedData | null = null;

/** README.md에서 논문 메타데이터를 파싱 */
function parseReadme(content: string) {
  // 제목: "# <Title> Learning Path"
  const titleMatch = content.match(/^#\s+(.+?)\s+Learning Path/m);
  const title = titleMatch?.[1]?.trim() || '';

  // 저자/연도: 'based on "<Title>" by <Authors>, <Year>.'
  const metaMatch = content.match(
    /based on\s*\n?\s*"(.+?)"\s+by\s+(.+?),\s+(\d{4})/
  );
  const authors = metaMatch?.[2] || '';
  const year = metaMatch?.[3] || '';

  // 통계: "N concepts across M courses"
  const statsMatch = content.match(
    /\*{0,2}(\d+)\*{0,2}\s*concepts?\s+across\s+\*{0,2}(\d+)\*{0,2}\s*courses?/
  );
  const totalConcepts = statsMatch ? parseInt(statsMatch[1]) : 0;
  const totalModules = statsMatch ? parseInt(statsMatch[2]) : 0;

  // arXiv ID: "arXiv:XXXX.XXXXX" 패턴
  const arxivMatch = content.match(/arXiv[:\s]+(\d+\.\d+)/);
  const arxivId = arxivMatch?.[1] || '';

  return { title, authors, year, totalConcepts, totalModules, arxivId };
}

/** courses.json에서 코스 요약 정보 추출 */
function parseCourses(
  data: { id: string; title: string; concepts: string[]; lessons: unknown[] }[]
): { totalConcepts: number; totalLessons: number } {
  let totalConcepts = 0;
  let totalLessons = 0;
  for (const course of data) {
    totalConcepts += course.concepts?.length || 0;
    totalLessons += course.lessons?.length || 0;
  }
  return { totalConcepts, totalLessons };
}

/** slug을 사람이 읽기 좋은 이름으로 변환 ("image-recognition" → "Image Recognition") */
function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** raw.githubusercontent.com에서 텍스트 파일 가져오기 (API rate limit 비해당) */
async function fetchRawFile(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${RAW_BASE}/${path}`, { next: { revalidate: 600 } });
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

async function fetchPapersFromGitHub(): Promise<Paper[]> {
  // 1) 레포의 전체 파일 트리를 한 번에 가져옴
  const treeRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/main?recursive=1`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(process.env.GITHUB_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
          : {}),
      },
      next: { revalidate: 600 },
    }
  );

  if (!treeRes.ok) {
    throw new Error(`GitHub tree API failed: ${treeRes.status}`);
  }

  const tree = await treeRes.json();

  // 2) 트리에서 paper-slug/course-slug 구조 파싱
  // README.md 파일을 기준으로 코스 디렉토리를 식별
  const paperMap = new Map<
    string,
    { paperSlug: string; courses: { slug: string; readmePath: string; coursesJsonPath: string }[] }
  >();

  for (const item of tree.tree) {
    const match = item.path.match(/^([^/]+)\/([^/]+)\/README\.md$/);
    if (match) {
      const [, paperSlug, courseSlug] = match;
      if (!paperMap.has(paperSlug)) {
        paperMap.set(paperSlug, { paperSlug, courses: [] });
      }
      paperMap.get(paperSlug)!.courses.push({
        slug: courseSlug,
        readmePath: `${paperSlug}/${courseSlug}/README.md`,
        coursesJsonPath: `${paperSlug}/${courseSlug}/knowledge/courses.json`,
      });
    }
  }

  // 3) 각 논문의 첫 번째 코스 README로 논문 메타데이터를 파싱하고, 모든 코스 정보를 수집
  const papers: Paper[] = await Promise.all(
    Array.from(paperMap.values()).map(async ({ paperSlug, courses }) => {
      // 모든 코스의 README + courses.json을 병렬로 가져옴
      const courseResults = await Promise.all(
        courses.map(async (course) => {
          const [readme, coursesRaw] = await Promise.all([
            fetchRawFile(course.readmePath),
            fetchRawFile(course.coursesJsonPath),
          ]);

          let courseStats = { totalConcepts: 0, totalLessons: 0 };
          if (coursesRaw) {
            try {
              courseStats = parseCourses(JSON.parse(coursesRaw));
            } catch { /* malformed JSON — skip */ }
          }

          return {
            slug: course.slug,
            readme,
            ...courseStats,
          };
        })
      );

      // 첫 번째 코스의 README에서 논문 메타데이터 추출
      const primaryReadme = courseResults.find((c) => c.readme)?.readme || '';
      const meta = parseReadme(primaryReadme);

      // CourseInfo 배열 생성
      const courseInfos: CourseInfo[] = courseResults.map((c) => ({
        slug: c.slug,
        name: slugToName(c.slug),
        totalConcepts: c.totalConcepts,
        totalLessons: c.totalLessons,
      }));

      // 전체 통계 합산
      const allConcepts = courseInfos.reduce((sum, c) => sum + c.totalConcepts, 0);
      const allLessons = courseInfos.reduce((sum, c) => sum + c.totalLessons, 0);

      const paper: Paper = {
        id: paperSlug,
        title: meta.title || slugToName(paperSlug),
        description: `${allConcepts} concepts · ${allLessons} lessons across ${courses.length} course${courses.length > 1 ? 's' : ''}`,
        authors: meta.authors
          ? meta.authors.split(/,\s*(?:and\s+)?/).map((name, i) => ({
              id: `${paperSlug}-${i}`,
              name: name.replace(/\s+et\s+al\.?/, ' et al.').trim(),
            }))
          : [],
        publishedAt: meta.year ? `${meta.year}-01-01` : '',
        thumbnailUrl: '',
        arxivUrl: meta.arxivId
          ? `https://arxiv.org/abs/${meta.arxivId}`
          : '',
        githubUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/main/${paperSlug}`,
        submittedBy: 'community',
        totalStages: courses.length,
        courses: courseInfos,
      };

      return paper;
    })
  );

  // 코스 수 내림차순 정렬 (가장 풍부한 논문이 위로)
  papers.sort((a, b) => (b.courses?.length || 0) - (a.courses?.length || 0));

  return papers;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const id = searchParams.get('id');

  // 캐시 확인
  if (!cache || Date.now() - cache.timestamp > CACHE_TTL_MS) {
    try {
      const papers = await fetchPapersFromGitHub();
      cache = { papers, timestamp: Date.now() };
    } catch (error) {
      console.error('Failed to fetch papers from GitHub:', error);
      // 캐시가 있으면 stale 데이터라도 반환
      if (cache) {
        return NextResponse.json(cache.papers);
      }
      return NextResponse.json([], { status: 500 });
    }
  }

  // 특정 ID로 조회
  if (id) {
    const paper = cache.papers.find((p) => p.id === id);
    return paper
      ? NextResponse.json(paper)
      : NextResponse.json(null, { status: 404 });
  }

  // 검색 쿼리가 있으면 필터링
  if (query) {
    const q = query.toLowerCase();
    const filtered = cache.papers.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.authors.some((a) => a.name.toLowerCase().includes(q))
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(cache.papers);
}
