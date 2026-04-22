'use client';

import { useState } from 'react';
import { Home, Lightbulb, Loader2, Send } from 'lucide-react';
import type { SelectedIntent } from '@/lib/courses/fix-intent-5min/course-state';
import {
  ON_TOPIC_REPLY,
  OFF_TOPIC_REPLY,
} from '@/data/courses/fix-intent-5min/chatbot-replies';

interface Props {
  disabled?: boolean;
  representativeIntentLabel?: string;
  // Full representative row — forwarded to the validate-chatbot route
  // so the LLM can anchor its "on-topic?" judgment in the broken case.
  representativeIntent?: SelectedIntent | null;
  onAskAndReply: (
    question: string,
    answer: string,
    meta: { onTopic: boolean },
  ) => Promise<void>;
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

// Asks the server whether the learner's message is on-topic for the
// intent they just fixed. Network / parsing failures degrade to
// onTopic=false so the OFF_TOPIC_REPLY keeps the loop educational
// rather than showing a broken state.
async function judgeOnTopic(
  question: string,
  representativeIntent: SelectedIntent | null | undefined,
): Promise<boolean> {
  try {
    const res = await fetch(
      '/api/courses/fix-intent-5min/validate-chatbot',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          context: { representativeIntent: representativeIntent ?? null },
        }),
      },
    );
    const data = await res.json();
    return !!data?.onTopic;
  } catch {
    return false;
  }
}

export function ChatbotTestPage({
  disabled,
  representativeIntentLabel,
  representativeIntent,
  onAskAndReply,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(() => [
    { from: 'bot', text: GREETING_TEXT, time: formatKoreanTime() },
  ]);
  const [input, setInput] = useState('');
  const [waiting, setWaiting] = useState(false);

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

    const onTopic = await judgeOnTopic(q, representativeIntent);
    const a = onTopic ? ON_TOPIC_REPLY : OFF_TOPIC_REPLY;

    setMessages((m) => [
      ...m,
      { from: 'bot', text: a, time: formatKoreanTime() },
    ]);
    setWaiting(false);
    await onAskAndReply(q, a, { onTopic });
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

      {/* Orange guide band — course-owned instruction strip sandwiched
          between the Hanyang header and the bot UI, so the learner can
          always see what this stage is asking for. */}
      <div className="flex shrink-0 items-start gap-2 border-b border-[#FFD7A3] bg-[#FFF1E0] px-4 py-2 text-[13px] text-[#5B3500]">
        <Lightbulb
          size={14}
          className="mt-[2px] shrink-0 text-[#FF9D00]"
          aria-hidden="true"
        />
        <span>
          <span className="font-semibold text-[#B25A00]">테스트 가이드</span>
          {' · '}
          Stage 1 에서 발견했던 문제 발화를 이 Dev 챗봇에 그대로 넣어
          보세요. 수정한 인텐트로 올바른 답변이 나오는지 확인한 뒤, 하단
          <span className="font-medium"> 결과 정리 </span>
          에 한두 문장 기록해 제출하면 Stage 4 가 끝납니다.
        </span>
      </div>

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

        {/* Character decoration — official 궁금하냥 mascot pinned to the
            bottom-right, behind the input bar (bottom:52px keeps it above
            the bar) and behind any chat bubbles that reach this far. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/courses/fix-intent-5min/curious-nyang-character.webp"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-[52px] right-0 z-0 h-[140px] w-[127px] select-none object-contain"
        />

        {/* Result-summary panel — reveals after first exchange, sits above
            the input bar. Keeps the orange course-accent so it reads as a
            "fill this before continuing" surface rather than chat chrome. */}
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
              placeholder="시험 못보면 어떻게 되는거야"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/courses/fix-intent-5min/curious-nyang-avatar.png"
            alt="궁금하냥 profile"
            width={30}
            height={30}
            className="shrink-0 rounded-full"
          />
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/courses/fix-intent-5min/curious-nyang-avatar.png"
            alt=""
            aria-hidden="true"
            width={30}
            height={30}
            className="shrink-0 rounded-full"
          />
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
