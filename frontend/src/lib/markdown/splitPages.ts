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

/** Titles that indicate a standalone video page to be extracted from a concept */
const VIDEO_PAGE_TITLES = new Set(['강의 영상', 'Lecture Video']);

/**
 * Build a flat sequential page list from all concepts in a stage.
 * Each concept's content is split into pages, then all pages are
 * concatenated into a single list with metadata for navigation.
 *
 * If the first concept's first page is a video page (matching VIDEO_PAGE_TITLES),
 * it is promoted to a top-level entry so it appears at the sidebar root level
 * instead of nested inside the concept accordion.
 */
export function buildFlatPageList(
  concepts: { id: string; title: string; content: string }[],
): FlatPage[] {
  const flatPages: FlatPage[] = [];

  // Effective concept list: may have a promoted video entry prepended
  const effectiveConcepts: { id: string; title: string; pages: ContentPage[] }[] = [];

  for (let ci = 0; ci < concepts.length; ci++) {
    const concept = concepts[ci];
    const pages = splitContentIntoPages(concept.content);
    const effective =
      pages.length > 0 ? pages : [{ title: concept.title, content: '', index: 0 }];

    // Promote video page from first concept to a standalone top-level entry
    if (ci === 0 && effective.length > 1 && VIDEO_PAGE_TITLES.has(effective[0].title)) {
      const videoPage = effective[0];
      effectiveConcepts.push({
        id: `__video_${concept.id}`,
        title: videoPage.title,
        pages: [videoPage],
      });
      effectiveConcepts.push({
        id: concept.id,
        title: concept.title,
        pages: effective.slice(1),
      });
    } else {
      effectiveConcepts.push({ id: concept.id, title: concept.title, pages: effective });
    }
  }

  for (let ci = 0; ci < effectiveConcepts.length; ci++) {
    const { id, title, pages } = effectiveConcepts[ci];
    for (let pi = 0; pi < pages.length; pi++) {
      flatPages.push({
        conceptId: id,
        conceptTitle: title,
        conceptIndex: ci,
        pageTitle: pages[pi].title,
        pageContent: pages[pi].content,
        pageIndexInConcept: pi,
        totalPagesInConcept: pages.length,
        flatIndex: flatPages.length,
      });
    }
  }

  return flatPages;
}
