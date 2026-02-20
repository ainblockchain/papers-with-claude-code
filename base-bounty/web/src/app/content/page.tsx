'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface ContentEntry {
  entryId: string;
  explorer: string;
  topic_path: string;
  title?: string;
  summary?: string;
  tags?: string;
  depth?: number;
  created_at?: number;
}

/** Render a tag — arxiv and github tags become clickable links */
function TagChip({ tag }: { tag: string }) {
  const trimmed = tag.trim();

  if (trimmed.startsWith('arxiv:')) {
    const arxivId = trimmed.replace('arxiv:', '');
    return (
      <a
        href={`https://arxiv.org/abs/${arxivId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/30 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        arxiv:{arxivId}
      </a>
    );
  }

  if (trimmed.startsWith('doi:')) {
    const doi = trimmed.replace('doi:', '');
    return (
      <a
        href={`https://doi.org/${doi}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded hover:bg-orange-500/30 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        doi:{doi}
      </a>
    );
  }

  if (trimmed.startsWith('code:') || trimmed.startsWith('repo:')) {
    const url = trimmed.replace(/^(code|repo):/, '');
    return (
      <a
        href={url.startsWith('http') ? url : `https://${url}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded hover:bg-green-500/30 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        code
      </a>
    );
  }

  return (
    <span className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
      {trimmed}
    </span>
  );
}

export default function ContentPage() {
  const [entries, setEntries] = useState<ContentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/content');
        const data = await res.json();
        setEntries(data.entries || []);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const topics = Array.from(new Set(entries.map((e) => e.topic_path.split('/').slice(0, 2).join('/'))));
  const filtered = filter === 'all' ? entries : entries.filter((e) => e.topic_path.startsWith(filter));

  // Split tags into categories for display
  function splitTags(tags: string) {
    const all = tags.split(',').map(t => t.trim()).filter(Boolean);
    // Deduplicate tags
    const unique = Array.from(new Set(all));
    // Show paper/code refs first, then limit other tags
    const refs = unique.filter(t => t.startsWith('arxiv:') || t.startsWith('doi:') || t.startsWith('code:') || t.startsWith('repo:'));
    const other = unique.filter(t => !refs.includes(t) && t !== 'educational' && t !== 'x402_gated' && t !== 'enriched');
    return { refs, other: other.slice(0, 4) };
  }

  const DEPTH_COLORS: Record<number, string> = {
    1: 'bg-blue-500/20 text-blue-400',
    2: 'bg-purple-500/20 text-purple-400',
    3: 'bg-pink-500/20 text-pink-400',
    4: 'bg-amber-500/20 text-amber-400',
    5: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Content</h1>
        <p className="text-gray-400">Enriched knowledge with academic papers and code references</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
            filter === 'all' ? 'bg-cogito-blue text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          All
        </button>
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => setFilter(topic)}
            className={`text-xs px-3 py-1.5 rounded-full transition-colors ${
              filter === topic ? 'bg-cogito-blue text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* Content Grid */}
      {loading ? (
        <div className="text-gray-500 text-center py-8">Loading content...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700 text-gray-500 text-center">
          No content entries found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry) => {
            const params = new URLSearchParams({
              topic: entry.topic_path,
              explorer: entry.explorer,
              entry: entry.entryId,
            });
            const { refs, other } = entry.tags ? splitTags(entry.tags) : { refs: [], other: [] };
            return (
              <Link
                key={`${entry.explorer}-${entry.topic_path}-${entry.entryId}`}
                href={`/content/view?${params.toString()}`}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cogito-blue transition-colors block"
              >
                <div className="font-semibold text-sm text-white line-clamp-2">
                  {entry.title || 'Untitled'}
                </div>
                {entry.summary && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{entry.summary}</p>
                )}
                {/* Paper & Code References */}
                {refs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {refs.map((tag) => (
                      <TagChip key={tag} tag={tag} />
                    ))}
                  </div>
                )}
                {/* Other Tags */}
                {other.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {other.map((tag) => (
                      <TagChip key={tag} tag={tag} />
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-cogito-blue">{entry.topic_path}</span>
                  {entry.depth && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${DEPTH_COLORS[entry.depth] || DEPTH_COLORS[1]}`}>
                      depth {entry.depth}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
