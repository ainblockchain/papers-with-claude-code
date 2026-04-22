'use client';

import { useState } from 'react';
import { Home, Loader2, Send } from 'lucide-react';

interface Props {
  disabled?: boolean;
  representativeIntentLabel?: string;
  onAskAndReply: (question: string, answer: string) => Promise<void>;
  onSubmitResult: (result: string) => void;
  hasInteracted: boolean;
}

type Message = { from: 'bot' | 'user'; text: string; time: string };

const HY_BLUE = '#004c86';
const HY_BLUE_ACCENT = '#0069aa';

function formatKoreanTime(d: Date = new Date()): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`;
}

const GREETING_TEXT = `안녕하세요!
저는 한양대학교 챗봇
궁금하냥이에요!✨
더 많이 배울 수 있도록 자주 말 걸어주세요!

*카카오톡에서 "한양대학교 챗봇 궁금하냥" 채널을 추가하면 챗봇 바로가기가 제공됩니다!

🔐 안전한 이용을 위해 개인 정보(이름, 연락처, 이메일 등)는 입력하지 않도록 부탁드려요.`;

function fakeReply(question: string): string {
  return `질문 "${question}"에 대해 수정된 인텐트로 매칭되어 답변드려요. 요청하신 정보를 단계별로 안내해 드릴게요.`;
}

export function ChatbotTestPage({
  disabled,
  representativeIntentLabel,
  onAskAndReply,
  onSubmitResult,
  hasInteracted,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(() => [
    { from: 'bot', text: GREETING_TEXT, time: formatKoreanTime() },
  ]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [resultDraft, setResultDraft] = useState('');
  const [localInteracted, setLocalInteracted] = useState(hasInteracted);

  const send = async () => {
    const q = input.trim();
    if (!q || waiting || disabled) return;
    const now = new Date();
    setMessages((m) => [
      ...m,
      { from: 'user', text: q, time: formatKoreanTime(now) },
    ]);
    setInput('');
    setWaiting(true);
    await new Promise((r) => setTimeout(r, 700));
    const a = fakeReply(q);
    setMessages((m) => [
      ...m,
      { from: 'bot', text: a, time: formatKoreanTime() },
    ]);
    setWaiting(false);
    setLocalInteracted(true);
    await onAskAndReply(q, a);
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white">
      {/* Top header — Hanyang blue bar with logo text and DEV badge.
          Original page uses a bitmap logo which we don't ship; a styled
          white wordmark stands in with identical color + height. */}
      <header
        className="relative flex h-12 w-full shrink-0 items-center justify-center px-4 shadow-sm"
        style={{ background: HY_BLUE }}
      >
        <span className="text-[15px] font-bold tracking-wide text-white">
          HANYANG UNIVERSITY
        </span>
        <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm bg-[#FFD54D] px-1.5 py-0.5 text-[10px] font-bold text-[#1a1a1a]">
          DEV
        </span>
        {representativeIntentLabel ? (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 rounded-sm bg-white/15 px-1.5 py-0.5 text-[10px] text-white">
            테스트: {representativeIntentLabel}
          </span>
        ) : null}
      </header>

      {/* Main scrollable area — messages above, input bar pinned at bottom. */}
      <main className="relative flex flex-1 flex-col overflow-hidden">
        {/* Messages */}
        <div className="mb-scrollbar flex-1 overflow-y-auto px-2 pt-2 pb-[120px]">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-3">
            {messages.map((m, i) =>
              m.from === 'bot' ? (
                <BotBubble key={i} text={m.text} time={m.time} />
              ) : (
                <UserBubble key={i} text={m.text} time={m.time} />
              ),
            )}
            {waiting ? <BotTyping /> : null}
          </div>
        </div>

        {/* Character decoration — sits above the input bar, behind bubbles. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[52px] right-2 z-0 flex h-[130px] w-[120px] select-none flex-col items-center justify-end text-[88px] leading-none opacity-70"
        >
          <span>🦁</span>
          <span className="mt-1 text-[11px] font-medium text-[rgba(0,0,0,0.35)]">
            궁금하냥
          </span>
        </div>

        {/* Result-summary panel — reveals after first exchange, sits above
            the input bar. Keeps the orange course-accent so it reads as a
            "fill this before continuing" surface rather than chat chrome. */}
        {localInteracted ? (
          <section className="absolute bottom-[52px] left-1/2 z-20 w-[min(92%,700px)] -translate-x-1/2 rounded-lg border border-[#FFD7A3] bg-[#FFFBEA] p-3 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
            <div className="mb-0.5 text-sm font-semibold text-[#37352f]">
              결과 정리
            </div>
            <div className="mb-2 text-xs text-gray-500">
              수정이 의도한 대로 동작했는지 한두 문장으로 기록하세요.
            </div>
            <textarea
              value={resultDraft}
              onChange={(e) => setResultDraft(e.target.value)}
              rows={2}
              placeholder="예) 문제였던 질문에 올바른 인텐트가 매칭되어 기대한 답변이 나왔음."
              className="w-full resize-none rounded-md border border-[#FF9D00]/40 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#FF9D00]/30"
            />
            <div className="mt-2 flex justify-end">
              <button
                onClick={() =>
                  !disabled &&
                  resultDraft.trim() &&
                  onSubmitResult(resultDraft.trim())
                }
                disabled={disabled || !resultDraft.trim()}
                className="rounded-md bg-[#FF9D00] px-3 py-1.5 text-sm font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:bg-[#E68E00] disabled:opacity-40"
              >
                {disabled ? '검증 중…' : '결과 제출'}
              </button>
            </div>
          </section>
        ) : null}

        {/* Bottom input bar — Hanyang blue full-width strip with a round
            home button, the input field, and a round send button. Home is
            decorative here (no route to go home inside the course). */}
        <div
          className="absolute bottom-0 left-0 right-0 z-30 border-t-0 p-2"
          style={{ background: HY_BLUE }}
        >
          <div className="mx-auto flex w-full max-w-[720px] items-center gap-2 px-1">
            <button
              type="button"
              aria-label="처음으로"
              className="group relative flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full"
              style={{ background: HY_BLUE }}
            >
              <Home size={18} className="text-white" />
              <span className="pointer-events-none invisible absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[15px] px-2 py-1 text-[11px] font-bold text-white group-hover:visible" style={{ background: HY_BLUE_ACCENT }}>
                처음으로
              </span>
            </button>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') send();
              }}
              disabled={disabled || waiting}
              placeholder="궁금한 내용을 입력해 보세요…"
              type="text"
              className="h-[30px] flex-1 rounded-[12px] bg-white px-3 text-[14px] text-[#37352f] outline-none placeholder:text-[rgba(0,0,0,0.35)]"
            />
            <button
              type="button"
              onClick={send}
              disabled={disabled || waiting || !input.trim()}
              aria-label="전송"
              className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full disabled:opacity-50"
              style={{ background: HY_BLUE }}
            >
              <Send size={16} className="text-white" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Message bubbles
// ──────────────────────────────────────────────────────────────────────

function BotBubble({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex w-full max-w-[calc(80%+40px)] flex-col">
      <div className="ml-1 flex w-full">
        <div className="flex flex-row items-start">
          <div
            className="relative flex shrink-0 items-center justify-center rounded-full bg-[#FFE680] text-[16px] leading-none"
            style={{ width: 30, height: 30 }}
            aria-label="궁금하냥 profile"
          >
            🦁
          </div>
          <div className="ml-2 flex-1">
            <div className="flex items-end">
              <div className="rounded-2xl rounded-tl-none border border-gray-200 bg-[#f8f9fa] px-3 py-2 shadow-sm [word-break:keep-all]">
                <div className="flex w-full flex-col gap-2 text-sm text-[#37352f]">
                  <p className="whitespace-pre-wrap leading-[1.5]">{text}</p>
                </div>
              </div>
              <div
                className="ml-1 shrink-0 whitespace-nowrap"
                style={{
                  fontSize: '0.7rem',
                  color: 'rgb(153, 153, 153)',
                  minWidth: '3.5em',
                }}
              >
                {time}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserBubble({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex w-full max-w-[calc(80%+40px)] flex-col self-end">
      <div className="mr-1 flex w-full justify-end">
        <div className="flex flex-row items-end">
          <div
            className="mr-1 shrink-0 whitespace-nowrap"
            style={{
              fontSize: '0.7rem',
              color: 'rgb(153, 153, 153)',
              minWidth: '3.5em',
              textAlign: 'right',
            }}
          >
            {time}
          </div>
          <div
            className="rounded-2xl rounded-tr-none px-3 py-2 text-sm text-white shadow-sm [word-break:keep-all]"
            style={{ background: HY_BLUE }}
          >
            <p className="whitespace-pre-wrap leading-[1.5]">{text}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function BotTyping() {
  return (
    <div className="flex w-full max-w-[calc(80%+40px)] flex-col">
      <div className="ml-1 flex w-full">
        <div className="flex flex-row items-start">
          <div
            className="relative flex shrink-0 items-center justify-center rounded-full bg-[#FFE680] text-[16px] leading-none"
            style={{ width: 30, height: 30 }}
            aria-hidden="true"
          >
            🦁
          </div>
          <div className="ml-2 flex-1">
            <div className="flex items-center">
              <div className="rounded-2xl rounded-tl-none border border-gray-200 bg-[#f8f9fa] px-3 py-2 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  답변 생성 중…
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
