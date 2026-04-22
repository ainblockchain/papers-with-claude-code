'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, MessageSquare, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLearningStore } from '@/stores/useLearningStore';

const PAGE_SIZE = 50;

interface ChatRecord {
  session_id: string;
  intent: string;
  user: { message: string };
  assistant: { contents: string };
  created_at: string;
}

export function ChatLogOverlay() {
  const { activeSignboardId, setActiveSignboard } = useLearningStore();
  const [chats, setChats] = useState<ChatRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noIntentOnly, setNoIntentOnly] = useState(false);

  const isOpen = activeSignboardId !== null;

  const fetchChats = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    try {
      const res = await fetch(`/api/chats?limit=${PAGE_SIZE}&skip=0`);
      if (res.ok) {
        const data = await res.json();
        setChats(data);
        if (data.length < PAGE_SIZE) setHasMore(false);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/chats?limit=${PAGE_SIZE}&skip=${chats.length}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length < PAGE_SIZE) setHasMore(false);
        if (data.length > 0) setChats((prev) => [...prev, ...data]);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingMore(false);
    }
  }, [chats.length, loadingMore, hasMore]);

  useEffect(() => {
    if (isOpen) fetchChats();
  }, [isOpen, fetchChats]);

  const handleClose = useCallback(() => {
    setActiveSignboard(null);
    setExpandedId(null);
    setChats([]);
    setHasMore(true);
  }, [setActiveSignboard]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const filteredChats = noIntentOnly
    ? chats.filter((c) => c.intent === 'no_intent')
    : chats;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black/70 backdrop-blur-sm">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/90">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#FF9D00]" />
          <h2 className="text-sm font-bold text-white">
            궁금하냥 최신 대화 기록
          </h2>
          <span className="text-xs text-gray-400">{filteredChats.length}건</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchChats}
            disabled={loading}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-700/50 bg-gray-900/80">
        <span className="text-xs text-gray-400 font-medium ml-2">필터링</span>
        <button
          onClick={() => setNoIntentOnly(!noIntentOnly)}
          className={`px-2.5 py-0.5 rounded-full text-[11px] border transition-colors ${
            noIntentOnly
              ? 'bg-red-900/60 text-red-300 border-red-900/60'
              : 'text-gray-500 hover:text-gray-300 border-gray-700'
          }`}
        >
          no_intent
        </button>
      </div>

      {/* Table */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #111827' }}
      >
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0 bg-gray-900/95 z-10">
            <tr className="border-b border-gray-700">
              <th className="text-center px-3 py-2 text-gray-400 font-medium w-[160px]">Intent</th>
              <th className="text-center px-3 py-2 text-gray-400 font-medium">질문</th>
              <th className="text-center px-3 py-2 text-gray-400 font-medium w-[90px]">시간</th>
              <th className="text-center px-3 py-2 text-gray-400 font-medium w-[70px]">Session</th>
            </tr>
          </thead>
          <tbody>
            {loading && chats.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-500">
                  로딩 중...
                </td>
              </tr>
            ) : (
              <>
                {filteredChats.map((chat, i) => {
                  const isExpanded = expandedId === `${i}`;
                  const assistantText = chat.assistant?.contents || '';
                  return (
                    <tr
                      key={`${chat.session_id}-${i}`}
                      className={`border-b border-gray-800 cursor-pointer transition-colors ${
                        isExpanded
                          ? 'bg-gray-800/80'
                          : 'hover:bg-gray-800/40'
                      }`}
                      onClick={() => setExpandedId(isExpanded ? null : `${i}`)}
                    >
                      <td className="px-3 py-1 align-middle">
                        <span
                          title={chat.intent}
                          className={`inline-block align-middle px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap max-w-[140px] truncate ${
                            chat.intent === 'no_intent'
                              ? 'bg-red-900/50 text-red-300'
                              : 'bg-emerald-900/50 text-emerald-300'
                          }`}
                        >
                          {chat.intent || 'unknown'}
                        </span>
                      </td>
                      <td className="px-3 py-1 align-middle">
                        <p className={`text-white ${isExpanded ? '' : 'truncate'}`}>
                          {chat.user?.message}
                        </p>
                        {isExpanded && assistantText && (
                          <div
                            className="mt-2 border-t border-gray-700 pt-2 max-h-[200px] overflow-y-auto text-gray-300 whitespace-pre-wrap leading-relaxed"
                            style={{ scrollbarWidth: 'thin', scrollbarColor: '#374151 #111827' }}
                          >
                            {assistantText}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-1 align-middle text-center text-gray-500 whitespace-nowrap">
                        {formatTime(chat.created_at)}
                      </td>
                      <td className="px-3 py-1 align-middle text-center text-gray-600 font-mono">
                        {chat.session_id?.slice(0, 8)}
                      </td>
                    </tr>
                  );
                })}
                {/* Load more */}
                {hasMore && (
                  <tr>
                    <td colSpan={4} className="p-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); fetchMore(); }}
                        disabled={loadingMore}
                        className="w-full py-1.5 flex items-center justify-center gap-1 text-[11px] text-gray-500 hover:text-gray-300 hover:bg-gray-800/40 transition-colors"
                      >
                        {loadingMore ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                        {loadingMore ? '로딩 중...' : '더 보기'}
                      </button>
                    </td>
                  </tr>
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
