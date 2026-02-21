/**
 * Google Scholar search via HTML scraping.
 * No API key required. Uses cheerio to parse results.
 * Returns paper titles, authors, citation counts, and arXiv/DOI links.
 */

import * as cheerio from 'cheerio';

export interface ScholarResult {
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  arxivId: string;
  citationCount?: number;
  year?: string;
}

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function searchGoogleScholar(query: string, maxResults: number): Promise<ScholarResult[]> {
  try {
    const params = new URLSearchParams({
      q: query,
      num: String(Math.min(maxResults, 10)),
      hl: 'en',
    });

    const res = await fetch(`https://scholar.google.com/scholar?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow',
    });

    if (!res.ok) return [];

    const html = await res.text();
    return parseScholarHtml(html, maxResults);
  } catch {
    return [];
  }
}

function parseScholarHtml(html: string, maxResults: number): ScholarResult[] {
  const $ = cheerio.load(html);
  const results: ScholarResult[] = [];

  $('.gs_r.gs_or.gs_scl').each((_, el) => {
    if (results.length >= maxResults) return false;

    const $el = $(el);

    // Title and link
    const titleEl = $el.find('.gs_rt a').first();
    const title = titleEl.text().trim();
    if (!title) return;

    // Get the primary link (often to the paper source)
    const primaryLink = titleEl.attr('href') || '';

    // Look for arXiv ID anywhere in the result block (abs/, pdf/, or html/ links)
    let arxivId = '';
    const allLinks = $el.find('a').map((_, a) => $(a).attr('href') || '').get();
    const allText = $el.text();
    for (const link of [primaryLink, ...allLinks]) {
      const match = link.match(/arxiv\.org\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})/);
      if (match) {
        arxivId = match[1];
        break;
      }
    }
    // Also check for arXiv ID mentioned in text (e.g. "arXiv:2301.00001")
    if (!arxivId) {
      const textMatch = allText.match(/arXiv[:\s]+(\d{4}\.\d{4,5})/i);
      if (textMatch) arxivId = textMatch[1];
    }

    // Authors & year from the green metadata line
    const metaLine = $el.find('.gs_a').text();
    const authors = parseAuthors(metaLine);
    const yearMatch = metaLine.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : undefined;

    // Abstract/snippet
    const abstract = $el.find('.gs_rs').text().trim();

    // Citation count
    const citedByText = $el.find('.gs_fl a').filter((_, a) =>
      $(a).text().startsWith('Cited by'),
    ).first().text();
    const citedMatch = citedByText.match(/Cited by (\d+)/);
    const citationCount = citedMatch ? parseInt(citedMatch[1], 10) : undefined;

    // Build URL — prefer arXiv link, fall back to primary
    const url = arxivId
      ? `https://arxiv.org/abs/${arxivId}`
      : primaryLink;

    results.push({
      title,
      authors,
      abstract,
      url,
      arxivId,
      citationCount,
      year,
    });
  });

  return results;
}

function parseAuthors(metaLine: string): string[] {
  // Format: "A Vaswani, N Shazeer, N Parmar… - Advances in neural…, 2017 - Springer"
  const authorsPart = metaLine.split(' - ')[0] || '';
  return authorsPart
    .split(',')
    .map((a) => a.replace(/…$/, '').trim())
    .filter((a) => a.length > 0 && !a.match(/^\d+$/));
}
