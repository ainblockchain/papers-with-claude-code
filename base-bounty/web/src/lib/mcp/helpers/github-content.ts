/**
 * Fetches actual repository content from GitHub.
 * Uses Git Trees API for file listing, raw.githubusercontent.com for file contents.
 * Uses GITHUB_TOKEN env var if available (5000 req/hr), falls back to unauth (60 req/hr).
 */

export interface RepoContent {
  readme: string;
  keyFiles: { path: string; content: string }[];
  structure: string[];
}

const MAX_README_CHARS = 15_000;
const MAX_FILE_CHARS = 10_000;
const KEY_FILE_COUNT = 3;

/** Directories that never contain key implementation files */
const EXCLUDED_DIRS = /^(docs?|tests?|__pycache__|\.github|examples?|scripts|benchmarks?|notebooks?|\.vscode|\.idea|dist|build|node_modules)\//i;

/** Relevance score for source files — higher is better, 0 = skip */
function fileRelevance(path: string): number {
  const name = path.split('/').pop()?.toLowerCase() || '';
  const dir = path.toLowerCase();

  // Exclude non-source directories entirely
  if (EXCLUDED_DIRS.test(dir)) return 0;

  // Skip config/setup/build files
  if (name === 'setup.py' || name === 'setup.cfg' || name === 'conf.py') return 0;
  if (name === 'conftest.py' || name.startsWith('test_') || name.endsWith('_test.py')) return 0;

  // Priority files for ML paper repos
  if (name === 'model.py' || name === 'models.py') return 100;
  if (name === 'train.py' || name === 'training.py') return 90;
  if (name === 'main.py') return 85;
  if (name === 'index.ts' || name === 'index.js') return 80;
  if (name === 'app.py' || name === 'run.py') return 75;
  if (name === 'attention.py' || name === 'transformer.py') return 70;
  if (name === 'network.py' || name === 'layers.py' || name === 'modules.py') return 65;

  // Files in src/ or lib/ directory get a boost
  if (dir.startsWith('src/') || dir.includes('/src/') || dir.includes('/lib/')) {
    if (name.endsWith('.py')) return 60;
    if (name.endsWith('.ts') || name.endsWith('.js')) return 55;
  }

  // Any Python/TS/JS source file at package root
  if (!dir.includes('/') && name.endsWith('.py')) return 40;
  if (name.endsWith('.py')) return 30;
  if (name.endsWith('.ts') || name.endsWith('.js')) return 25;

  return 0;
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'User-Agent': 'cogito-mcp/1.0',
    Accept: 'application/vnd.github+json',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/** Parse owner/repo from a GitHub URL */
function parseRepoUrl(repoUrl: string): { owner: string; repo: string } | null {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function fetchRepoTree(owner: string, repo: string): Promise<string[]> {
  try {
    // Try default branch via the trees API
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
      { headers: githubHeaders() },
    );
    if (!res.ok) return [];

    const data = (await res.json()) as any;
    const tree = data?.tree;
    if (!Array.isArray(tree)) return [];

    return tree
      .filter((item: any) => item.type === 'blob')
      .map((item: any) => item.path as string);
  } catch {
    return [];
  }
}

async function fetchRawFile(owner: string, repo: string, path: string): Promise<string> {
  try {
    const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'cogito-mcp/1.0' },
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

export async function fetchGithubContent(repoUrl: string): Promise<RepoContent> {
  const parsed = parseRepoUrl(repoUrl);
  if (!parsed) {
    return { readme: '', keyFiles: [], structure: [] };
  }

  const { owner, repo } = parsed;

  // Fetch tree and README in parallel
  const [structure, readme] = await Promise.all([
    fetchRepoTree(owner, repo),
    fetchRawFile(owner, repo, 'README.md'),
  ]);

  // If no README.md, try readme.md or README.rst
  let readmeContent = readme;
  if (!readmeContent) {
    const alternatives = ['readme.md', 'README.rst', 'readme.rst', 'README'];
    for (const alt of alternatives) {
      if (structure.includes(alt)) {
        readmeContent = await fetchRawFile(owner, repo, alt);
        if (readmeContent) break;
      }
    }
  }

  // Truncate README
  if (readmeContent.length > MAX_README_CHARS) {
    readmeContent = readmeContent.slice(0, MAX_README_CHARS) + '\n\n... (truncated)';
  }

  // Find key source files
  const sourceFiles = structure
    .map((path) => ({ path, score: fileRelevance(path) }))
    .filter((f) => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, KEY_FILE_COUNT);

  // Fetch key files in parallel
  const keyFiles = await Promise.all(
    sourceFiles.map(async ({ path }) => {
      let content = await fetchRawFile(owner, repo, path);
      if (content.length > MAX_FILE_CHARS) {
        content = content.slice(0, MAX_FILE_CHARS) + '\n\n// ... (truncated)';
      }
      return { path, content };
    }),
  );

  return {
    readme: readmeContent,
    keyFiles: keyFiles.filter((f) => f.content.length > 0),
    structure,
  };
}
