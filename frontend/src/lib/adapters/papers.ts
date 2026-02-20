// Papers 어댑터 — GitHub 레포(awesome-papers-with-claude-code)에서 직접 논문/코스 데이터를 가져옴
// FE에서 바로 GitHub로 호출 (public repo이므로 인증 불필요, raw.githubusercontent.com은 rate limit 비해당)
import { Paper, CourseInfo } from '@/types/paper';
import { MOCK_PAPERS } from '@/constants/mock-papers';

const REPO_OWNER = 'ainblockchain';
const REPO_NAME = 'awesome-papers-with-claude-code';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main`;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10분

export interface PapersAdapter {
  fetchTrendingPapers(period: 'daily' | 'weekly' | 'monthly'): Promise<Paper[]>;
  searchPapers(query: string): Promise<Paper[]>;
  getPaperById(id: string): Promise<Paper | null>;
  /** Synchronous lookup (cached data only — returns null if not cached) */
  getPaperByIdSync?(id: string): Paper | null;
}

// ── 파싱 유틸 ──────────────────────────────────

/** README.md에서 논문 메타데이터를 파싱 */
function parseReadme(content: string) {
  const titleMatch = content.match(/^#\s+(.+?)\s+Learning Path/m);
  const title = titleMatch?.[1]?.trim() || '';

  const metaMatch = content.match(
    /based on\s*\n?\s*"(.+?)"\s+by\s+(.+?),\s+(\d{4})/
  );
  const authors = metaMatch?.[2] || '';
  const year = metaMatch?.[3] || '';

  const statsMatch = content.match(
    /\*{0,2}(\d+)\*{0,2}\s*concepts?\s+across\s+\*{0,2}(\d+)\*{0,2}\s*courses?/
  );
  const totalConcepts = statsMatch ? parseInt(statsMatch[1]) : 0;
  const totalModules = statsMatch ? parseInt(statsMatch[2]) : 0;

  const arxivMatch = content.match(/arXiv[:\s]+(\d+\.\d+)/);
  const arxivId = arxivMatch?.[1] || '';

  return { title, authors, year, totalConcepts, totalModules, arxivId };
}

/** courses.json에서 코스 통계 추출 */
function parseCourseStats(
  data: { concepts?: string[]; lessons?: unknown[] }[]
): { totalConcepts: number; totalLessons: number } {
  let totalConcepts = 0;
  let totalLessons = 0;
  for (const course of data) {
    totalConcepts += course.concepts?.length || 0;
    totalLessons += course.lessons?.length || 0;
  }
  return { totalConcepts, totalLessons };
}

/** slug → 사람이 읽기 좋은 이름 ("image-recognition" → "Image Recognition") */
function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** raw.githubusercontent.com에서 파일 내용 가져오기 (rate limit 비해당) */
async function fetchRawFile(path: string): Promise<string | null> {
  try {
    const res = await fetch(`${RAW_BASE}/${path}`);
    if (!res.ok) return null;
    return res.text();
  } catch {
    return null;
  }
}

// ── GitHub 데이터 fetching ─────────────────────

async function fetchPapersFromGitHub(): Promise<Paper[]> {
  // 1) Git Trees API로 전체 디렉토리 구조를 한 번에 가져옴 (1 API call)
  const treeRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/main?recursive=1`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );

  if (!treeRes.ok) {
    throw new Error(`GitHub tree API failed: ${treeRes.status}`);
  }

  const tree = await treeRes.json();

  // 2) 트리에서 <paper-slug>/<course-slug>/README.md 패턴으로 코스 식별
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

  // 3) 각 논문별로 README + courses.json을 병렬 fetch → Paper 객체로 변환
  const papers = await Promise.all(
    Array.from(paperMap.values()).map(async ({ paperSlug, courses }) => {
      const courseResults = await Promise.all(
        courses.map(async (course) => {
          const [readme, coursesRaw] = await Promise.all([
            fetchRawFile(course.readmePath),
            fetchRawFile(course.coursesJsonPath),
          ]);

          let courseStats = { totalConcepts: 0, totalLessons: 0 };
          if (coursesRaw) {
            try {
              courseStats = parseCourseStats(JSON.parse(coursesRaw));
            } catch { /* malformed JSON */ }
          }

          return { slug: course.slug, readme, ...courseStats };
        })
      );

      // 첫 번째 코스 README에서 논문 메타데이터 추출
      const primaryReadme = courseResults.find((c) => c.readme)?.readme || '';
      const meta = parseReadme(primaryReadme);

      const courseInfos: CourseInfo[] = courseResults.map((c) => ({
        slug: c.slug,
        name: slugToName(c.slug),
        totalConcepts: c.totalConcepts,
        totalLessons: c.totalLessons,
      }));

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
        arxivUrl: meta.arxivId ? `https://arxiv.org/abs/${meta.arxivId}` : '',
        githubUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/main/${paperSlug}`,
        submittedBy: 'community',
        totalStages: courses.length,
        courses: courseInfos,
      };

      return paper;
    })
  );

  papers.sort((a, b) => (b.courses?.length || 0) - (a.courses?.length || 0));
  return papers;
}

// ── Adapter 구현 ───────────────────────────────

class GitHubPapersAdapter implements PapersAdapter {
  private cachedPapers: Paper[] = [];
  private cacheTimestamp = 0;

  private async getPapers(): Promise<Paper[]> {
    if (this.cachedPapers.length > 0 && Date.now() - this.cacheTimestamp < CACHE_TTL_MS) {
      return this.cachedPapers;
    }

    const papers = await fetchPapersFromGitHub();
    this.cachedPapers = papers;
    this.cacheTimestamp = Date.now();
    return papers;
  }

  async fetchTrendingPapers(): Promise<Paper[]> {
    try {
      return await this.getPapers();
    } catch (error) {
      console.warn('GitHub papers fetch failed, falling back to mock:', error);
      return MOCK_PAPERS;
    }
  }

  async searchPapers(query: string): Promise<Paper[]> {
    try {
      const papers = await this.getPapers();
      const q = query.toLowerCase();
      return papers.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.authors.some((a) => a.name.toLowerCase().includes(q))
      );
    } catch {
      return MOCK_PAPERS.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.description.toLowerCase().includes(query.toLowerCase())
      );
    }
  }

  async getPaperById(id: string): Promise<Paper | null> {
    try {
      const papers = await this.getPapers();
      return papers.find((p) => p.id === id) ?? null;
    } catch {
      return this.cachedPapers.find((p) => p.id === id)
        ?? MOCK_PAPERS.find((p) => p.id === id)
        ?? null;
    }
  }

  getPaperByIdSync(id: string): Paper | null {
    return this.cachedPapers.find((p) => p.id === id)
      ?? MOCK_PAPERS.find((p) => p.id === id)
      ?? null;
  }
}

export const papersAdapter: PapersAdapter = new GitHubPapersAdapter();
