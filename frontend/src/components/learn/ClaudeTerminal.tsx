'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLearningStore } from '@/stores/useLearningStore';
import { claudeTerminalAdapter } from '@/lib/adapters/claude-terminal';
import { cn } from '@/lib/utils';

export function ClaudeTerminal() {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    currentPaper,
    stages,
    currentStageIndex,
    terminalMessages,
    isTerminalLoading,
    addTerminalMessage,
    setTerminalLoading,
  } = useLearningStore();

  const currentStage = stages[currentStageIndex];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [terminalMessages]);

  // Send stage introduction when stage changes
  useEffect(() => {
    if (!currentPaper || !currentStage) return;
    let cancelled = false;
    const context = {
      paperId: currentPaper.id,
      paperTitle: currentPaper.title,
      stageNumber: currentStage.stageNumber,
      stageTitle: currentStage.title,
      concepts: currentStage.concepts,
    };
    setTerminalLoading(true);
    claudeTerminalAdapter.getStageIntroduction(context).then((intro) => {
      if (cancelled) return;
      addTerminalMessage({
        role: 'assistant',
        content: intro,
        timestamp: new Date().toISOString(),
      });
      setTerminalLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentStageIndex, currentPaper?.id]);

  const handleSend = async () => {
    if (!input.trim() || isTerminalLoading || !currentPaper || !currentStage) return;

    const message = input.trim();
    setInput('');

    addTerminalMessage({
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    });

    const context = {
      paperId: currentPaper.id,
      paperTitle: currentPaper.title,
      stageNumber: currentStage.stageNumber,
      stageTitle: currentStage.title,
      concepts: currentStage.concepts,
    };

    setTerminalLoading(true);
    const response = await claudeTerminalAdapter.sendMessage(message, context);
    addTerminalMessage({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString(),
    });
    setTerminalLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] text-gray-100">
      {/* Terminal Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#16162a] border-b border-gray-700">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <span className="text-xs text-gray-400 font-mono ml-2">
          Claude Code — {currentStage?.title || 'Loading...'}
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {terminalMessages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              'text-sm font-mono whitespace-pre-wrap',
              msg.role === 'user'
                ? 'text-[#FF9D00]'
                : msg.role === 'system'
                ? 'text-gray-500 italic'
                : 'text-gray-200'
            )}
          >
            {msg.role === 'user' && (
              <span className="text-green-400 mr-1">{'>'}</span>
            )}
            {msg.content}
          </div>
        ))}
        {isTerminalLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="font-mono">Thinking...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-700 bg-[#16162a]">
        <span className="text-green-400 font-mono text-sm">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about the concepts..."
          className="flex-1 bg-transparent text-sm font-mono text-gray-100 outline-none placeholder:text-gray-600"
          disabled={isTerminalLoading}
        />
        <Button
          size="sm"
          variant="ghost"
          onClick={handleSend}
          disabled={!input.trim() || isTerminalLoading}
          className="h-7 w-7 p-0 text-gray-400 hover:text-white"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
