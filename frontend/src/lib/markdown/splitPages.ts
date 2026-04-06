export interface ContentPage {
  title: string;
  content: string;
  index: number;
}

/**
 * Split markdown content into pages by `## ` headers.
 * Content before the first `##` becomes an "Introduction" page.
 */
export function splitContentIntoPages(fullContent: string): ContentPage[] {
  const sections = fullContent.split(/(?=^## )/m);
  const pages: ContentPage[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('## ')) {
      const firstNewline = trimmed.indexOf('\n');
      const title = trimmed.slice(3, firstNewline === -1 ? undefined : firstNewline).trim();
      pages.push({ title, content: trimmed, index: pages.length });
    } else {
      pages.push({ title: 'Introduction', content: trimmed, index: pages.length });
    }
  }

  return pages;
}

/** A page in the flat list across all concepts in a stage */
export interface FlatPage {
  conceptId: string;
  conceptTitle: string;
  conceptIndex: number;
  pageTitle: string;
  pageContent: string;
  pageIndexInConcept: number;
  totalPagesInConcept: number;
  flatIndex: number;
}

/**
 * Build a flat sequential page list from all concepts in a stage.
 * Each concept's content is split into pages, then all pages are
 * concatenated into a single list with metadata for navigation.
 */
export function buildFlatPageList(
  concepts: { id: string; title: string; content: string }[],
): FlatPage[] {
  const flatPages: FlatPage[] = [];

  for (let ci = 0; ci < concepts.length; ci++) {
    const concept = concepts[ci];
    const pages = splitContentIntoPages(concept.content);
    // If a concept has no content, create a placeholder page
    const effectivePages =
      pages.length > 0 ? pages : [{ title: concept.title, content: '', index: 0 }];

    for (let pi = 0; pi < effectivePages.length; pi++) {
      flatPages.push({
        conceptId: concept.id,
        conceptTitle: concept.title,
        conceptIndex: ci,
        pageTitle: effectivePages[pi].title,
        pageContent: effectivePages[pi].content,
        pageIndexInConcept: pi,
        totalPagesInConcept: effectivePages.length,
        flatIndex: flatPages.length,
      });
    }
  }

  return flatPages;
}
