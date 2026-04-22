'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';

interface Props {
  disabled?: boolean;
  representativeIntentLabel?: string;
  onAskAndReply: (question: string, answer: string) => Promise<void>;
  onSubmitResult: (result: string) => void;
  hasInteracted: boolean;
}

type Message = { from: 'bot' | 'user'; text: string };

const GREETING: Message = {
  from: 'bot',
  text: '안녕하세요! 궁금한 내용을 질문해주세요.',
};

function fakeReply(question: string): string {
  // Lightweight simulation: acknowledge the question and produce a
  // "fixed-looking" response. Good enough for a 5-min course demo.
  return `질문 "${question}" 에 대해 수정된 인텐트로 매칭되어 답변드려요. 요청하신 정보를 단계별로 안내해 드리겠습니다...`;
}

export function ChatbotTestPage({
  disabled,
  representativeIntentLabel,
  onAskAndReply,
  onSubmitResult,
  hasInteracted,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [resultDraft, setResultDraft] = useState('');
  const [localInteracted, setLocalInteracted] = useState(hasInteracted);

  const send = async () => {
    const q = input.trim();
    if (!q || waiting || disabled) return;
    setMessages((m) => [...m, { from: 'user', text: q }]);
    setInput('');
    setWaiting(true);
    await new Promise((r) => setTimeout(r, 700));
    const a = fakeReply(q);
    setMessages((m) => [...m, { from: 'bot', text: a }]);
    setWaiting(false);
    setLocalInteracted(true);
    await onAskAndReply(q, a);
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-white text-[#37352f]">
      <div className="flex items-center gap-2 border-b border-[rgba(55,53,47,0.09)] bg-[#f8f8f7] px-4 py-2 text-sm font-medium">
        <span>🤖</span>
        <span>Dev 궁금하냥 챗봇</span>
        {representativeIntentLabel ? (
          <span className="ml-auto text-xs text-gray-400">
            대표 인텐트: {representativeIntentLabel}
          </span>
        ) : null}
      </div>

      <div className="flex-1 space-y-3 overflow-auto px-6 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-2xl px-4 py-2 text-sm ${
                m.from === 'user'
                  ? 'bg-[#FF9D00] text-white'
                  : 'bg-[#f1f1ef] text-[#37352f]'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {waiting ? (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl bg-[#f1f1ef] px-4 py-2 text-sm text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              답변 생성 중…
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-[rgba(55,53,47,0.09)] p-3">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder="Stage 1 에서 발견한 문제와 유사한 질문을 입력해 테스트하세요…"
            disabled={disabled || waiting}
            className="flex-1 rounded-md border border-[rgba(55,53,47,0.12)] px-3 py-2 text-sm outline-none focus:border-[#FF9D00] focus:ring-2 focus:ring-[#FF9D00]/30"
          />
          <button
            onClick={send}
            disabled={disabled || waiting || !input.trim()}
            className="flex items-center gap-1 rounded-md bg-[#FF9D00] px-3 py-2 text-sm text-white disabled:opacity-40"
          >
            <Send size={14} />
            전송
          </button>
        </div>
      </div>

      {localInteracted ? (
        <div className="border-t border-[rgba(55,53,47,0.09)] bg-[#FFFBEA] px-6 py-4">
          <div className="mb-1 text-sm font-semibold">결과 정리</div>
          <div className="mb-2 text-xs text-gray-500">
            수정이 의도한 대로 동작했는지 한두 문장으로 기록하세요.
          </div>
          <textarea
            value={resultDraft}
            onChange={(e) => setResultDraft(e.target.value)}
            rows={3}
            placeholder="예) 문제였던 질문에 올바른 인텐트가 매칭되어 기대한 답변이 나왔음."
            className="w-full resize-none rounded-md border border-[#FF9D00]/40 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF9D00]/30"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={() =>
                !disabled && resultDraft.trim() && onSubmitResult(resultDraft.trim())
              }
              disabled={disabled || !resultDraft.trim()}
              className="rounded-md bg-[#FF9D00] px-3 py-1.5 text-sm text-white disabled:opacity-40"
            >
              {disabled ? '검증 중…' : '결과 제출'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
