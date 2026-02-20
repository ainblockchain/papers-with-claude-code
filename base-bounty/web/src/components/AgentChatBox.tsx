'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface ChatMessage {
  id: string;
  type: 'cycle_start' | 'thinking' | 'exploration' | 'cycle_end' | 'user' | 'error' | 'user_message_ack';
  data: any;
  timestamp: number;
}

const MAX_MESSAGES = 100;

export default function AgentChatBox() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [collapsed, setCollapsed] = useState(true);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgIdRef = useRef(0);

  // Connect to SSE stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      eventSource = new EventSource('/api/agent/stream');

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();
        // Retry after 10 seconds
        retryTimeout = setTimeout(connect, 10000);
      };

      function addMessage(type: ChatMessage['type'], data: any) {
        setMessages((prev) => {
          const next = [...prev, { id: String(++msgIdRef.current), type, data, timestamp: Date.now() }];
          return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
        });
      }

      eventSource.addEventListener('status', (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.running) setConnected(true);
        } catch {}
      });

      eventSource.addEventListener('cycle_start', (e) => {
        try {
          const data = JSON.parse(e.data);
          setCurrentStrategy(data.strategy);
          addMessage('cycle_start', data);
        } catch {}
      });

      eventSource.addEventListener('thinking', (e) => {
        try {
          addMessage('thinking', JSON.parse(e.data));
        } catch {}
      });

      eventSource.addEventListener('exploration', (e) => {
        try {
          addMessage('exploration', JSON.parse(e.data));
        } catch {}
      });

      eventSource.addEventListener('cycle_end', (e) => {
        try {
          addMessage('cycle_end', JSON.parse(e.data));
        } catch {}
      });

      eventSource.addEventListener('user_message_ack', (e) => {
        try {
          addMessage('user_message_ack', JSON.parse(e.data));
        } catch {}
      });

      eventSource.addEventListener('error', (e) => {
        try {
          const data = JSON.parse((e as any).data || '{}');
          addMessage('error', data);
        } catch {}
      });
    }

    connect();

    return () => {
      eventSource?.close();
      clearTimeout(retryTimeout);
    };
  }, []);

  // Auto-scroll
  useEffect(() => {
    if (!collapsed && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, collapsed]);

  async function handleSend() {
    if (!input.trim()) return;
    const msg = input.trim();
    setInput('');

    setMessages((prev) => {
      const next = [
        ...prev,
        { id: String(++msgIdRef.current), type: 'user' as const, data: { message: msg }, timestamp: Date.now() },
      ];
      return next.length > MAX_MESSAGES ? next.slice(-MAX_MESSAGES) : next;
    });

    try {
      await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
    } catch {}
  }

  const STRATEGY_COLORS: Record<string, string> = {
    explore: 'bg-blue-500/20 text-blue-400',
    align: 'bg-purple-500/20 text-purple-400',
    earn: 'bg-amber-500/20 text-amber-400',
    sustain: 'bg-emerald-500/20 text-emerald-400',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50" style={{ width: collapsed ? 'auto' : '380px' }}>
      {/* Collapsed state */}
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 shadow-lg hover:border-cogito-blue transition-colors"
        >
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className="text-sm text-gray-300">Agent Mind</span>
          {currentStrategy && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${STRATEGY_COLORS[currentStrategy] || 'bg-gray-700 text-gray-400'}`}>
              {currentStrategy}
            </span>
          )}
        </button>
      ) : (
        /* Expanded state */
        <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl flex flex-col" style={{ height: '480px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
              <span className="text-sm font-medium text-gray-200">Agent Mind</span>
              {currentStrategy && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${STRATEGY_COLORS[currentStrategy] || 'bg-gray-700 text-gray-400'}`}>
                  {currentStrategy}
                </span>
              )}
            </div>
            <button
              onClick={() => setCollapsed(true)}
              className="text-gray-500 hover:text-white text-xs px-1"
            >
              _
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
            {messages.length === 0 && (
              <div className="text-xs text-gray-600 text-center py-8">
                {connected ? 'Waiting for agent events...' : 'Connecting to agent...'}
              </div>
            )}
            {messages.map((msg) => {
              switch (msg.type) {
                case 'cycle_start':
                  return (
                    <div key={msg.id} className="text-[10px] text-gray-600 text-center py-1">
                      --- Cycle #{msg.data.cycleNumber}: {msg.data.strategy} ---
                    </div>
                  );
                case 'cycle_end':
                  return null;
                case 'thinking':
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="bg-gray-800 rounded-lg px-3 py-1.5 max-w-[85%]">
                        <div className="text-[10px] text-gray-500 mb-0.5">{msg.data.topic}</div>
                        <div className="text-xs text-gray-300">{msg.data.message}</div>
                      </div>
                    </div>
                  );
                case 'exploration':
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="bg-cogito-blue/10 border border-cogito-blue/30 rounded-lg px-3 py-2 max-w-[85%]">
                        <div className="text-xs font-medium text-white">{msg.data.title}</div>
                        <Link
                          href={`/content/${msg.data.topicPath}`}
                          className="text-[10px] text-cogito-blue hover:underline"
                        >
                          {msg.data.topicPath}
                        </Link>
                        {msg.data.paperRef && (
                          <div className="text-[10px] text-gray-500 mt-0.5">{msg.data.paperRef}</div>
                        )}
                      </div>
                    </div>
                  );
                case 'user':
                  return (
                    <div key={msg.id} className="flex justify-end">
                      <div className="bg-cogito-blue rounded-lg px-3 py-1.5 max-w-[85%]">
                        <div className="text-xs text-white">{msg.data.message}</div>
                      </div>
                    </div>
                  );
                case 'user_message_ack':
                  return (
                    <div key={msg.id} className="flex justify-start">
                      <div className="bg-gray-800 rounded-lg px-3 py-1.5 max-w-[85%]">
                        <div className="text-xs text-green-400">{msg.data.response}</div>
                      </div>
                    </div>
                  );
                case 'error':
                  return (
                    <div key={msg.id} className="text-[10px] text-red-400 text-center">
                      {msg.data.message || 'Connection error'}
                    </div>
                  );
                default:
                  return null;
              }
            })}
          </div>

          {/* Input */}
          <div className="border-t border-gray-800 px-3 py-2">
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Suggest a topic or question..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cogito-blue"
              />
              <button
                type="submit"
                disabled={!input.trim()}
                className="bg-cogito-blue text-white px-3 py-1 rounded text-xs disabled:opacity-50 hover:bg-blue-600 transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
