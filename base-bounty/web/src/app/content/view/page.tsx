'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
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

export default function ContentViewPage() {
  return (
    <Suspense fallback={<div className="text-gray-500 text-center py-16">Loading content...</div>}>
      <ContentViewInner />
    </Suspense>
  );
}

function ContentViewInner() {
  const searchParams = useSearchParams();
  const topicPath = searchParams.get('topic') || '';
  const explorerAddress = searchParams.get('explorer') || '';
  const entryId = searchParams.get('entry') || '';

  const [entry, setEntry] = useState<Exploration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!topicPath || !explorerAddress || !entryId) {
        setError('Missing required parameters: topic, explorer, entry');
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
                <span className="text-sm text-cogito-blue">
                  {entry.topic_path || topicPath}
                </span>
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
                    {Array.from(new Set(entry.tags.split(',').map(t => t.trim()).filter(Boolean))).map((tag) => {
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
