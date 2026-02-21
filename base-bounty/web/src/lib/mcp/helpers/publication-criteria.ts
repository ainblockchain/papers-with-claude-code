/**
 * Shared helpers for publication deduplication and quality checks.
 * Used by both /api/content/route.ts and the check_publication_status MCP tool.
 */

/** Extract significant words (length > 2) from a title */
export function titleWords(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
  );
}

/** Jaccard similarity between two word sets (0-1) */
export function similarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Check if entry has an official paper reference (arxiv/doi/paper tag or URL) */
export function hasPaperRef(entry: { tags?: string; content?: string; summary?: string }): boolean {
  const tags = entry.tags || '';
  const content = entry.content || '';
  const summary = entry.summary || '';
  const all = `${tags} ${content} ${summary}`;
  return /arxiv:/i.test(tags) || /doi:/i.test(tags) || /paper:/i.test(tags)
    || /arxiv\.org\/abs\//i.test(all) || /doi\.org\//i.test(all);
}

/** Check if entry has a code repository reference */
export function hasCodeRef(entry: { tags?: string; content?: string; summary?: string }): boolean {
  const tags = entry.tags || '';
  const content = entry.content || '';
  const summary = entry.summary || '';
  const all = `${tags} ${content} ${summary}`;
  return /github\.com\/[\w-]+\/[\w.-]+/i.test(all) || /code:/i.test(tags) || /repo:/i.test(tags);
}
