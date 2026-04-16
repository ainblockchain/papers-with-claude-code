'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, RefreshCw, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLearningStore } from '@/stores/useLearningStore';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isOpen = activeSignboardId !== null;

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chats?limit=50');
      if (res.ok) {
        const data = await res.json();
        setChats(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchChats();
  }, [isOpen, fetchChats]);

  const handleClose = useCallback(() => {
    setActiveSignboard(null);
    setExpandedId(null);
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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Strip ^^Thinking^^ tags from assistant contents
  // No transformation — show raw content as-is

  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black/70 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900/90">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[#FF9D00]" />
          <h2 className="text-sm font-bold text-white">
            궁금하냥 최신 대화 기록
          </h2>
          <span className="text-xs text-gray-400">{chats.length}건</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchChats}
            disabled={loading}
            className="text-gray-400 hover:text-white h-7 px-2"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
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

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && chats.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            로딩 중...
          </div>
        ) : (
          chats.map((chat, i) => {
            const isExpanded = expandedId === `${i}`;
            const assistantText = chat.assistant?.contents || '';
            return (
              <div
                key={i}
                className={`rounded-lg border cursor-pointer transition-colors ${
                  isExpanded
                    ? 'border-[#FF9D00]/50 bg-gray-800/80'
                    : 'border-gray-700 bg-gray-800/40 hover:bg-gray-800/60'
                }`}
                onClick={() => setExpandedId(isExpanded ? null : `${i}`)}
              >
                <div className="px-3 py-2 flex items-start gap-3">
                  {/* Intent badge */}
                  <span
                    className={`flex-shrink-0 mt-0.5 px-2 py-0.5 rounded text-[10px] font-medium ${
                      chat.intent === 'no_intent'
                        ? 'bg-red-900/50 text-red-300'
                        : 'bg-emerald-900/50 text-emerald-300'
                    }`}
                  >
                    {chat.intent || 'unknown'}
                  </span>

                  {/* User message */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {chat.user?.message}
                    </p>
                    {isExpanded && assistantText && (
                      <p className="mt-2 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed border-t border-gray-700 pt-2">
                        {assistantText.length > 500
                          ? assistantText.slice(0, 500) + '...'
                          : assistantText}
                      </p>
                    )}
                  </div>

                  {/* Timestamp + Session ID */}
                  <div className="flex-shrink-0 text-right">
                    <span className="text-[10px] text-gray-500 block">
                      {formatTime(chat.created_at)}
                    </span>
                    <span className="text-[8px] text-gray-600 block font-mono">
                      {chat.session_id?.slice(0, 8)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
