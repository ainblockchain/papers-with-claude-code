export interface Author {
  id: string;
  name: string;
  avatarUrl?: string;
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
}
