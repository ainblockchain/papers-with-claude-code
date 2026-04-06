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
