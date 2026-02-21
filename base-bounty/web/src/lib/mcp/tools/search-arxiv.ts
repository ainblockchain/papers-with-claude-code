/**
 * search_arxiv MCP tool.
 * Searches for academic papers using Google Scholar (primary, no API key needed).
 * Enriches top results with Semantic Scholar data (citations, TLDR).
 * Falls back to Semantic Scholar search to ensure foundational papers aren't missed.
 * Fetches full paper text from arXiv HTML endpoints when requested.
 */

import { z } from 'zod';
import { searchGoogleScholar } from '../helpers/scholar-search';
import { fetchArxivContent } from '../helpers/arxiv-content';

export const searchArxivSchema = {
  query: z.string().describe('Search query for arXiv papers'),
  maxResults: z.number().min(1).max(20).default(5).describe('Maximum number of results to return'),
  includeFullText: z.boolean().default(false).describe('Fetch full paper text for the top result (slower)'),
};

export interface ArxivPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  published: string;
  citationCount?: number;
  tldr?: string;
  fullText?: string;
}

/** Normalize title for dedup comparison */
function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extract 1-2 core keywords from a compound query for a broader supplementary search.
 * The goal is to find foundational/seminal papers that the specific multi-word query missed.
 * E.g., "Self-Attention Mechanisms transformers attention" -> "self-attention"
 *        "Graph Neural Networks node classification"       -> "graph neural networks"
 */
function extractCoreKeywords(query: string): string {
  // Generic modifiers that don't help find foundational papers
  const stopWords = new Set([
    'a', 'an', 'the', 'of', 'in', 'on', 'for', 'and', 'or', 'to', 'with',
    'by', 'its', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that',
    'from', 'as', 'at', 'based', 'using', 'via', 'novel', 'new',
    'mechanisms', 'mechanism', 'method', 'methods', 'approach', 'approaches',
    'applications', 'application',
  ]);

  const words = query.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  if (words.length === 0) return '';

  // Take first 2 core words — broad enough to find foundational papers
  // but specific enough to stay on-topic
  return words.slice(0, 2).join(' ');
}

export async function searchArxiv(args: {
  query: string;
  maxResults: number;
  includeFullText?: boolean;
}): Promise<{ papers: ArxivPaper[] }> {
  const { query, maxResults, includeFullText } = args;

  // Primary: Google Scholar (no API key, reliable, returns citation counts)
  const scholarResults = await searchGoogleScholar(query, maxResults);

  const papers: ArxivPaper[] = scholarResults.map((r) => ({
    id: r.arxivId || '',
    title: r.title,
    authors: r.authors,
    abstract: r.abstract,
    url: r.url,
    published: r.year || '',
    citationCount: r.citationCount,
  }));

  // Enrich with Semantic Scholar: resolve arXiv IDs by title for papers missing them,
  // and fetch TLDR for papers that have arXiv IDs
  await Promise.all(papers.map((p) => enrichWithSemanticScholar(p)));

  // If no paper has >10K citations, the initial search likely missed foundational papers.
  // Do a supplementary Google Scholar search with a SHORTER query to find seminal work.
  // E.g., "Self-Attention Mechanisms transformers attention" misses "Attention Is All You Need"
  // but a shorter "self-attention" query finds it immediately.
  const maxCitations = Math.max(...papers.map((p) => p.citationCount ?? 0), 0);
  if (maxCitations < 10_000) {
    const shortQuery = extractCoreKeywords(query);
    if (shortQuery && shortQuery !== query) {
      const supplementary = await searchGoogleScholar(shortQuery, 3);
      const existingTitles = new Set(papers.map((p) => normalizeTitle(p.title)));
      for (const r of supplementary) {
        if (!existingTitles.has(normalizeTitle(r.title))) {
          const paper: ArxivPaper = {
            id: r.arxivId || '',
            title: r.title,
            authors: r.authors,
            abstract: r.abstract,
            url: r.url,
            published: r.year || '',
            citationCount: r.citationCount,
          };
          papers.push(paper);
          existingTitles.add(normalizeTitle(r.title));
        }
      }
      // Enrich new papers with S2 (resolve arXiv IDs + TLDR)
      const newPapers = papers.filter((p) => !p.tldr && !p.id);
      await Promise.all(newPapers.map((p) => enrichWithSemanticScholar(p)));
    }
  }

  // Fetch full text for top papers that have arXiv IDs (up to 2).
  // We fetch multiple so the downstream publication_guide can choose
  // the most relevant one for the Deep Dive, not just the highest-cited.
  if (includeFullText) {
    const candidates = papers
      .filter((p) => p.id)
      .sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0));
    let fetched = 0;
    for (const target of candidates) {
      if (fetched >= 2) break;
      const content = await fetchArxivContent(target.id);
      if (content.fullText) {
        target.fullText = content.fullText;
        fetched++;
      }
    }
  }

  return { papers };
}

async function enrichWithSemanticScholar(paper: ArxivPaper): Promise<void> {
  try {
    // If we already have an arXiv ID, look up directly
    if (paper.id) {
      const id = paper.id.replace(/v\d+$/, '');
      const res = await fetch(
        `https://api.semanticscholar.org/graph/v1/paper/ArXiv:${id}?fields=citationCount,tldr`,
        { headers: { 'User-Agent': 'cogito-mcp/1.0' } },
      );
      if (res.ok) {
        const data = (await res.json()) as any;
        if (typeof data.citationCount === 'number') paper.citationCount = data.citationCount;
        if (data.tldr?.text) paper.tldr = data.tldr.text;
        return;
      }
    }

    // No arXiv ID — search Semantic Scholar by title to resolve it
    const params = new URLSearchParams({
      query: paper.title,
      limit: '1',
      fields: 'externalIds,citationCount,tldr',
    });
    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
      { headers: { 'User-Agent': 'cogito-mcp/1.0' } },
    );
    if (!res.ok) return;

    const data = (await res.json()) as any;
    const top = data?.data?.[0];
    if (!top) return;

    // Resolve arXiv ID if available
    const arxivId = top.externalIds?.ArXiv;
    if (arxivId && !paper.id) {
      paper.id = arxivId;
      paper.url = `https://arxiv.org/abs/${arxivId}`;
    }
    if (typeof top.citationCount === 'number') paper.citationCount = top.citationCount;
    if (top.tldr?.text) paper.tldr = top.tldr.text;
  } catch {
    // Non-critical — Google Scholar already provides citation counts
  }
}
