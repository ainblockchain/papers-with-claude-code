// Papers 어댑터 — GitHub 레포(awesome-papers-with-claude-code)에서 직접 논문/코스 데이터를 가져옴
// paper.json이 있으면 해당 메타데이터 우선 사용, 없으면 README 파싱으로 fallback
import { Paper } from '@/types/paper';


const REPO_OWNER = 'ainblockchain';
const REPO_NAME = 'awesome-papers-with-claude-code';
const REPO_BRANCH = process.env.GITHUB_BRANCH || 'feat/0G-developer-course';
const RAW_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}`;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10분

export interface PapersAdapter {
  fetchTrendingPapers(period: 'daily' | 'weekly' | 'monthly'): Promise<Paper[]>;
  searchPapers(query: string): Promise<Paper[]>;
  getPaperById(id: string): Promise<Paper | null>;
  /** Synchronous lookup (cached data only — returns null if not cached) */
  getPaperByIdSync?(id: string): Paper | null;
}

// ── paper.json 스키마 ─────────────────────────────

interface PaperJsonData {
  title?: string;
  description?: string;
  arxivId?: string;
  githubUrl?: string;
  authors?: { name: string }[];
  publishedAt?: string;
  organization?: { name: string };
  submittedBy?: string;
  thumbnailUrl?: string;
  docsUrl?: string;
  badgeUrl?: string;
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

// ── Paper 빌더 ────────────────────────────────────

/** paper.json(있으면) > README 파싱 > 기본값 우선순위 체인으로 Paper 생성 */
function buildPaper(
  paperSlug: string,
  courseSlug: string,
  readmeMeta: ReturnType<typeof parseReadme>,
  stats: { totalConcepts: number; totalLessons: number },
  paperJson?: PaperJsonData,
): Paper {
  const arxivId = paperJson?.arxivId || readmeMeta.arxivId || '';
  const thumbnailUrl = paperJson?.thumbnailUrl
    || (arxivId ? `https://cdn-thumbnails.huggingface.co/social-thumbnails/papers/${arxivId}.png` : '');

  const courseRepoUrl = `https://github.com/${REPO_OWNER}/${REPO_NAME}/tree/${REPO_BRANCH}/${paperSlug}/${courseSlug}`;

  const authors = paperJson?.authors?.length
    ? paperJson.authors.map((a, i) => ({
        id: `${paperSlug}-${i}`,
        name: a.name,
      }))
    : readmeMeta.authors
      ? readmeMeta.authors.split(/,\s*(?:and\s+)?/).map((name, i) => ({
          id: `${paperSlug}-${courseSlug}-${i}`,
          name: name.replace(/\s+et\s+al\.?/, ' et al.').trim(),
        }))
      : [];

  const statsDescription = `${stats.totalConcepts} concepts · ${stats.totalLessons} lessons across ${readmeMeta.totalModules || 1} module${(readmeMeta.totalModules || 1) > 1 ? 's' : ''}`;

  return {
    id: `${paperSlug}--${courseSlug}`,
    title: paperJson?.title || readmeMeta.title || slugToName(paperSlug),
    description: paperJson?.description || statsDescription,
    authors,
    publishedAt: paperJson?.publishedAt || (readmeMeta.year ? `${readmeMeta.year}-01-01` : ''),
    thumbnailUrl,
    arxivUrl: paperJson?.docsUrl || (arxivId ? `https://arxiv.org/abs/${arxivId}` : ''),
    githubUrl: paperJson?.githubUrl,
    courseRepoUrl,
    submittedBy: paperJson?.submittedBy || 'community',
    totalStages: readmeMeta.totalModules || 1,
    courseName: slugToName(courseSlug),
    organization: paperJson?.organization
      ? { name: paperJson.organization.name, logoUrl: '' }
      : undefined,
    badgeUrl: paperJson?.badgeUrl
      ? `${RAW_BASE}/${paperSlug}/${paperJson.badgeUrl}`
      : undefined,
  };
}

// ── GitHub 데이터 fetching ─────────────────────

async function fetchPapersFromGitHub(): Promise<Paper[]> {
  // 1) Git Trees API로 전체 디렉토리 구조를 한 번에 가져옴 (1 API call)
  const treeRes = await fetch(
    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/git/trees/${REPO_BRANCH}?recursive=1`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );

  if (!treeRes.ok) {
    throw new Error(`GitHub tree API failed: ${treeRes.status}`);
  }

  const tree = await treeRes.json();

  // 2) 트리에서 코스 및 paper.json 식별
  const courses: { paperSlug: string; courseSlug: string }[] = [];
  const paperJsonSlugs = new Set<string>();
  const courseJsonKeys = new Set<string>(); // "paperSlug/courseSlug" 형태

  for (const item of tree.tree) {
    const courseMatch = item.path.match(/^([^/]+)\/([^/]+)\/README\.md$/);
    if (courseMatch) {
      courses.push({ paperSlug: courseMatch[1], courseSlug: courseMatch[2] });
    }
    const paperJsonMatch = item.path.match(/^([^/]+)\/paper\.json$/);
    if (paperJsonMatch) {
      paperJsonSlugs.add(paperJsonMatch[1]);
    }
    const courseJsonMatch = item.path.match(/^([^/]+)\/([^/]+)\/paper\.json$/);
    if (courseJsonMatch) {
      courseJsonKeys.add(`${courseJsonMatch[1]}/${courseJsonMatch[2]}`);
    }
  }

  // 3) 논문 단위로 paper.json 한 번만 fetch (같은 논문의 여러 코스가 공유)
  const paperJsonCache = new Map<string, PaperJsonData>();
  const uniquePaperSlugs = [...new Set(courses.map((c) => c.paperSlug))];

  await Promise.all(
    uniquePaperSlugs
      .filter((slug) => paperJsonSlugs.has(slug))
      .map(async (slug) => {
        const raw = await fetchRawFile(`${slug}/paper.json`);
        if (raw) {
          try {
            paperJsonCache.set(slug, JSON.parse(raw));
          } catch { /* malformed JSON */ }
        }
      })
  );

  // 4) 코스별 paper.json fetch (있는 코스만)
  const courseJsonCache = new Map<string, PaperJsonData>();
  await Promise.all(
    courses
      .filter(({ paperSlug, courseSlug }) => courseJsonKeys.has(`${paperSlug}/${courseSlug}`))
      .map(async ({ paperSlug, courseSlug }) => {
        const raw = await fetchRawFile(`${paperSlug}/${courseSlug}/paper.json`);
        if (raw) {
          try {
            courseJsonCache.set(`${paperSlug}/${courseSlug}`, JSON.parse(raw));
          } catch { /* malformed JSON */ }
        }
      })
  );

  // 5) 각 코스별 Paper 카드 생성 (코스 paper.json > 부모 paper.json > README fallback)
  const papers = await Promise.all(
    courses.map(async ({ paperSlug, courseSlug }) => {
      const [readme, coursesRaw] = await Promise.all([
        fetchRawFile(`${paperSlug}/${courseSlug}/README.md`),
        fetchRawFile(`${paperSlug}/${courseSlug}/knowledge/courses.json`),
      ]);

      const meta = parseReadme(readme || '');

      let stats = { totalConcepts: 0, totalLessons: 0 };
      if (coursesRaw) {
        try {
          stats = parseCourseStats(JSON.parse(coursesRaw));
        } catch { /* malformed JSON */ }
      }

      // 코스별 paper.json이 있으면 부모 paper.json 위에 머지
      const parentJson = paperJsonCache.get(paperSlug);
      const courseJson = courseJsonCache.get(`${paperSlug}/${courseSlug}`);
      const mergedJson = courseJson ? { ...parentJson, ...courseJson } : parentJson;

      return buildPaper(paperSlug, courseSlug, meta, stats, mergedJson);
    })
  );

  // 개념 수 내림차순 정렬
  papers.sort((a, b) => {
    const aCount = parseInt(a.description) || 0;
    const bCount = parseInt(b.description) || 0;
    return bCount - aCount;
  });

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
      return [];
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
      return [];
    }
  }

  async getPaperById(id: string): Promise<Paper | null> {
    try {
      const papers = await this.getPapers();
      return papers.find((p) => p.id === id) ?? null;
    } catch {
      return this.cachedPapers.find((p) => p.id === id) ?? null;
    }
  }

  getPaperByIdSync(id: string): Paper | null {
    return this.cachedPapers.find((p) => p.id === id) ?? null;
  }
}

export const papersAdapter: PapersAdapter = new GitHubPapersAdapter();
