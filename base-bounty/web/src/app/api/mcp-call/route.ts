import { NextRequest, NextResponse } from 'next/server';
import { searchArxiv } from '@/lib/mcp/tools/search-arxiv';
import { findGithubRepo } from '@/lib/mcp/tools/find-github-repo';
import { publicationGuide } from '@/lib/mcp/tools/publication-guide';
import { checkPublicationStatus } from '@/lib/mcp/tools/check-publication-status';

const TOOLS: Record<string, (args: any) => Promise<unknown>> = {
  search_arxiv: searchArxiv,
  find_github_repo: findGithubRepo,
  publication_guide: publicationGuide,
  check_publication_status: checkPublicationStatus,
};

export async function POST(req: NextRequest) {
  try {
    const { tool, args } = await req.json();

    const fn = TOOLS[tool];
    if (!fn) {
      return NextResponse.json({ error: `Unknown tool: ${tool}` }, { status: 400 });
    }

    const result = await fn(args);
    return NextResponse.json({ result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Tool call failed' }, { status: 500 });
  }
}
