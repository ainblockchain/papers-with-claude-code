// GitHub API client for fetching course data from the awesome-papers-with-claude-code repository.
//
// Repository structure:
//   {paper-slug}/
//     {course-slug}/
//       README.md
//       CLAUDE.md
//       knowledge/
//         courses.json
//         graph.json

const GITHUB_OWNER = 'ainblockchain';
const GITHUB_REPO = 'awesome-papers-with-claude-code';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents`;

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitHubCourseEntry {
  paperSlug: string;
  courseSlug: string;
  path: string; // e.g. "attention-is-all-you-need/bible/knowledge"
}

export interface CoursesJsonLesson {
  concept_id: string;
  title: string;
  key_ideas: string[];
  exercise: string;
  explanation: string;
  prerequisites: string[];
}

export interface CoursesJson {
  id: string;
  title: string;
  description?: string;
  concepts: string[];
  lessons: CoursesJsonLesson[];
}

/** Shape returned by the GitHub Contents API for directory listings. */
interface GitHubContentEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  content?: string;
  encoding?: string;
}

// ---------------------------------------------------------------------------
// In-memory cache
// ---------------------------------------------------------------------------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'papers-with-claudecode-frontend',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function githubFetch<T>(path: string): Promise<T> {
  const url = `${GITHUB_API_BASE}/${path}`;
  const response = await fetch(url, { headers: buildHeaders() });

  if (!response.ok) {
    // If rate-limited, try to return cached data before throwing.
    if (response.status === 403 || response.status === 429) {
      const resetHeader = response.headers.get('x-ratelimit-reset');
      const resetAt = resetHeader
        ? new Date(Number(resetHeader) * 1000).toISOString()
        : 'unknown';
      throw new Error(
        `GitHub API rate limit exceeded. Resets at ${resetAt}. ` +
          'Set GITHUB_TOKEN env var for higher rate limits.',
      );
    }
    if (response.status === 404) {
      throw new Error(`GitHub resource not found: ${path}`);
    }
    throw new Error(
      `GitHub API request failed: ${response.status} ${response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * List directory entries at the given repo path.
 * Results are cached for `CACHE_TTL_MS`.
 */
async function listDirectory(path: string): Promise<GitHubContentEntry[]> {
  const cacheKey = `dir:${path}`;
  const cached = getCached<GitHubContentEntry[]>(cacheKey);
  if (cached) return cached;

  try {
    const entries = await githubFetch<GitHubContentEntry[]>(path);
    setCache(cacheKey, entries);
    return entries;
  } catch (error) {
    // On rate-limit errors, fall back to stale cache if available.
    const stale = cache.get(cacheKey);
    if (stale) return stale.data as GitHubContentEntry[];
    throw error;
  }
}

/**
 * Fetch and decode a single file's content from the GitHub Contents API.
 * The API returns file content as base64.
 */
async function fetchFileContent(path: string): Promise<string> {
  const entry = await githubFetch<GitHubContentEntry>(path);

  if (!entry.content || entry.encoding !== 'base64') {
    throw new Error(
      `Unexpected file encoding for ${path}: ${entry.encoding ?? 'none'}`,
    );
  }

  // Decode base64 content. Works in both Node.js and Edge runtimes.
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(entry.content, 'base64').toString('utf-8');
  }
  // Fallback for edge/browser environments
  return new TextDecoder().decode(
    Uint8Array.from(atob(entry.content), (c) => c.charCodeAt(0)),
  );
}

// ---------------------------------------------------------------------------
// Ignore list – top-level directories that are NOT paper slugs
// ---------------------------------------------------------------------------

const IGNORED_DIRS = new Set(['.github', 'node_modules', '.git']);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List all available courses from the GitHub repository.
 *
 * Traverses the repository root to find paper directories, then for each
 * paper lists course directories (those containing a `knowledge/` sub-dir
 * or at minimum being a direct child directory of a paper).
 */
export async function listCourses(): Promise<GitHubCourseEntry[]> {
  const cacheKey = 'allCourses';
  const cached = getCached<GitHubCourseEntry[]>(cacheKey);
  if (cached) return cached;

  // 1. List root – each directory is a paper slug.
  const rootEntries = await listDirectory('');
  const paperDirs = rootEntries.filter(
    (e) => e.type === 'dir' && !IGNORED_DIRS.has(e.name) && !e.name.startsWith('.'),
  );

  // 2. For each paper, list its children to find course slugs.
  const results: GitHubCourseEntry[] = [];

  const settled = await Promise.allSettled(
    paperDirs.map(async (paperDir) => {
      const children = await listDirectory(paperDir.path);
      const courseDirs = children.filter((c) => c.type === 'dir');
      return courseDirs.map((courseDir) => ({
        paperSlug: paperDir.name,
        courseSlug: courseDir.name,
        path: `${paperDir.name}/${courseDir.name}/knowledge`,
      }));
    }),
  );

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(...result.value);
    }
    // Silently skip papers whose listing failed (e.g. rate limit on one).
  }

  setCache(cacheKey, results);
  return results;
}

/**
 * Fetch `courses.json` for a specific paper + course combination.
 *
 * The file is expected at `{paperSlug}/{courseSlug}/knowledge/courses.json`.
 * Returns the parsed JSON, which is an array of `CoursesJson` objects.
 */
export async function fetchCoursesJson(
  paperSlug: string,
  courseSlug: string,
): Promise<CoursesJson[]> {
  const path = `${paperSlug}/${courseSlug}/knowledge/courses.json`;
  const raw = await fetchFileContent(path);

  try {
    const parsed = JSON.parse(raw);
    // Normalize: if the file contains a single object, wrap in array.
    return Array.isArray(parsed) ? (parsed as CoursesJson[]) : [parsed as CoursesJson];
  } catch {
    throw new Error(`Failed to parse courses.json at ${path}: invalid JSON`);
  }
}

/**
 * Fetch `README.md` for a specific paper + course combination.
 *
 * Useful for extracting metadata such as course title, author, description.
 * Returns the raw Markdown string.
 */
export async function fetchCourseReadme(
  paperSlug: string,
  courseSlug: string,
): Promise<string> {
  const path = `${paperSlug}/${courseSlug}/README.md`;
  return fetchFileContent(path);
}

interface GitHubCommit {
  commit: { committer: { date: string } };
}

/**
 * Fetch the latest commit date for a course directory via GitHub Commits API.
 * Returns an ISO date string (e.g. "2024-06-15") or throws on failure.
 */
export async function fetchCourseCreatedAt(
  paperSlug: string,
  courseSlug: string,
): Promise<string> {
  const cacheKey = `commitDate:${paperSlug}/${courseSlug}`;
  const cached = getCached<string>(cacheKey);
  if (cached) return cached;

  const url =
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits` +
    `?path=${encodeURIComponent(`${paperSlug}/${courseSlug}`)}&per_page=1`;

  const response = await fetch(url, { headers: buildHeaders() });
  if (!response.ok) {
    throw new Error(`GitHub Commits API failed: ${response.status}`);
  }

  const commits: GitHubCommit[] = await response.json();
  if (commits.length === 0) {
    throw new Error(`No commits found for ${paperSlug}/${courseSlug}`);
  }

  const isoDate = commits[0].commit.committer.date.split('T')[0];
  setCache(cacheKey, isoDate);
  return isoDate;
}
