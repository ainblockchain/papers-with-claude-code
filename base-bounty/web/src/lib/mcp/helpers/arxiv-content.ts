/**
 * Fetches full paper text from arXiv HTML endpoints.
 * Primary: https://arxiv.org/html/{id} (newer papers with native HTML)
 * Fallback: https://ar5iv.labs.arxiv.org/html/{id} (converts older LaTeX to HTML)
 * Uses cheerio to parse and extract section headings + paragraph text.
 */

import * as cheerio from 'cheerio';

export interface PaperContent {
  fullText: string;
  sections: { heading: string; text: string }[];
  source: 'arxiv-html' | 'ar5iv' | 'abstract-only';
}

const MAX_CHARS = 30_000;
const RATE_LIMIT_MS = 3_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip version suffix from arXiv ID (e.g. "2301.00001v2" -> "2301.00001") */
function normalizeArxivId(id: string): string {
  return id.replace(/v\d+$/, '');
}

/** Clean extracted text: collapse whitespace, strip LaTeX math unicode noise */
function cleanText(raw: string): string {
  return raw
    // Remove zero-width chars that leak from MathML
    .replace(/[\u200b\u200c\u200d\u2060\ufeff]/g, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

function extractSections($: cheerio.CheerioAPI): { heading: string; text: string }[] {
  // Remove elements that add noise (but not math — those get placeholders)
  $('nav, .ltx_bibliography, .ltx_appendix, figure, .ltx_figure, .ltx_table, script, style, .ltx_note, .ltx_cite, sup.ltx_note_mark').remove();

  // Replace block-level equations with a placeholder so prose doesn't dangle
  $('.ltx_equationgroup, .ltx_equation, .ltx_eqn_row').each((_, el) => {
    $(el).replaceWith(' [equation] ');
  });

  // Replace inline math with a compact placeholder
  $('.ltx_Math, math, .MathJax').each((_, el) => {
    // Try to get alt text (arXiv often puts LaTeX in alt attr)
    const alt = $(el).attr('alttext') || $(el).attr('alt') || '';
    const replacement = alt ? ` ${alt} ` : ' [math] ';
    $(el).replaceWith(replacement);
  });

  const sections: { heading: string; text: string }[] = [];
  // Track seen paragraphs to prevent duplication from nested DOM structures
  const seenParagraphs = new Set<string>();

  // Use ltx_section divs if available (arXiv's structured format) — avoids
  // the nested-heading duplication problem by iterating top-level sections only
  const ltxSections = $('section.ltx_section, section.ltx_subsection, .ltx_section, .ltx_subsection');

  if (ltxSections.length > 0) {
    ltxSections.each((_, sectionEl) => {
      const $section = $(sectionEl);
      // Get heading from the section's direct title child
      const headingEl = $section.children('h1, h2, h3, h4, h5, h6, .ltx_title_section, .ltx_title_subsection').first();
      const heading = cleanText(headingEl.text());
      if (!heading) return;

      // Get only direct paragraphs of this section (not nested sub-sections)
      const paragraphs: string[] = [];
      $section.children('p, .ltx_para, div.ltx_para').each((_, p) => {
        const text = cleanText($(p).text());
        if (text.length > 20 && !seenParagraphs.has(text)) {
          seenParagraphs.add(text);
          paragraphs.push(text);
        }
      });

      if (paragraphs.length > 0) {
        sections.push({ heading, text: paragraphs.join('\n\n') });
      }
    });

    if (sections.length > 0) return sections;
  }

  // Fallback: use heading tags directly (for non-ltx structured HTML)
  const headings = $('h1, h2, h3, h4');

  if (headings.length === 0) {
    // No headings at all — grab all paragraph text as a single section
    const allText = $('article, .ltx_document, .ltx_page_main, body')
      .find('p')
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter((t) => t.length > 20 && !seenParagraphs.has(t))
      .map((t) => { seenParagraphs.add(t); return t; })
      .join('\n\n');

    if (allText) {
      sections.push({ heading: 'Content', text: allText });
    }
    return sections;
  }

  headings.each((_, headingEl) => {
    const heading = cleanText($(headingEl).text());
    if (!heading) return;

    // Collect text from siblings until the next heading
    const paragraphs: string[] = [];
    let sibling = $(headingEl).next();
    while (sibling.length > 0 && !sibling.is('h1, h2, h3, h4')) {
      if (sibling.is('p')) {
        const text = cleanText(sibling.text());
        if (text.length > 20 && !seenParagraphs.has(text)) {
          seenParagraphs.add(text);
          paragraphs.push(text);
        }
      } else if (!sibling.is('section, .ltx_section, .ltx_subsection')) {
        // Only recurse into non-section divs to avoid double-counting
        sibling.children('p').each((_, p) => {
          const text = cleanText($(p).text());
          if (text.length > 20 && !seenParagraphs.has(text)) {
            seenParagraphs.add(text);
            paragraphs.push(text);
          }
        });
      }
      sibling = sibling.next();
    }

    if (paragraphs.length > 0) {
      sections.push({ heading, text: paragraphs.join('\n\n') });
    }
  });

  return sections;
}

function truncateSections(sections: { heading: string; text: string }[]): { heading: string; text: string }[] {
  let totalChars = 0;
  const result: { heading: string; text: string }[] = [];

  for (const section of sections) {
    if (totalChars >= MAX_CHARS) break;
    const remaining = MAX_CHARS - totalChars;
    const text = section.text.length > remaining
      ? section.text.slice(0, remaining) + '...'
      : section.text;
    result.push({ heading: section.heading, text });
    totalChars += text.length;
  }

  return result;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'cogito-mcp/1.0 (academic research tool)' },
    });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchArxivContent(arxivId: string): Promise<PaperContent> {
  const id = normalizeArxivId(arxivId);

  // Try native arXiv HTML first
  const arxivHtml = await fetchHtml(`https://arxiv.org/html/${id}`);
  if (arxivHtml) {
    const $ = cheerio.load(arxivHtml);
    const sections = truncateSections(extractSections($));
    if (sections.length > 0) {
      const fullText = sections.map((s) => `## ${s.heading}\n\n${s.text}`).join('\n\n');
      return { fullText, sections, source: 'arxiv-html' };
    }
  }

  // Rate limit before retry
  await sleep(RATE_LIMIT_MS);

  // Fallback to ar5iv (LaTeX-to-HTML converter)
  const ar5ivHtml = await fetchHtml(`https://ar5iv.labs.arxiv.org/html/${id}`);
  if (ar5ivHtml) {
    const $ = cheerio.load(ar5ivHtml);
    const sections = truncateSections(extractSections($));
    if (sections.length > 0) {
      const fullText = sections.map((s) => `## ${s.heading}\n\n${s.text}`).join('\n\n');
      return { fullText, sections, source: 'ar5iv' };
    }
  }

  // If both fail, return abstract-only marker
  return { fullText: '', sections: [], source: 'abstract-only' };
}
