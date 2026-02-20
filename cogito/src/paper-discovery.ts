/**
 * Paper + Code discovery.
 * Fetches papers from arXiv and finds corresponding GitHub repos.
 */

export interface Paper {
  arxivId: string;
  title: string;
  authors: string[];
  abstract: string;
  categories: string[];
  published: string;
  url: string;
  codeUrl?: string; // GitHub repo URL if found
}

// Topic -> arXiv query mapping
const TOPIC_QUERIES: Record<string, string> = {
  'ai/transformers': 'cat:cs.CL+AND+all:transformer',
  'ai/transformers/attention': 'cat:cs.CL+AND+all:attention+mechanism',
  'ai/reinforcement-learning': 'cat:cs.LG+AND+all:reinforcement+learning',
  'ai/state-space-models': 'cat:cs.LG+AND+(all:state+space+model+OR+all:Mamba+OR+all:S4)',
  'ai/diffusion': 'cat:cs.CV+AND+all:diffusion+model',
  'ai/multimodal': 'cat:cs.CV+AND+(all:multimodal+OR+all:vision+language)',
  'ai/alignment': 'cat:cs.AI+AND+(all:alignment+OR+all:RLHF)',
  'ai/agents': 'cat:cs.AI+AND+(all:autonomous+agent+OR+all:tool+use+LLM)',
  'crypto/consensus': 'cat:cs.DC+AND+all:consensus+protocol',
  'crypto/zk': 'cat:cs.CR+AND+(all:zero+knowledge+proof+OR+all:zkSNARK)',
};

function topicToQuery(topicPath: string): string {
  if (TOPIC_QUERIES[topicPath]) return TOPIC_QUERIES[topicPath];
  const parts = topicPath.split('/');
  const terms = parts.map(p => p.replace(/-/g, ' ')).join(' ');
  return `all:${encodeURIComponent(terms)}`;
}

/**
 * Fetch papers from arXiv.
 */
export async function fetchPapers(topicPath: string, maxResults = 5): Promise<Paper[]> {
  const query = topicToQuery(topicPath);
  const url = `http://export.arxiv.org/api/query?search_query=${query}&sortBy=relevance&sortOrder=descending&max_results=${maxResults}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`arXiv API error: ${response.status}`);
  const xml = await response.text();
  const papers = parseArxivResponse(xml);

  // Try to find code repos for each paper
  for (const paper of papers) {
    paper.codeUrl = extractCodeUrl(paper.abstract) || await findCodeRepo(paper.arxivId);
  }

  return papers;
}

/**
 * Extract GitHub URL from paper abstract.
 */
function extractCodeUrl(abstract: string): string | undefined {
  const githubMatch = abstract.match(/https?:\/\/github\.com\/[^\s)]+/);
  return githubMatch ? githubMatch[0].replace(/[.,;]$/, '') : undefined;
}

/**
 * Try to find code via Papers with Code API.
 */
async function findCodeRepo(arxivId: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://paperswithcode.com/api/v1/papers/?arxiv_id=${arxivId}`);
    if (!res.ok) return undefined;
    const data = await res.json();
    if (data.results?.length > 0) {
      const paperId = data.results[0].id;
      const repoRes = await fetch(`https://paperswithcode.com/api/v1/papers/${paperId}/repositories/`);
      if (repoRes.ok) {
        const repos = await repoRes.json();
        if (repos.results?.length > 0) {
          return repos.results[0].url;
        }
      }
    }
  } catch {
    // Papers with Code may not have this paper
  }
  return undefined;
}

/**
 * Fetch papers by free-form keywords (for lesson enrichment).
 * Converts keywords into an arXiv query and searches.
 */
export async function fetchPapersByKeywords(keywords: string[], maxResults = 5): Promise<Paper[]> {
  const terms = keywords.map(k => `all:${encodeURIComponent(k)}`).join('+AND+');
  const url = `http://export.arxiv.org/api/query?search_query=${terms}&sortBy=relevance&sortOrder=descending&max_results=${maxResults}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`arXiv API error: ${response.status}`);
  const xml = await response.text();
  const papers = parseArxivResponse(xml);

  // Find official code repos for each paper
  for (const paper of papers) {
    paper.codeUrl = extractCodeUrl(paper.abstract) || await findCodeRepo(paper.arxivId);
  }

  return papers;
}

/**
 * Fetch key source files from a GitHub repo.
 * Returns an array of { path, content } for the most relevant files.
 */
export async function fetchRepoFiles(repoUrl: string, maxFiles = 5): Promise<Array<{ path: string; content: string }>> {
  const files: Array<{ path: string; content: string }> = [];

  try {
    // Extract owner/repo from GitHub URL
    const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/);
    if (!match) return files;
    const ownerRepo = match[1].replace(/\.git$/, '');

    // Get repo file tree via GitHub API
    const treeRes = await fetch(`https://api.github.com/repos/${ownerRepo}/git/trees/main?recursive=1`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
    });

    let tree: any;
    if (treeRes.ok) {
      tree = await treeRes.json();
    } else {
      // Try 'master' branch
      const masterRes = await fetch(`https://api.github.com/repos/${ownerRepo}/git/trees/master?recursive=1`, {
        headers: { 'Accept': 'application/vnd.github.v3+json' },
      });
      if (!masterRes.ok) return files;
      tree = await masterRes.json();
    }

    if (!tree.tree) return files;

    // Prioritize key files: model definitions, training scripts, configs, READMEs
    const keyPatterns = [
      /readme\.md$/i,
      /model\.(py|ts|js)$/i,
      /train\.(py|ts|js)$/i,
      /config\.(py|yaml|yml|json)$/i,
      /main\.(py|ts|js)$/i,
      /forward|inference|predict/i,
      /architecture|network|module/i,
    ];

    const candidates: string[] = [];
    for (const item of tree.tree) {
      if (item.type !== 'blob') continue;
      if (item.size > 50000) continue; // Skip large files
      // Skip non-code files
      if (!/\.(py|ts|js|yaml|yml|json|md)$/i.test(item.path)) continue;
      // Skip test/docs/vendor dirs
      if (/^(test|tests|docs|vendor|node_modules|\.github)\//i.test(item.path)) continue;

      for (const pattern of keyPatterns) {
        if (pattern.test(item.path)) {
          candidates.push(item.path);
          break;
        }
      }
    }

    // Fetch content of top candidates
    for (const filePath of candidates.slice(0, maxFiles)) {
      try {
        const rawUrl = `https://raw.githubusercontent.com/${ownerRepo}/main/${filePath}`;
        const res = await fetch(rawUrl);
        if (!res.ok) {
          const masterUrl = `https://raw.githubusercontent.com/${ownerRepo}/master/${filePath}`;
          const res2 = await fetch(masterUrl);
          if (!res2.ok) continue;
          const content = await res2.text();
          files.push({ path: filePath, content: content.slice(0, 10000) }); // Cap at 10KB
        } else {
          const content = await res.text();
          files.push({ path: filePath, content: content.slice(0, 10000) });
        }
      } catch {}
    }
  } catch (err: any) {
    console.log(`[Discovery] Failed to fetch repo files from ${repoUrl}: ${err.message}`);
  }

  return files;
}

// ---------------------------------------------------------------------------
// arXiv XML parsing
// ---------------------------------------------------------------------------

function parseArxivResponse(xml: string): Paper[] {
  const papers: Paper[] = [];
  const entries = xml.split('<entry>').slice(1);
  for (const entry of entries) {
    const paper = parseEntry(entry);
    if (paper) papers.push(paper);
  }
  return papers;
}

function parseEntry(xml: string): Paper | null {
  const id = extractTag(xml, 'id');
  const title = extractTag(xml, 'title')?.replace(/\s+/g, ' ').trim();
  const abstract = extractTag(xml, 'summary')?.replace(/\s+/g, ' ').trim();
  const published = extractTag(xml, 'published');
  if (!id || !title || !abstract) return null;

  const arxivId = id.replace('http://arxiv.org/abs/', '').replace(/v\d+$/, '');

  const authors: string[] = [];
  for (const match of xml.matchAll(/<author>\s*<name>([^<]+)<\/name>/g)) {
    authors.push(match[1].trim());
  }

  const categories: string[] = [];
  for (const match of xml.matchAll(/category[^>]*term="([^"]+)"/g)) {
    categories.push(match[1]);
  }

  return { arxivId, title, authors, abstract, categories, published: published || '', url: `https://arxiv.org/abs/${arxivId}` };
}

function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : null;
}
