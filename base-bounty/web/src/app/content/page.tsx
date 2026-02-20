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
        <p className="text-gray-400">Enriched knowledge explorations from the Cogito agent</p>
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
            const slug = `${entry.topic_path}/${entry.explorer}/${entry.entryId}`;
            return (
              <Link
                key={`${entry.explorer}-${entry.topic_path}-${entry.entryId}`}
                href={`/content/${slug}`}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cogito-blue transition-colors block"
              >
                <div className="font-semibold text-sm text-white line-clamp-2">
                  {entry.title || 'Untitled'}
                </div>
                {entry.summary && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{entry.summary}</p>
                )}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {entry.tags?.split(',').map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded"
                    >
                      {tag.trim()}
                    </span>
                  ))}
                </div>
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
