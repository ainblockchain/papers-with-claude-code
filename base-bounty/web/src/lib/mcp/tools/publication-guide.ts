/**
 * publication_guide MCP tool.
 * Takes a lesson title/content/tags and enriches it with related
 * arXiv papers and GitHub repos, returning a publication-ready guide
 * with full paper text excerpts and code snippets.
 */

import { z } from 'zod';
import { searchArxiv, type ArxivPaper } from './search-arxiv';
import { findGithubRepo, type RepoResult } from './find-github-repo';

export const publicationGuideSchema = {
  title: z.string().describe('Title of the lesson or topic'),
  content: z.string().describe('Content/description of the lesson'),
  tags: z.array(z.string()).describe('Tags categorizing the lesson'),
};

interface PaperRef {
  id: string;
  title: string;
  url: string;
}

interface RepoRef {
  url: string;
  description: string;
}

interface PublicationGuideResult {
  title: string;
  summary: string;
  content: string;
  tags: string[];
  papers: PaperRef[];
  repos: RepoRef[];
}

/**
 * Score a paper's relevance to a search query.
 * Combines title-query word overlap with educational value signals.
 * Range: 0.0 to 1.0+
 */
function paperRelevance(paperTitle: string, query: string): number {
  const stopWords = new Set([
    'a', 'an', 'the', 'of', 'in', 'on', 'for', 'and', 'or', 'to', 'with',
    'by', 'its', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'this',
    'that', 'from', 'as', 'at', 'based', 'using', 'via', 'novel', 'new',
  ]);

  const tokenize = (text: string): string[] =>
    text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/)
      .filter((w) => w.length > 1 && !stopWords.has(w));

  const queryTokens = tokenize(query);
  const titleTokens = tokenize(paperTitle);

  if (queryTokens.length === 0 || titleTokens.length === 0) return 0;

  // Word overlap: what fraction of query words appear in the paper title
  const titleSet = new Set(titleTokens);
  const overlap = queryTokens.filter((w) => titleSet.has(w)).length;
  const overlapScore = overlap / queryTokens.length;

  // Educational value bonus: surveys, tutorials, reviews are more valuable for learners
  const titleLower = paperTitle.toLowerCase();
  const educationalBonus =
    /\b(survey|tutorial|overview|review|comprehensive|introduction)\b/.test(titleLower) ? 0.2 : 0;

  // Penalty for papers that are clearly domain-specific applications
  const applicationPenalty =
    /\b(fault diagnosis|bearing|runway|prediction|detection|clinical|medical|crop)\b/i.test(titleLower) ? 0.3 : 0;

  return Math.max(0, overlapScore + educationalBonus - applicationPenalty);
}

/**
 * Combined paper quality score: balances relevance to query with citation impact.
 * Uses log-scale for citations so a 100x citation difference doesn't dominate relevance.
 */
function paperScore(paper: ArxivPaper, query: string): number {
  const relevance = paperRelevance(paper.title, query);
  const citationImpact = Math.log10(Math.max(paper.citationCount ?? 0, 1) + 1) / 6; // normalize ~0-1
  // Weight: 60% relevance, 40% citation impact
  return relevance * 0.6 + citationImpact * 0.4;
}

export async function publicationGuide(args: {
  title: string;
  content: string;
  tags: string[];
}): Promise<PublicationGuideResult> {
  const { title, content, tags } = args;

  // Build a search query from title + tags
  const query = [title, ...tags.slice(0, 3)].join(' ');

  // 1. Search for related papers with full text for the top result
  const { papers: rawPapers } = await searchArxiv({ query, maxResults: 5, includeFullText: true });

  // Filter out irrelevant papers (relevance < 0.1 means they mention a keyword
  // but are about an unrelated domain, e.g. "fault diagnosis of rolling bearings"
  // for a self-attention query). Keep all if filtering would remove everything.
  const relevantPapers = rawPapers.filter((p) => paperRelevance(p.title, query) >= 0.1);
  const papers = relevantPapers.length > 0 ? relevantPapers : rawPapers;

  // Sort papers by relevance score for consistent ordering throughout
  papers.sort((a, b) => paperScore(b, query) - paperScore(a, query));

  // 2. Find GitHub repos for top papers (parallel, limit to 3)
  // Include content for the first repo only to keep response size manageable
  let repoResults: (RepoResult | null)[];
  if (papers.length > 0) {
    repoResults = await Promise.all(
      papers.slice(0, 3).map(async (paper, index) => {
        const { repo } = await findGithubRepo({
          paperTitle: paper.title,
          authors: paper.authors,
          includeContent: index === 0,
        });
        return repo;
      }),
    );
  } else {
    // Fallback: search GitHub directly with the lesson title when arXiv is unavailable
    const { repo } = await findGithubRepo({
      paperTitle: title,
      includeContent: true,
    });
    repoResults = repo ? [repo] : [];
  }

  // Deduplicate repos by URL
  const seenUrls = new Set<string>();
  const dedupedRepos = repoResults.filter((r): r is NonNullable<typeof r> => {
    if (!r) return false;
    const normalized = r.url.replace(/\.git$/, '').replace(/\/$/, '').toLowerCase();
    if (seenUrls.has(normalized)) return false;
    seenUrls.add(normalized);
    return true;
  });

  const paperRefs: PaperRef[] = papers.map((p) => ({
    id: p.id,
    title: p.title,
    url: p.url,
  }));

  const repoRefs: RepoRef[] = dedupedRepos
    .filter((r) => r.description) // exclude repos with no description
    .map((r) => ({
      url: r.url,
      description: r.description,
    }));

  // Build enriched content (pass query for relevance scoring)
  const enrichedContent = buildEnrichedContent(content, papers, dedupedRepos, query);

  const summary = `Publication guide for "${title}" with ${papers.length} related papers and ${repoRefs.length} code repositories.`;

  return {
    title,
    summary,
    content: enrichedContent,
    tags: [...new Set([...tags, 'publication_guide'])],
    papers: paperRefs,
    repos: repoRefs,
  };
}

/** Strip raw HTML tags from markdown content (e.g. GitHub badge images) */
function stripHtml(text: string): string {
  return text
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Remove self-closing tags like <img .../> and <br/>
    .replace(/<[^>]+\/>/g, '')
    // Remove paired tags like <p>...</p>, <a>...</a> — keep inner text
    .replace(/<(\w+)[^>]*>([\s\S]*?)<\/\1>/g, '$2')
    // Remove any remaining orphan tags
    .replace(/<[^>]+>/g, '')
    // Remove lines that are only whitespace (artifact of stripped HTML)
    .replace(/^\s+$/gm, '')
    // Collapse resulting blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Format paper citation link — handles empty arXiv IDs gracefully */
function formatPaperLink(paper: ArxivPaper): string {
  if (paper.id) {
    return `[${paper.id}](${paper.url})`;
  }
  if (paper.url) {
    return `[link](${paper.url})`;
  }
  return '';
}

function buildEnrichedContent(
  content: string,
  papers: ArxivPaper[],
  repos: RepoResult[],
  query: string,
): string {
  const sections: string[] = [content];

  // Related Papers section — already sorted by relevance + citation impact
  if (papers.length > 0) {
    const paperLines = papers.map((p, i) => {
      const authorStr = p.authors.slice(0, 3).join(', ') + (p.authors.length > 3 ? ' et al.' : '');
      const link = formatPaperLink(p);
      let line = `${i + 1}. **${p.title}** — ${authorStr}${link ? ` (${link})` : ''}`;
      if (p.tldr) {
        line += `\n   > ${p.tldr}`;
      }
      if (typeof p.citationCount === 'number') {
        line += `\n   Citations: ${p.citationCount.toLocaleString()}`;
      }
      return line;
    });
    sections.push(`## Related Papers\n\n${paperLines.join('\n\n')}`);
  }

  // Paper Deep Dive — full text from the most relevant paper with fullText
  const topPaper = papers
    .filter((p) => p.fullText)
    .sort((a, b) => paperScore(b, query) - paperScore(a, query))[0];
  if (topPaper?.fullText) {
    // Truncate at a section boundary near 8000 chars (more generous for x402 value)
    const excerpt = truncateAtSection(topPaper.fullText, 8000);
    sections.push(`## Paper Deep Dive: ${topPaper.title}\n\n${excerpt}`);
  }

  // Code Repositories section — only repos with descriptions
  if (repos.length > 0) {
    const repoLines = repos
      .filter((r) => r.description) // skip repos with empty descriptions
      .map((r, i) => {
        const name = r.url.split('/').slice(-2).join('/');
        let line = `${i + 1}. [${name}](${r.url})`;
        if (r.description) line += ` — ${r.description}`;
        if (r.stars > 0) line += ` (${r.stars.toLocaleString()} stars)`;
        return line;
      });
    if (repoLines.length > 0) {
      sections.push(`## Code Repositories\n\n${repoLines.join('\n')}`);
    }
  }

  // Code Overview — README + key files from top repo
  const topRepo = repos[0];
  if (topRepo && (topRepo.readme || topRepo.keyFiles?.length)) {
    const codeOverviewParts: string[] = [];

    // Extract repo name from URL
    const repoName = topRepo.url.split('/').slice(-1)[0] || 'Repository';
    codeOverviewParts.push(`## Code Overview: ${repoName}`);

    if (topRepo.readme) {
      // Strip HTML badges and take a reasonable excerpt
      let readmeClean = stripHtml(topRepo.readme);
      // Truncate at a section boundary
      readmeClean = truncateAtSection(readmeClean, 3000);
      codeOverviewParts.push(`### README\n\n${readmeClean}`);
    }

    if (topRepo.keyFiles && topRepo.keyFiles.length > 0) {
      // Detect language from file extension
      const fileParts = topRepo.keyFiles.map((f) => {
        const ext = f.path.split('.').pop() || '';
        const lang = ext === 'py' ? 'python' : ext === 'ts' ? 'typescript' : ext === 'js' ? 'javascript' : ext;
        const excerpt = f.content.length > 2000
          ? f.content.slice(0, 2000) + '\n// ... (truncated)'
          : f.content;
        return `#### \`${f.path}\`\n\n\`\`\`${lang}\n${excerpt}\n\`\`\``;
      });
      codeOverviewParts.push(`### Key Implementation Files\n\n${fileParts.join('\n\n')}`);
    }

    sections.push(codeOverviewParts.join('\n\n'));
  }

  return sections.join('\n\n');
}

/** Truncate text at the nearest section boundary (## heading) near the target length */
function truncateAtSection(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;

  // Find the last ## heading before maxChars
  const searchRegion = text.slice(0, maxChars + 500);
  const headingPattern = /\n## /g;
  let lastHeadingPos = -1;
  let match;
  while ((match = headingPattern.exec(searchRegion)) !== null) {
    if (match.index <= maxChars) {
      lastHeadingPos = match.index;
    }
  }

  // If we found a heading near the boundary, cut there
  if (lastHeadingPos > maxChars * 0.6) {
    return text.slice(0, lastHeadingPos).trimEnd() + '\n\n...';
  }

  // Otherwise cut at last paragraph boundary
  const cutRegion = text.slice(0, maxChars);
  const lastParagraph = cutRegion.lastIndexOf('\n\n');
  if (lastParagraph > maxChars * 0.6) {
    return text.slice(0, lastParagraph).trimEnd() + '\n\n...';
  }

  return text.slice(0, maxChars) + '\n\n...';
}
