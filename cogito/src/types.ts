/**
 * Shared types for the Cogito container.
 */

export interface LessonLearned {
  entryId: string;
  title: string;
  content: string;
  summary: string;
  depth: number;
  tags: string;
  created_at: number;
}

export interface EnrichedContent {
  title: string;
  summary: string;
  content: string;
  lesson: LessonLearned;
  papers: PaperRef[];
  codeRefs: CodeRef[];
  depth: number;
  tags: string[];
}

export interface PaperRef {
  arxivId: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  url: string;
}

export interface CodeRef {
  repo: string;
  language: string;
  keyFiles: string[];
  description: string;
}

export interface ContentListing {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  price: string;
  created_at: number;
  paperCount: number;
  hasCode: boolean;
}
