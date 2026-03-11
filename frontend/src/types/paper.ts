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
  backgroundUrl?: string;
  arxivUrl: string;
  docsUrl?: string;
  githubUrl?: string;
  courseRepoUrl?: string;
  githubStars?: number;
  organization?: { name: string; logoUrl: string };
  submittedBy: string;
  totalStages: number;
  courseName?: string;
  courses?: CourseInfo[];
  badgeUrl?: string;
}
