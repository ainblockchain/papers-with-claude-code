'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

interface Exploration {
  title?: string;
  summary?: string;
  content?: string;
  tags?: string;
  depth?: number;
  topic_path?: string;
  created_at?: number;
}

const DEPTH_COLORS: Record<number, string> = {
  1: 'bg-blue-500/20 text-blue-400',
  2: 'bg-purple-500/20 text-purple-400',
  3: 'bg-pink-500/20 text-pink-400',
  4: 'bg-amber-500/20 text-amber-400',
  5: 'bg-emerald-500/20 text-emerald-400',
};

export default function ContentSlugPage() {
  const params = useParams();
  const slugParts = (params.slug as string[]) || [];

  // The slug can be: /content/{topicPath...}/{entryId}
  // Or just: /content/{topicPath...} (show topic listing)
  // We need at least a topic path to look up content

  const [entry, setEntry] = useState<Exploration | null>(null);
  const [entries, setEntries] = useState<Exploration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (slugParts.length === 0) {
        setError('No content path specified');
        setLoading(false);
        return;
      }

      try {
        // Fetch all content entries and find matching ones
        const res = await fetch('/api/content');
        const data = await res.json();
        const allEntries = data.entries || [];

        const topicPath = slugParts.join('/');

        // Try to find exact entry match (last segment as entryId)
        if (slugParts.length >= 2) {
          const possibleEntryId = slugParts[slugParts.length - 1];
          const possibleTopic = slugParts.slice(0, -1).join('/');

          const exactMatch = allEntries.find(
            (e: any) => e.topic_path === possibleTopic && e.entryId === possibleEntryId
          );

          if (exactMatch) {
            // Fetch full content via RPC
            const rpcRes = await fetch('/api/rpc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'getExplorations',
                params: { address: exactMatch.explorer, topicPath: exactMatch.topic_path },
              }),
            });
            const rpcData = await rpcRes.json();

            if (rpcData.result && rpcData.result[possibleEntryId]) {
              setEntry({
                ...rpcData.result[possibleEntryId],
                topic_path: exactMatch.topic_path,
              });
              setLoading(false);
              return;
            }
          }
        }

        // No exact match — show entries matching the topic path
        const topicEntries = allEntries.filter((e: any) =>
          e.topic_path === topicPath || e.topic_path?.startsWith(topicPath + '/')
        );

        if (topicEntries.length === 1) {
          // Single match — fetch full content
          const single = topicEntries[0];
          const rpcRes = await fetch('/api/rpc', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'getExplorations',
              params: { address: single.explorer, topicPath: single.topic_path },
            }),
          });
          const rpcData = await rpcRes.json();

          if (rpcData.result && rpcData.result[single.entryId]) {
            setEntry({
              ...rpcData.result[single.entryId],
              topic_path: single.topic_path,
            });
          } else {
            setEntry(single);
          }
        } else if (topicEntries.length > 1) {
          setEntries(topicEntries);
        } else {
          setError(`No content found for path: ${topicPath}`);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slugParts.join('/')]);

  if (loading) {
    return <div className="text-gray-500 text-center py-16">Loading content...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/content" className="text-cogito-blue hover:underline text-sm">
          Back to content listing
        </Link>
      </div>
    );
  }

  // Multiple entries — show a listing for this topic
  if (entries.length > 0) {
    const topicPath = slugParts.join('/');
    return (
      <div className="space-y-6">
        <div>
          <Link href="/content" className="text-xs text-cogito-blue hover:underline mb-4 inline-block">
            &larr; Back to content
          </Link>
          <h1 className="text-3xl font-bold mb-1">{topicPath}</h1>
          <p className="text-gray-400">{entries.length} entries in this topic</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {entries.map((e: any) => {
            const viewParams = new URLSearchParams({
              topic: e.topic_path,
              explorer: e.explorer,
              entry: e.entryId,
            });
            return (
              <Link
                key={`${e.explorer}-${e.topic_path}-${e.entryId}`}
                href={`/content/view?${viewParams.toString()}`}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-cogito-blue transition-colors block"
              >
                <div className="font-semibold text-sm text-white line-clamp-2">
                  {e.title || 'Untitled'}
                </div>
                {e.summary && (
                  <p className="text-xs text-gray-400 mt-2 line-clamp-2">{e.summary}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs text-cogito-blue">{e.topic_path}</span>
                  {e.depth && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${DEPTH_COLORS[e.depth] || DEPTH_COLORS[1]}`}>
                      depth {e.depth}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // Single entry — render full content
  if (!entry) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Content not found</p>
        <Link href="/content" className="text-cogito-blue hover:underline text-sm mt-2 inline-block">
          Back to content listing
        </Link>
      </div>
    );
  }

  const topicPath = entry.topic_path || slugParts.join('/');
  const tags = entry.tags
    ? Array.from(new Set(entry.tags.split(',').map(t => t.trim()).filter(Boolean)))
    : [];

  return (
    <div className="flex gap-8">
      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <Link href="/content" className="text-xs text-cogito-blue hover:underline mb-4 inline-block">
          &larr; Back to content
        </Link>

        <h1 className="text-3xl font-bold mb-4">{entry.title || 'Untitled'}</h1>

        {entry.summary && (
          <p className="text-gray-400 mb-6 text-sm border-l-2 border-cogito-blue pl-4">
            {entry.summary}
          </p>
        )}

        {/* Rendered Markdown Content */}
        <div className="prose prose-invert prose-sm max-w-none
          prose-headings:text-gray-100 prose-headings:font-bold
          prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-3
          prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-2
          prose-p:text-gray-300 prose-p:leading-relaxed
          prose-a:text-cogito-blue prose-a:no-underline hover:prose-a:underline
          prose-code:text-pink-400 prose-code:bg-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700 prose-pre:rounded-lg
          prose-li:text-gray-300
          prose-strong:text-white
          prose-blockquote:border-cogito-purple prose-blockquote:text-gray-400
        ">
          <ReactMarkdown>{entry.content || '*No content available*'}</ReactMarkdown>
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 hidden lg:block">
        <div className="sticky top-8 space-y-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-xs text-gray-400 uppercase mb-3">Details</h3>

            <div className="space-y-3">
              <div>
                <div className="text-[10px] text-gray-500 uppercase">Topic</div>
                <span className="text-sm text-cogito-blue">{topicPath}</span>
              </div>

              {entry.depth && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Depth</div>
                  <span className={`text-xs px-2 py-0.5 rounded inline-block mt-0.5 ${DEPTH_COLORS[entry.depth] || DEPTH_COLORS[1]}`}>
                    {entry.depth}
                  </span>
                </div>
              )}

              {entry.created_at && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase">Created</div>
                  <div className="text-xs text-gray-300">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </div>
                </div>
              )}

              {tags.length > 0 && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => {
                      if (tag.startsWith('arxiv:')) {
                        const id = tag.replace('arxiv:', '');
                        return (
                          <a key={tag} href={`https://arxiv.org/abs/${id}`} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded hover:bg-red-500/30 transition-colors">
                            arxiv:{id}
                          </a>
                        );
                      }
                      if (tag.startsWith('doi:')) {
                        const id = tag.replace('doi:', '');
                        return (
                          <a key={tag} href={`https://doi.org/${id}`} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded hover:bg-orange-500/30 transition-colors">
                            doi:{id}
                          </a>
                        );
                      }
                      if (tag.startsWith('code:') || tag.startsWith('repo:')) {
                        const url = tag.replace(/^(code|repo):/, '');
                        return (
                          <a key={tag} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
                            className="text-[10px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded hover:bg-green-500/30 transition-colors">
                            code
                          </a>
                        );
                      }
                      return (
                        <span key={tag} className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">
                          {tag}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
