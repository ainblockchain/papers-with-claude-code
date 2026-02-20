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

export default function ContentDetailPage() {
  const params = useParams();
  const slug = (params.slug as string[]) || [];
  const [entry, setEntry] = useState<Exploration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // slug format: [...topicPath, explorerAddress, entryId]
  // e.g. ai/transformers/0xabc.../entry_1
  const entryId = slug[slug.length - 1];
  const explorerAddress = slug[slug.length - 2];
  const topicPath = slug.slice(0, -2).join('/');

  useEffect(() => {
    async function load() {
      if (!topicPath || !explorerAddress || !entryId) {
        setError('Invalid content path');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'getExplorations',
            params: { address: explorerAddress, topicPath },
          }),
        });
        const data = await res.json();

        if (data.error) {
          setError(data.error);
        } else if (data.result && data.result[entryId]) {
          setEntry(data.result[entryId]);
        } else {
          setError('Content entry not found');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [topicPath, explorerAddress, entryId]);

  const DEPTH_COLORS: Record<number, string> = {
    1: 'bg-blue-500/20 text-blue-400',
    2: 'bg-purple-500/20 text-purple-400',
    3: 'bg-pink-500/20 text-pink-400',
    4: 'bg-amber-500/20 text-amber-400',
    5: 'bg-emerald-500/20 text-emerald-400',
  };

  if (loading) {
    return <div className="text-gray-500 text-center py-16">Loading content...</div>;
  }

  if (error || !entry) {
    return (
      <div className="text-center py-16">
        <p className="text-red-400 mb-4">{error || 'Content not found'}</p>
        <Link href="/content" className="text-cogito-blue hover:underline text-sm">
          Back to content listing
        </Link>
      </div>
    );
  }

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
                <Link
                  href={`/content?topic=${topicPath}`}
                  className="text-sm text-cogito-blue hover:underline"
                >
                  {entry.topic_path || topicPath}
                </Link>
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

              {entry.tags && (
                <div>
                  <div className="text-[10px] text-gray-500 uppercase mb-1">Tags</div>
                  <div className="flex flex-wrap gap-1">
                    {entry.tags.split(',').map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="text-[10px] text-gray-500 uppercase">Explorer</div>
                <div className="text-xs text-gray-400 font-mono break-all">
                  {explorerAddress}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
