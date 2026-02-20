export interface Author {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface CourseInfo {
  slug: string;
  name: string;
  totalConcepts: number;
  totalLessons: number;
}

export interface Paper {
  id: string;
  title: string;
  description: string;
  authors: Author[];
  publishedAt: string;
  thumbnailUrl: string;
  arxivUrl: string;
  githubUrl?: string;
  githubStars?: number;
  organization?: { name: string; logoUrl: string };
  submittedBy: string;
  totalStages: number;
  courses?: CourseInfo[];
}
