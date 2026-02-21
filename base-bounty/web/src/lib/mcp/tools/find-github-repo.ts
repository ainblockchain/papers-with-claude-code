/**
 * find_github_repo MCP tool.
 * Searches for the official code repository of a given paper.
 * Uses HuggingFace Papers API first, then falls back to GitHub search.
 */

import { z } from 'zod';
import { fetchGithubContent, type RepoContent } from '../helpers/github-content';

export const findGithubRepoSchema = {
  paperTitle: z.string().describe('Title of the academic paper'),
  authors: z.array(z.string()).optional().describe('Paper author names to improve matching'),
  includeContent: z.boolean().default(false).describe('Fetch README and key source files from the repo'),
};

export interface RepoResult {
  url: string;
  stars: number;
  language: string;
  description: string;
  readme?: string;
  keyFiles?: { path: string; content: string }[];
}

export async function findGithubRepo(args: {
  paperTitle: string;
  authors?: string[];
  includeContent?: boolean;
}): Promise<{ repo: RepoResult | null }> {
  const { paperTitle, authors, includeContent } = args;

  // 1. Try HuggingFace Papers API
  const hfRepo = await searchHuggingFace(paperTitle);
  if (hfRepo) {
    if (includeContent) {
      await enrichWithContent(hfRepo);
    }
    return { repo: hfRepo };
  }

  // 2. Fall back to GitHub search
  const ghRepo = await searchGitHub(paperTitle, authors);
  if (ghRepo && includeContent) {
    await enrichWithContent(ghRepo);
  }
  return { repo: ghRepo };
}

async function enrichWithContent(repo: RepoResult): Promise<void> {
  const content: RepoContent = await fetchGithubContent(repo.url);
  if (content.readme) {
    repo.readme = content.readme;
  }
  if (content.keyFiles.length > 0) {
    repo.keyFiles = content.keyFiles;
  }
}

async function searchHuggingFace(title: string): Promise<RepoResult | null> {
  try {
    const query = encodeURIComponent(title);

    // Try the search endpoint first (covers historical papers)
    const searchRes = await fetch(`https://huggingface.co/api/papers/search?q=${query}`, {
      headers: { 'User-Agent': 'cogito-mcp/1.0' },
    });

    if (searchRes.ok) {
      const papers = (await searchRes.json()) as any[];
      if (Array.isArray(papers)) {
        for (const entry of papers) {
          const paperData = entry?.paper ?? entry;
          const repoUrl = paperData?.githubRepo;
          if (!repoUrl || typeof repoUrl !== 'string') continue;
          if (!repoUrl.includes('github.com')) continue;
          const repoDetails = await fetchGitHubRepoDetails(repoUrl);
          if (repoDetails) return repoDetails;
        }
      }
    }

    // Fallback to daily_papers endpoint (covers trending/recent papers)
    const dailyRes = await fetch(`https://huggingface.co/api/daily_papers?search=${query}`, {
      headers: { 'User-Agent': 'cogito-mcp/1.0' },
    });

    if (dailyRes.ok) {
      const papers = (await dailyRes.json()) as any[];
      if (Array.isArray(papers)) {
        for (const entry of papers) {
          const paperData = entry?.paper ?? entry;
          const repoUrl = paperData?.githubRepo;
          if (!repoUrl || typeof repoUrl !== 'string') continue;
          if (!repoUrl.includes('github.com')) continue;
          const repoDetails = await fetchGitHubRepoDetails(repoUrl);
          if (repoDetails) return repoDetails;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

async function fetchGitHubRepoDetails(repoUrl: string): Promise<RepoResult | null> {
  try {
    const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const owner = match[1];
    const repo = match[2].replace(/\.git$/, '');

    const headers: Record<string, string> = {
      'User-Agent': 'cogito-mcp/1.0',
      Accept: 'application/vnd.github+json',
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
    if (!res.ok) return null;

    const data = (await res.json()) as any;
    return {
      url: data.html_url || repoUrl,
      stars: data.stargazers_count || 0,
      language: data.language || '',
      description: data.description || '',
    };
  } catch {
    return null;
  }
}

async function searchGitHub(title: string, authors?: string[]): Promise<RepoResult | null> {
  try {
    // Build search query from title keywords (drop common words)
    const keywords = title
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 6)
      .join('+');

    const authorSuffix = authors?.length
      ? `+${authors[0].split(' ').pop()}`
      : '';

    const query = encodeURIComponent(`${keywords}${authorSuffix}`);

    const headers: Record<string, string> = {
      'User-Agent': 'cogito-mcp/1.0',
      Accept: 'application/vnd.github+json',
    };
    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(
      `https://api.github.com/search/repositories?q=${query}&sort=stars&per_page=5`,
      { headers },
    );

    if (!res.ok) return null;

    const data = (await res.json()) as any;
    const items = data?.items;
    if (!Array.isArray(items) || items.length === 0) return null;

    const best = items[0];
    return {
      url: best.html_url,
      stars: best.stargazers_count || 0,
      language: best.language || '',
      description: best.description || '',
    };
  } catch {
    return null;
  }
}
