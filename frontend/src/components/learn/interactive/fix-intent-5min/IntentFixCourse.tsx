'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  buildStaticChatLogSet,
  type ChatLogRow,
  type ChatLogSet,
} from '@/data/courses/fix-intent-5min/chat-log-sets';
import {
  initialCourseState,
  type CourseState,
  type NotionFieldId,
  type NotionState,
  type SelectedIntent,
  type SheetArtifact,
} from '@/lib/courses/fix-intent-5min/course-state';
import { validateNotionField } from '@/lib/courses/fix-intent-5min/validate';
import {
  assigneeHint,
  seasonHints,
  statusHints,
  statusHintsStage4,
} from '@/data/courses/fix-intent-5min/notion-options';
import { computeWorkTypeHint } from '@/lib/courses/fix-intent-5min/workTypeHint';
import {
  loadCourseState,
  saveCourseState,
  recordStageComplete,
} from '@/lib/courses/fix-intent-5min/storage';
import { useAuthStore } from '@/stores/useAuthStore';
import { useLearningStore } from '@/stores/useLearningStore';
import { progressAdapter } from '@/lib/adapters/progress';
import { DashboardView } from './DashboardView';
import { FeedbackModal } from './FeedbackModal';
import { QuestModal } from './QuestModal';
import { NotionLanding } from './NotionLanding';
import {
  NotionTaskPage,
  STAGE1_FIELD_ORDER,
  STAGE2_FIELD_ORDER,
  STAGE3_FIELD_ORDER,
  STAGE4_FIELD_ORDER,
} from './NotionTaskPage';
import { IntentDetailCard } from './IntentDetailCard';
import { CopyIssueModal } from './CopyIssueModal';
import { IntentCatalogModal } from './IntentCatalogModal';
import { SheetEditPage } from './SheetEditPage';
import { ChatbotTestPage } from './ChatbotTestPage';

export const FIX_INTENT_COURSE_ID = 'curious-nyang-intent-guide--fix-intent-5min';
const FIX_INTENT_TOTAL_STAGES = 4;

// Mirror QuizOverlay's stage-complete side-effects for the interactive course:
// 1) write to localStorage (fallback when blockchain is slow/failing) and
// 2) update the Zustand progress store so in-session UI sees the new stage
//    even on the first play through (when useLearningStore.progress starts
//    null and the original "if (curr) setProgress(...)" guard used to skip).
function markStageCompleteLocally(stageNum: number) {
  const { progress: curr, setProgress } = useLearningStore.getState();
  const { user } = useAuthStore.getState();
  const completedAt = new Date().toISOString();

  if (user) {
    progressAdapter.saveCheckpoint({
      userId: user.id,
      paperId: FIX_INTENT_COURSE_ID,
      stageNumber: stageNum,
      completedAt,
      totalStages: FIX_INTENT_TOTAL_STAGES,
      completedOnly: true,
    });
  }

  const alreadyDone = curr?.completedStages?.some(
    (s) => s.stageNumber === stageNum,
  );
  if (!alreadyDone) {
    setProgress({
      paperId: FIX_INTENT_COURSE_ID,
      currentStage: curr?.currentStage ?? stageNum,
      totalStages: curr?.totalStages ?? FIX_INTENT_TOTAL_STAGES,
      completedStages: [
        ...(curr?.completedStages ?? []),
        { stageNumber: stageNum, completedAt },
      ],
      unlockedStages: curr?.unlockedStages ?? [],
      lastAccessedAt: completedAt,
    });
  }
}

type Phase =
  | 'dashboard'
  | 'notion'
  | 'quest-clear'
  | 'stage2-page'
  | 'quest-clear-2'
  | 'sheet-edit'
  | 'quest-clear-3'
  | 'chatbot-test'
  | 'stage4-result-page'
  | 'course-complete';

function countFilledStage1Notion(notion: NotionState): number {
  return STAGE1_FIELD_ORDER.filter((f) => notion[f] != null).length;
}

function countFilledStage2Notion(notion: NotionState): number {
  return STAGE2_FIELD_ORDER.filter((f) => notion[f] != null).length;
}

function countFilledStage3Notion(notion: NotionState): number {
  return STAGE3_FIELD_ORDER.filter((f) => notion[f] != null).length;
}

function countFilledStage4Notion(notion: NotionState): number {
  // Stage 4's order is [status, result]. status arrives pre-filled from Stage 1
  // with 'In Progress' so we cannot treat "non-null" as filled here — status
  // counts as Stage-4-complete only once the learner flips it to 'Done'.
  // Stops at the first unfilled field so the learner lands on the right one.
  let count = 0;
  for (const f of STAGE4_FIELD_ORDER) {
    const filled = f === 'status' ? notion.status === 'Done' : notion[f] != null;
    if (!filled) break;
    count++;
  }
  return count;
}

// Escape user text before embedding in generated HTML. The BlockField
// sanitizer strips unknown tags anyway but we still want to prevent
// malformed markup from breaking the table structure.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Build the "작업 내역" auto-fill block from the Stage 3 artifact — the new
// intent row (as a single-row table matching the intent sheet schema) plus
// a table of trigger sentences the learner added.
function generateWorkSummaryHtml(artifact: SheetArtifact): string {
  const a = artifact.addedIntent;
  const intentTable =
    `<table>` +
    `<thead><tr>` +
    `<th>sheet</th><th>intent</th><th>lead_sentence</th>` +
    `<th>prompt</th><th>created_at</th>` +
    `</tr></thead>` +
    `<tbody><tr>` +
    `<td>${escapeHtml(a.sheetId)}</td>` +
    `<td>${escapeHtml(a.intent)}</td>` +
    `<td>${escapeHtml(a.leadSentence)}</td>` +
    `<td>${escapeHtml(a.prompt)}</td>` +
    `<td>${escapeHtml(a.createdAt)}</td>` +
    `</tr></tbody></table>`;
  const triggerRows = artifact.triggers
    .map(
      (t) =>
        `<tr><td>${escapeHtml(t.intent)}</td><td>${escapeHtml(t.sentence)}</td></tr>`,
    )
    .join('');
  const triggerTable =
    `<table>` +
    `<thead><tr><th>인텐트</th><th>트리거링 문장</th></tr></thead>` +
    `<tbody>${triggerRows}</tbody>` +
    `</table>`;
  return (
    `<p><strong>추가한 인텐트</strong></p>` +
    intentTable +
    `<p><strong>추가한 트리거링 문장</strong></p>` +
    triggerTable
  );
}


// Luma-inspired celebration screen — cosmic gradient backdrop, floating
// nebula blobs, starfield twinkle, multiple firework bursts, and glowing
// headline. Closes the course with a congratulatory moment and a CTA
// nudge to keep contributing to 궁금하냥 intents.
//
// All animation keyframes + base styling are embedded in a local <style>
// tag and applied via inline `style` rather than relying on global CSS
// classes — earlier attempt put `.cc-*` classes in globals.css and the
// Tailwind v4 build pipeline silently dropped them (filter blur, gradient
// background, rise-in opacity transitions all failed to apply, leaving
// hard solid circles on a white background). Inline styling guarantees
// the celebration renders identically regardless of CSS layer ordering.
function CourseCompleteView() {
  const fireworkOrigins = [
    { top: '18%', left: '15%', delay: 0 },
    { top: '22%', left: '75%', delay: 0.4 },
    { top: '55%', left: '10%', delay: 0.9 },
    { top: '65%', left: '82%', delay: 1.3 },
    { top: '40%', left: '50%', delay: 0.2 },
  ];
  const particlesPerFirework = 10;
  const twinkles = [
    { top: '8%', left: '22%', delay: 0, size: 3 },
    { top: '12%', left: '68%', delay: 0.5, size: 2 },
    { top: '30%', left: '88%', delay: 1.1, size: 3 },
    { top: '48%', left: '30%', delay: 0.3, size: 2 },
    { top: '72%', left: '55%', delay: 0.9, size: 3 },
    { top: '85%', left: '20%', delay: 1.4, size: 2 },
    { top: '18%', left: '48%', delay: 1.6, size: 2 },
    { top: '62%', left: '40%', delay: 2.0, size: 3 },
    { top: '38%', left: '70%', delay: 0.8, size: 2 },
    { top: '78%', left: '78%', delay: 0.6, size: 3 },
  ];
  const fireworkColors = ['#FFB4E9', '#A78BFA', '#60A5FA', '#FBBF24', '#34D399'];
  const cosmicBg =
    'radial-gradient(ellipse at 20% 30%, rgba(150,90,220,0.55), transparent 55%),' +
    'radial-gradient(ellipse at 80% 20%, rgba(255,110,180,0.5), transparent 55%),' +
    'radial-gradient(ellipse at 60% 85%, rgba(80,170,255,0.55), transparent 55%),' +
    'linear-gradient(135deg, #0a0820 0%, #14083a 40%, #1a0a50 100%)';
  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      style={{ background: cosmicBg }}
    >
      <style>{`
        @keyframes cc-blob-drift {
          0%   { transform: translate3d(0, 0, 0) scale(1);   opacity: 0.55; }
          50%  { transform: translate3d(12%, -8%, 0) scale(1.2); opacity: 0.8; }
          100% { transform: translate3d(0, 0, 0) scale(1);   opacity: 0.55; }
        }
        @keyframes cc-twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
        @keyframes cc-firework-burst {
          0%   { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translate(calc(-50% + var(--fw-dx, 80px)), calc(-50% + var(--fw-dy, -80px))) scale(1.4); opacity: 0; }
        }
        @keyframes cc-firework-center {
          0%   { transform: translate(-50%, -50%) scale(0);   opacity: 0; }
          30%  { transform: translate(-50%, -50%) scale(1.6); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(0.4); opacity: 0; }
        }
        @keyframes cc-title-glow {
          0%, 100% { text-shadow: 0 0 14px rgba(255,180,255,0.55), 0 0 32px rgba(130,120,255,0.45), 0 0 70px rgba(90,200,255,0.35); }
          50%      { text-shadow: 0 0 22px rgba(255,200,255,0.85), 0 0 48px rgba(160,150,255,0.7),  0 0 110px rgba(120,220,255,0.6); }
        }
        @keyframes cc-rise-in {
          0%   { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Drifting nebula blobs (blurred via inline filter) */}
      {[
        { size: '50%', top: '10%', left: '5%',  color: '#A855F7', delay: 0 },
        { size: '45%', top: '45%', left: '55%', color: '#EC4899', delay: 3 },
        { size: '40%', top: '55%', left: '15%', color: '#3B82F6', delay: 6 },
      ].map((b, i) => (
        <div
          key={`blob-${i}`}
          className="pointer-events-none absolute rounded-full"
          style={{
            top: b.top,
            left: b.left,
            width: b.size,
            height: b.size,
            background: b.color,
            filter: 'blur(48px)',
            animation: `cc-blob-drift 14s ease-in-out infinite`,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}

      {/* Starfield twinkles */}
      {twinkles.map((t, i) => (
        <span
          key={`tw-${i}`}
          className="pointer-events-none absolute rounded-full"
          style={{
            top: t.top,
            left: t.left,
            width: `${t.size}px`,
            height: `${t.size}px`,
            background: 'white',
            boxShadow: '0 0 8px rgba(255,255,255,0.8)',
            animation: 'cc-twinkle 3.2s ease-in-out infinite',
            animationDelay: `${t.delay}s`,
          }}
        />
      ))}

      {/* Fireworks — each origin spawns a glowing center + particles fanning outward */}
      {fireworkOrigins.map((origin, oi) => (
        <div
          key={`fw-${oi}`}
          className="pointer-events-none absolute"
          style={{ top: origin.top, left: origin.left }}
        >
          <span
            className="absolute block rounded-full"
            style={{
              width: '12px',
              height: '12px',
              background: fireworkColors[oi % fireworkColors.length],
              boxShadow: `0 0 24px ${fireworkColors[oi % fireworkColors.length]}`,
              animation: 'cc-firework-center 1.6s ease-out infinite',
              animationDelay: `${origin.delay}s`,
            }}
          />
          {Array.from({ length: particlesPerFirework }).map((_, pi) => {
            const angle = (pi / particlesPerFirework) * Math.PI * 2;
            const radius = 90;
            const dx = Math.cos(angle) * radius;
            const dy = Math.sin(angle) * radius;
            const color = fireworkColors[(oi + pi) % fireworkColors.length];
            return (
              <span
                key={`fw-p-${oi}-${pi}`}
                className="absolute block rounded-full"
                style={
                  {
                    width: '6px',
                    height: '6px',
                    background: color,
                    boxShadow: `0 0 10px ${color}`,
                    animation: 'cc-firework-burst 1.6s ease-out infinite',
                    animationDelay: `${origin.delay}s`,
                    ['--fw-dx' as string]: `${dx}px`,
                    ['--fw-dy' as string]: `${dy}px`,
                  } as React.CSSProperties
                }
              />
            );
          })}
        </div>
      ))}

      {/* Headline + encouragement — centered, rising-in on mount */}
      <div className="relative z-10 flex flex-col items-center px-6 text-center">
        <div
          className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[12px] font-medium tracking-wide text-white/85 backdrop-blur"
          style={{
            opacity: 0,
            animation: 'cc-rise-in 0.8s ease-out forwards',
            animationDelay: '0.05s',
          }}
        >
          🎉 QUEST ALL CLEAR
        </div>
        <h1
          className="bg-gradient-to-br from-white via-[#FFD5F5] to-[#B9D9FF] bg-clip-text text-[44px] font-extrabold leading-tight text-transparent md:text-[56px]"
          style={{
            opacity: 0,
            animation: 'cc-rise-in 0.8s ease-out forwards, cc-title-glow 3s ease-in-out 0.8s infinite',
            animationDelay: '0.15s, 0s',
          }}
        >
          축하합니다!
        </h1>
        <p
          className="mt-2 max-w-xl text-[15px] leading-[1.6] text-white/80 md:text-[16px]"
          style={{
            opacity: 0,
            animation: 'cc-rise-in 0.8s ease-out forwards',
            animationDelay: '0.35s',
          }}
        >
          인텐트 기여 한 사이클을 완주했어요. Stage 1~4 기록이 블록체인에 안전하게
          저장되었습니다.
        </p>
        <div
          className="mt-8 max-w-xl rounded-2xl border border-white/15 bg-white/10 px-6 py-5 text-[14px] leading-[1.65] text-white/90 backdrop-blur"
          style={{
            opacity: 0,
            animation: 'cc-rise-in 0.8s ease-out forwards',
            animationDelay: '0.55s',
          }}
        >
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-[#FFD5F5]">
            🐱 궁금하냥이 여러분의 손을 기다려요
          </p>
          <p>
            궁금하냥 챗봇은 커뮤니티의 크고 작은 기여로 조금씩 똑똑해져요. 사용자
            발화 속에서 또 다른 이상한 답변을 발견하면, 오늘 배운 흐름 그대로 인텐트
            하나를 고쳐 남겨 주세요. 여러분이 남기는 한 줄의 트리거링 문장이 다음
            학습자의 답을 바꿉니다.
          </p>
        </div>
      </div>
    </div>
  );
}

// Visual "capture" card mimicking the Dev 챗봇 UI — shown below the
// result BlockField on Stage 4 after the learner clicks "📷 테스트 결과
// 불러오기". Not persisted to the course state: derived entirely from
// `chatbotInteraction` which is already on-chain.
function ChatbotCaptureBlock({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const now = new Date();
  const time = now.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[rgba(55,53,47,0.12)] bg-[#F9FAFB] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-2 border-b border-[rgba(55,53,47,0.08)] bg-white px-3 py-2">
        <span className="flex gap-1">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28CA41]" />
        </span>
        <span className="ml-2 text-[12px] font-medium text-[rgba(55,53,47,0.65)]">
          📷 Dev 챗봇 테스트 결과 (스크린샷)
        </span>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4">
        <div className="flex w-full justify-end">
          <div className="flex flex-row items-end max-w-[80%]">
            <div
              className="mr-1 shrink-0 whitespace-nowrap text-[11px] text-gray-400"
              style={{ minWidth: '3em', textAlign: 'right' }}
            >
              {time}
            </div>
            <div
              className="rounded-2xl rounded-tr-none px-3 py-2 text-sm text-white shadow-sm"
              style={{ background: '#3B82F6' }}
            >
              <p className="whitespace-pre-wrap leading-[1.5]">{question}</p>
            </div>
          </div>
        </div>
        <div className="flex w-full">
          <div className="flex flex-row items-start max-w-[80%]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/courses/fix-intent-5min/curious-nyang-avatar.png"
              alt="궁금하냥"
              width={28}
              height={28}
              className="shrink-0 rounded-full"
            />
            <div className="ml-2">
              <div className="flex items-end">
                <div className="rounded-2xl rounded-tl-none border border-gray-200 bg-white px-3 py-2 text-sm text-[#37352f] shadow-sm">
                  <p className="whitespace-pre-wrap leading-[1.5]">{answer}</p>
                </div>
                <div
                  className="ml-1 shrink-0 whitespace-nowrap text-[11px] text-gray-400"
                  style={{ minWidth: '3em' }}
                >
                  {time}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Per-field Quest body shown when that field first becomes the active one.
// Only fields rendered inside NotionTaskPage (Stage 1 + Stage 2) get a
// quest — Stage 3/4 have their own page-level briefings instead.
const FIELD_QUEST_MESSAGES: Partial<Record<NotionFieldId, string>> = {
  agent: '알맞은 에이전트를 선택해주세요.',
  title: '이슈 내용이 한눈에 드러나도록 제목을 작성해주세요.',
  assignee: '이 이슈를 맡을 Assignee 를 지정해주세요.',
  status: '작업의 현재 상태(Status)를 선택해주세요.',
  season: '이 이슈가 속할 Season 을 지정해주세요.',
  // workType intentionally omitted — IntentCatalogModal takes over as the
  // guide for this field, opening automatically when it becomes active.
  problemAnalysis:
    '발견한 문제를 정리해 작성해주세요. 본인이 본 문제를 간단히 적고, 문제가 된 채팅 로그를 텍스트로 복사해 붙여넣어주세요. 궁금하냥 팀은 PM이 나중에 검색하기 쉽도록 텍스트 붙여넣기를 권장합니다.',
  solutionDirection: '어떤 방향으로 고칠지 정리해주세요.',
};

export function IntentFixCourse() {
  const passkeyPublicKey = useAuthStore((s) => s.passkeyInfo?.publicKey);
  const githubUsername = useAuthStore((s) => s.user?.username ?? null);

  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('dashboard');
  const [setIndex, setSetIndex] = useState(0);
  const [selectedIntents, setSelectedIntents] = useState<SelectedIntent[]>([]);
  const [representative, setRepresentative] = useState<SelectedIntent | null>(null);
  const [dashboardFeedback, setDashboardFeedback] = useState<
    { correct: boolean; row: ChatLogRow } | null
  >(null);

  const [notion, setNotion] = useState<NotionState>(initialCourseState.notion);
  const [chatbotInteraction, setChatbotInteraction] = useState(
    initialCourseState.chatbotInteraction,
  );
  const [currentFieldIdx, setCurrentFieldIdx] = useState(0);
  const [notionError, setNotionError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  // Per-field attempt counters — used to escalate hint specificity when the
  // learner misses repeatedly on free-input fields (solutionDirection today,
  // extensible later). Reset on successful submission.
  const [fieldAttempts, setFieldAttempts] = useState<
    Partial<Record<NotionFieldId, number>>
  >({});
  // Guards phase-advancing handlers while a blockchain write is in-flight,
  // so a rapid second click can't race ahead of a failed persist.
  const [persisting, setPersisting] = useState(false);
  // One-shot briefing modal: shows on first entry of the dashboard phase when
  // the user has no progress yet. Dismissed for the rest of the session.
  const [questSeen, setQuestSeen] = useState(false);
  // Notion-phase guidance (stage 1 after rep pick):
  // - stage1NotionMissionSeen: dismisses initial "Task로 등록해봅시다" brief
  // - notionFirstCreateSeen: gates the "잘 하셨습니다" celebration to once
  // - notionStrayCount: wrong clicks on the landing before the user finds
  //   the correct "새로 만들기" button — used to escalate guidance to a hint
  // - notionStrayFeedback: current feedback message to show; null hides modal
  // - notionCreateCelebration: celebration QUEST CLEAR modal after first
  //   correct click; dismissal opens the floating panel
  const [stage1NotionMissionSeen, setStage1NotionMissionSeen] = useState(false);
  const [notionFirstCreateSeen, setNotionFirstCreateSeen] = useState(false);
  const [notionStrayCount, setNotionStrayCount] = useState(0);
  const [notionStrayFeedback, setNotionStrayFeedback] = useState<string | null>(
    null,
  );
  const [notionCreateCelebration, setNotionCreateCelebration] = useState(false);
  // Per-field Quest modal seen-set — each time a fresh field becomes active
  // in the Notion task page, a QuestModal nudges the learner on what that
  // field is asking for. Dismissing adds the field id to this set so the
  // modal won't re-show on subsequent renders (e.g. after a wrong submit).
  const [fieldQuestSeen, setFieldQuestSeen] = useState<Set<NotionFieldId>>(
    new Set(),
  );
  // Copy-Issue modal for problemAnalysis — opens on the helper button
  // under the 문제 상황 분석 block so the learner can grab the chat log.
  const [copyIssueOpen, setCopyIssueOpen] = useState(false);
  // Intent-Catalog modal — auto-opens once when the Work Type field first
  // becomes active so the learner can verify that no exam-absence intent
  // exists in the simulated system before deciding the fix. Closing via
  // the 확인 button dismisses it permanently for the session.
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogAutoOpened, setCatalogAutoOpened] = useState(false);
  // Session-only — Stage 4 mission briefing modal shows once when the
  // learner first enters the chatbot-test phase.
  const [stage4MissionSeen, setStage4MissionSeen] = useState(false);
  // Per-field seen-set scoped to Stage 4 result page. Kept separate from
  // the Stage 1-2 `fieldQuestSeen` because the same field id (`status`)
  // can re-fire its quest with different copy in Stage 4.
  const [stage4FieldQuestSeen, setStage4FieldQuestSeen] = useState<
    Set<NotionFieldId>
  >(new Set());
  // Stage 3 artifact — detailed intent + triggers rows the learner wrote.
  // Persisted to blockchain so the Stage 4 work-content auto-fill survives
  // cross-session reloads.
  const [sheetArtifact, setSheetArtifact] = useState<SheetArtifact | null>(null);
  // Stage 4 "테스트 결과 불러오기" toggle — session-local. Renders the Dev
  // 챗봇 Q&A as a styled "capture" card below the result BlockField when
  // true. Not persisted: reloading Stage 4 starts without the capture
  // shown and the learner re-clicks the button if they want it.
  const [captureVisible, setCaptureVisible] = useState(false);
  // Static Stage 1 lineup: one fixed 10-row set (1 broken + 9 clean) in a
  // deterministic order. Rebuilt on restart to return a fresh reference.
  const [activeSets, setActiveSets] = useState<ChatLogSet[]>(() => [
    buildStaticChatLogSet(),
  ]);
  // Hearts HUD: 3 attempts across the dashboard phase. Hitting zero resets
  // the entire stage-1 run (both local state and blockchain blob).
  const [hearts, setHearts] = useState(3);
  const [showRestart, setShowRestart] = useState(false);
  // Countdown timer HUD (dashboard-only). Purely cosmetic — conveys urgency
  // without actually gating the run; reaching zero does not trigger game
  // over (only hearts=0 does). Pauses when any modal is up so reading
  // feedback doesn't visually drain the bar.
  const TIMER_TOTAL = 60;
  const [timerRemaining, setTimerRemaining] = useState(TIMER_TOTAL);
  // Notion floating panel — collapsible companion that persists from the
  // moment a representative intent is picked through Stage 1 completion.
  // Starts closed so users first see the Notion landing page and open the
  // task panel by clicking "새로 만들기". Mid-progress restoration still
  // auto-opens so users resume where they left off.
  const [panelOpen, setPanelOpen] = useState(false);

  // Countdown tick — decrement once per second while the dashboard is
  // actively interactive. Pauses whenever a modal is up (briefing / feedback
  // / restart / persist) so reading feedback doesn't cost time.
  useEffect(() => {
    if (phase !== 'dashboard') return;
    if (showRestart) return;
    if (dashboardFeedback) return;
    if (persisting) return;
    // Quest briefing is up (showQuest condition inlined).
    if (!questSeen && !representative) return;
    if (timerRemaining <= 0) return;
    const t = setTimeout(
      () => setTimerRemaining((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearTimeout(t);
  }, [
    phase,
    showRestart,
    dashboardFeedback,
    persisting,
    questSeen,
    representative,
    timerRemaining,
  ]);

  // Load & restore from blockchain on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = await loadCourseState(passkeyPublicKey);
      if (cancelled) return;
      if (!state) {
        setLoading(false);
        return;
      }
      const restoredNotion = { ...initialCourseState.notion, ...(state.notion ?? {}) };
      const restoredSelected = state.selectedIntents ?? [];
      const restoredRep = state.representativeIntent ?? null;
      const restoredChat =
        state.chatbotInteraction ?? initialCourseState.chatbotInteraction;
      const restoredArtifact = state.sheetArtifact ?? null;
      setSelectedIntents(restoredSelected);
      setRepresentative(restoredRep);
      setNotion(restoredNotion);
      setChatbotInteraction(restoredChat);
      setSheetArtifact(restoredArtifact);
      // Mark fields that were already filled on-chain as having seen their
      // Quest so returning users aren't re-prompted on fields they completed.
      const seen = new Set<NotionFieldId>();
      (Object.keys(FIELD_QUEST_MESSAGES) as NotionFieldId[]).forEach((f) => {
        if (restoredNotion[f] != null) seen.add(f);
      });
      setFieldQuestSeen(seen);
      // Skip the briefing modal when returning mid-progress — the user
      // already knows the objective.
      if (restoredSelected.length > 0 || restoredRep) setQuestSeen(true);
      // Likewise skip the notion-phase guidance modals for returning users:
      // they've already been past the "click 새로 만들기" gate.
      if (restoredRep) {
        setStage1NotionMissionSeen(true);
        setNotionFirstCreateSeen(true);
      }
      const filledCount = countFilledStage1Notion(restoredNotion);
      if (filledCount >= STAGE1_FIELD_ORDER.length) {
        // Fast-forward across completed stages based on which NotionState
        // fields are populated.
        if (restoredNotion.result != null) {
          setPhase('course-complete');
          setCurrentFieldIdx(STAGE4_FIELD_ORDER.length);
        } else if (restoredNotion.workContent != null) {
          // If the chatbot Q&A is already persisted, skip the chat and send
          // the learner straight to the result-entry page in Notion.
          if (restoredChat.question && restoredChat.answer) {
            setPhase('stage4-result-page');
            setCurrentFieldIdx(countFilledStage4Notion(restoredNotion));
          } else {
            setPhase('chatbot-test');
            setCurrentFieldIdx(countFilledStage4Notion(restoredNotion));
          }
        } else if (restoredNotion.solutionDirection != null) {
          setPhase('sheet-edit');
          setCurrentFieldIdx(countFilledStage3Notion(restoredNotion));
        } else {
          setPhase('stage2-page');
          setCurrentFieldIdx(countFilledStage2Notion(restoredNotion));
        }
      } else if (filledCount > 0) {
        setCurrentFieldIdx(filledCount);
        setPhase('notion');
        setPanelOpen(true);
      } else if (restoredRep) {
        setPhase('notion');
        setPanelOpen(false);
      } else {
        setSetIndex(0);
        setPhase('dashboard');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [passkeyPublicKey]);

  const persist = async (partial: Partial<CourseState>): Promise<boolean> => {
    const next: CourseState = {
      selectedIntents,
      representativeIntent: representative,
      notion,
      sheetEdit: { tab: null, cell: null, value: null },
      chatbotInteraction,
      sheetArtifact,
      updatedAt: Date.now(),
      ...partial,
    };
    const result = await saveCourseState(passkeyPublicKey, next);
    if (!result.ok) {
      setSaveError(result.error ?? '저장 실패');
      return false;
    }
    return true;
  };

  const currentSet = activeSets[setIndex];
  const activeFieldOrder =
    phase === 'stage2-page'
      ? STAGE2_FIELD_ORDER
      : phase === 'sheet-edit'
        ? STAGE3_FIELD_ORDER
        : phase === 'chatbot-test' || phase === 'stage4-result-page'
          ? STAGE4_FIELD_ORDER
          : STAGE1_FIELD_ORDER;
  const currentFieldId: NotionFieldId | null =
    currentFieldIdx < activeFieldOrder.length
      ? activeFieldOrder[currentFieldIdx]
      : null;

  // Auto-open the intent catalog the first time Work Type becomes the
  // active field. After the learner dismisses it, never auto-reopen.
  useEffect(() => {
    if (phase !== 'notion') return;
    if (currentFieldId !== 'workType') return;
    if (catalogAutoOpened) return;
    setCatalogOpen(true);
    setCatalogAutoOpened(true);
  }, [phase, currentFieldId, catalogAutoOpened]);

  const handleRowClick = (row: ChatLogRow) => {
    if (dashboardFeedback || showRestart || persisting) return;
    const correct = row.isBroken;

    if (!correct) {
      // Decrement a heart immediately (UI-only — no dedicated modal). If that
      // empties the HUD, surface the restart modal and skip the usual "틀렸습니다"
      // feedback so the user isn't hit with two sequential modals.
      const next = hearts - 1;
      setHearts(next);
      if (next <= 0) {
        setShowRestart(true);
        return;
      }
    }
    setDashboardFeedback({ correct, row });
  };

  const handleRestart = async () => {
    if (persisting) return;
    setPersisting(true);
    // Clear blockchain blob first; if it fails we leave the modal up so the
    // user can retry instead of re-starting against stale server state.
    const cleanState: CourseState = {
      ...initialCourseState,
      updatedAt: Date.now(),
    };
    const result = await saveCourseState(passkeyPublicKey, cleanState);
    setPersisting(false);
    if (!result.ok) {
      setSaveError(result.error ?? '초기화 실패');
      return;
    }
    setSelectedIntents([]);
    setRepresentative(null);
    setNotion(initialCourseState.notion);
    setCurrentFieldIdx(0);
    setSetIndex(0);
    setDashboardFeedback(null);
    setNotionError(null);
    setHearts(3);
    setTimerRemaining(TIMER_TOTAL);
    setActiveSets([buildStaticChatLogSet()]);
    setShowRestart(false);
    setPhase('dashboard');
    // questSeen stays true — the user just re-read the objective via the
    // restart modal copy, no need to re-show the briefing.
  };

  const handleDashboardFeedbackClose = async () => {
    if (persisting || !dashboardFeedback) return;
    const wasCorrect = dashboardFeedback.correct;
    const clickedRow = dashboardFeedback.row;

    if (!wasCorrect) {
      setDashboardFeedback(null);
      return;
    }

    // Single-round flow: the correctly picked broken row IS the representative
    // intent. Persist and jump straight to the notion phase — no accumulation
    // of multiple selections, no separate picker screen.
    const rep: SelectedIntent = {
      setId: currentSet.setId,
      row: {
        sessionId: clickedRow.sessionId,
        createdAt: clickedRow.createdAt,
        intent: clickedRow.intent,
        userMessage: clickedRow.userMessage,
        assistantContent: clickedRow.assistantContent,
      },
    };
    // Persist BEFORE UI transition: blockchain write failure should leave the
    // user on the dashboard with the save-error banner explaining what went
    // wrong, so they can retry by clicking 확인 again.
    setPersisting(true);
    const persistOk = await persist({ representativeIntent: rep });
    setPersisting(false);
    if (!persistOk) return;

    setDashboardFeedback(null);
    setRepresentative(rep);
    setPhase('notion');
    setPanelOpen(false);
  };

  // Landing's "새로 만들기" button reopens the floating panel (backdrop-only
  // anchor now that the panel hosts the task form). First correct click
  // during the guidance flow shows a QUEST CLEAR celebration; dismissing it
  // opens the panel. Subsequent clicks open directly.
  const handleCreateTask = () => {
    if (
      phase === 'notion' &&
      stage1NotionMissionSeen &&
      !notionFirstCreateSeen
    ) {
      setNotionCreateCelebration(true);
      setNotionStrayFeedback(null);
      return;
    }
    setPanelOpen(true);
  };

  const handleNotionCreateCelebrationAccept = () => {
    setNotionCreateCelebration(false);
    setNotionFirstCreateSeen(true);
    setPanelOpen(true);
  };

  // Clicks anywhere on NotionLanding that did NOT land on a "새로 만들기"
  // button bubble up here. We only treat them as stray during the guidance
  // window (mission dismissed, first-create not yet achieved, panel closed).
  const handleNotionStray = () => {
    if (phase !== 'notion') return;
    if (!stage1NotionMissionSeen) return;
    if (notionFirstCreateSeen) return;
    if (notionCreateCelebration) return;
    if (panelOpen) return;
    const next = notionStrayCount + 1;
    setNotionStrayCount(next);
    setNotionStrayFeedback(
      next >= 3
        ? '힌트: 페이지 하단 Tasks 영역 오른쪽에 있는 파란 "새로 만들기" 버튼을 클릭하세요.'
        : '새 Task 를 등록하려면 올바른 버튼을 눌러야 해요. 다시 찾아보세요.',
    );
  };

  const handleNotionSubmit = async (fieldId: NotionFieldId, value: string) => {
    if (validating) return;
    if (activeFieldOrder[currentFieldIdx] !== fieldId) return;
    setValidating(true);
    // attempt is 1-based; "this submission's attempt number" = prior fails + 1.
    const attempt = (fieldAttempts[fieldId] ?? 0) + 1;
    const result = await validateNotionField(fieldId, value, {
      representativeIntent: representative,
      username: githubUsername,
      attempt,
      phase,
    });
    if (!result.pass) {
      setValidating(false);
      setFieldAttempts((prev) => ({ ...prev, [fieldId]: attempt }));
      const freeInput =
        fieldId === 'title' ||
        fieldId === 'problemAnalysis' ||
        fieldId === 'solutionDirection';
      // Status gets a per-option hint because each wrong choice carries a
      // specific meaning the learner should understand, not just reject.
      // Season nudges any non-"진행중" pick back toward the live season.
      // Assignee shares a single hint for any "other person" pick —
      // the teaching is about the current you-fix-it-yourself situation.
      // workType is multi-select: the hint nudges toward the missing
      // required key (or explains why a wrong key doesn't fit).
      // Status hint dict flips with phase: Stage 1 narrates "about to start
      // the fix" (→ In Progress); Stage 4 narrates "just finished testing"
      // (→ Done). Using the Stage 1 dict in Stage 4 produced misleading
      // copy like "수정을 시작할 참이니…" after the fix was already shipped.
      const statusHint =
        fieldId === 'status'
          ? (phase === 'stage4-result-page' ? statusHintsStage4 : statusHints)[
              value
            ]
          : undefined;
      const seasonHint =
        fieldId === 'season' ? seasonHints[value] : undefined;
      const pickedOtherAssignee =
        fieldId === 'assignee' && value !== githubUsername;
      const workTypeHint =
        fieldId === 'workType' ? computeWorkTypeHint(value) : undefined;
      setNotionError(
        statusHint ??
          seasonHint ??
          workTypeHint ??
          // LLM-authored hint (title / problemAnalysis) takes precedence
          // over the generic free-input fallback when the server returned
          // a specific guidance string.
          result.hint ??
          (pickedOtherAssignee
            ? assigneeHint
            : freeInput
              ? '대표 인텐트와 관련이 약해 보여요. 다시 작성해주세요.'
              : '올바른 값을 선택해주세요.'),
      );
      return;
    }
    const nextIdx = currentFieldIdx + 1;

    // Identify stage-boundary transitions up-front so we can order the
    // blockchain writes intentionally. `recordStageComplete` must run
    // BEFORE `persist`: stage 0 was consistently missing on-chain because
    // the last-field persist (problemAnalysis, rich-HTML) fired a heavy
    // user-wallet tx immediately before the tiny stage_complete tx from
    // the same wallet — the back-to-back pair raced/overlapped and the
    // record tx silently dropped. Stages 1-3 survived only because they
    // were separated by the user's next field-entry delay. Firing
    // recordStageComplete first lets the small tx land cleanly, and any
    // later persist failure no longer costs the learner credit.
    let boundaryStage: number | null = null;
    let boundaryNextPhase: Phase | null = null;
    if (phase === 'notion' && nextIdx >= STAGE1_FIELD_ORDER.length) {
      boundaryStage = 0;
      boundaryNextPhase = 'quest-clear';
    } else if (
      phase === 'stage2-page' &&
      nextIdx >= STAGE2_FIELD_ORDER.length
    ) {
      boundaryStage = 1;
      boundaryNextPhase = 'quest-clear-2';
    } else if (
      phase === 'sheet-edit' &&
      nextIdx >= STAGE3_FIELD_ORDER.length
    ) {
      boundaryStage = 2;
      boundaryNextPhase = 'quest-clear-3';
    } else if (
      phase === 'stage4-result-page' &&
      nextIdx >= STAGE4_FIELD_ORDER.length
    ) {
      boundaryStage = 3;
      boundaryNextPhase = 'course-complete';
    }

    if (boundaryStage !== null) {
      await recordStageComplete(passkeyPublicKey, boundaryStage);
      markStageCompleteLocally(boundaryStage);
    }

    // Persist the field value. If the blockchain write fails, leave the
    // user on the same field so they can retry — but at stage boundaries
    // we have already recorded completion above, so learner credit is safe.
    const newNotion: NotionState = { ...notion, [fieldId]: value };
    const persistOk = await persist({ notion: newNotion });
    if (!persistOk) {
      setValidating(false);
      return;
    }
    setNotion(newNotion);
    setFieldAttempts((prev) => {
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
    setValidating(false);

    setCurrentFieldIdx(nextIdx);
    if (boundaryNextPhase) setPhase(boundaryNextPhase);
  };

  // Stage 3 completion handler invoked from SheetEditPage when the user
  // clicks "Custom Scripts → Update 스크립트 실행" after making edits.
  const handleSheetComplete = async (
    summary: string,
    artifact: SheetArtifact,
  ) => {
    // Stage 3 completion doesn't go through the generic handleNotionSubmit
    // path because we need to persist both the workContent summary and the
    // detailed sheetArtifact atomically so Stage 4's auto-fill survives a
    // reload.
    if (validating) return;
    setValidating(true);

    // Same ordering fix as handleNotionSubmit: record stage_complete on-chain
    // BEFORE the heavier persist so a persist failure / tx race doesn't cost
    // the learner credit for the stage.
    await recordStageComplete(passkeyPublicKey, 2);
    markStageCompleteLocally(2);

    const newNotion: NotionState = { ...notion, workContent: summary };
    const persistOk = await persist({
      notion: newNotion,
      sheetArtifact: artifact,
    });
    if (!persistOk) {
      setValidating(false);
      return;
    }
    setNotion(newNotion);
    setSheetArtifact(artifact);
    setFieldAttempts((prev) => {
      const next = { ...prev };
      delete next.workContent;
      return next;
    });
    setCurrentFieldIdx(STAGE3_FIELD_ORDER.length);
    setPhase('quest-clear-3');
    setValidating(false);
  };

  // Stage 4 chatbot interaction. Only on-topic exchanges are persisted —
  // off-topic attempts stay local to the chat view so the "move to result"
  // trigger (which reads chatbotInteraction.question/answer) doesn't fire
  // prematurely. The learner can retry freely until a match lands.
  const handleChatbotExchange = async (
    question: string,
    answer: string,
    meta: { onTopic: boolean },
  ) => {
    if (!meta.onTopic) return;
    const next = { question, answer };
    setChatbotInteraction(next);
    await persist({ chatbotInteraction: next });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-[#0a0a1a]">
        <Loader2 className="h-8 w-8 animate-spin text-[#FF9D00]" />
      </div>
    );
  }

  const saveErrorBanner = saveError && (
    <div className="absolute top-0 inset-x-0 z-30 bg-red-500/90 text-white text-xs px-4 py-2 flex items-center justify-between">
      <span>저장 실패: {saveError}</span>
      <button
        onClick={() => setSaveError(null)}
        className="underline text-white/80 hover:text-white"
      >
        닫기
      </button>
    </div>
  );

  if (phase === 'dashboard' && currentSet) {
    const showQuest = !questSeen && !representative && !showRestart;
    return (
      <div className="relative h-full w-full bg-[#F9F9FA]">
        {saveErrorBanner}
        <DashboardView
          title={currentSet.title}
          setOrder={setIndex + 1}
          totalSets={activeSets.length}
          rows={currentSet.rows}
          onRowClick={handleRowClick}
          hearts={hearts}
          timerRemaining={timerRemaining}
          timerTotal={TIMER_TOTAL}
        />
        {showQuest && (
          <QuestModal
            body="문제가 있는 인텐트의 행을 클릭하세요"
            onAccept={() => setQuestSeen(true)}
          />
        )}
        {dashboardFeedback && !showQuest && !showRestart && (
          dashboardFeedback.correct ? (
            <QuestModal
              label="QUEST CLEAR"
              body="인텐트 잘 찾았어요! 이제 노션 페이지로 이동해 이슈를 Task 로 등록합니다."
              cta={persisting ? '저장 중…' : '확인'}
              onAccept={handleDashboardFeedbackClose}
            />
          ) : (
            <FeedbackModal
              correct={false}
              onClose={handleDashboardFeedbackClose}
            />
          )
        )}
        {showRestart && (
          <QuestModal
            label="GAME OVER"
            body="하트를 모두 소진했어요. 처음부터 다시 도전해 주세요."
            cta={persisting ? '초기화 중…' : '다시 시작'}
            onAccept={handleRestart}
          />
        )}
      </div>
    );
  }

  if (phase === 'notion' || phase === 'quest-clear') {
    const showInitialMission =
      phase === 'notion' &&
      !stage1NotionMissionSeen &&
      !notionCreateCelebration &&
      !panelOpen;
    // Modal priority (highest first): quest-clear → celebration → initial
    // mission → stray feedback → field validation error → per-field Quest.
    // Only one at a time.
    const activeFieldQuestBody =
      phase === 'notion' &&
      panelOpen &&
      currentFieldId &&
      !fieldQuestSeen.has(currentFieldId)
        ? FIELD_QUEST_MESSAGES[currentFieldId] ?? null
        : null;
    let modal: React.ReactNode = null;
    if (phase === 'quest-clear') {
      modal = (
        <QuestModal
          label="QUEST CLEAR"
          body="Stage 1 완료! 이슈를 Notion에 기록했어요. 이제 해결 방향을 정리합니다."
          cta="다음 단계로"
          onAccept={() => {
            setCurrentFieldIdx(countFilledStage2Notion(notion));
            setPhase('stage2-page');
          }}
        />
      );
    } else if (notionCreateCelebration) {
      modal = (
        <QuestModal
          label="QUEST CLEAR"
          body="잘 하셨어요! 이슈를 새로 등록할 때는 '새로 만들기' 버튼을 눌러야 합니다."
          cta="확인"
          onAccept={handleNotionCreateCelebrationAccept}
        />
      );
    } else if (showInitialMission) {
      modal = (
        <QuestModal
          label="QUEST"
          body="노션 페이지에 이슈를 Task로 등록해봅시다."
          cta="확인"
          onAccept={() => setStage1NotionMissionSeen(true)}
        />
      );
    } else if (notionStrayFeedback) {
      modal = (
        <FeedbackModal
          correct={false}
          message={notionStrayFeedback}
          onClose={() => setNotionStrayFeedback(null)}
        />
      );
    } else if (notionError) {
      modal = (
        <FeedbackModal
          correct={false}
          message={notionError}
          onClose={() => setNotionError(null)}
        />
      );
    } else if (activeFieldQuestBody && currentFieldId) {
      const id = currentFieldId;
      modal = (
        <QuestModal
          label="QUEST"
          body={activeFieldQuestBody}
          cta="확인"
          onAccept={() =>
            setFieldQuestSeen((prev) => {
              const next = new Set(prev);
              next.add(id);
              return next;
            })
          }
        />
      );
    }

    // Promote-to-page pattern: once "새로 만들기" is clicked (panelOpen=true)
    // the task page takes over the full view instead of squeezing into the
    // 560px side panel. NotionLanding is hidden; IntentDetailCard stays as
    // the bottom overlay so the learner can still refer back to the found
    // intent while filling out the task.
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        {!panelOpen && (
          <NotionLanding
            onCreate={handleCreateTask}
            onStray={handleNotionStray}
          />
        )}
        {panelOpen && (
          <NotionTaskPage
            notion={notion}
            currentFieldId={phase === 'notion' ? currentFieldId : null}
            disabled={validating}
            onSubmit={handleNotionSubmit}
            onOpenCopyIssue={
              representative ? () => setCopyIssueOpen(true) : undefined
            }
          />
        )}
        {panelOpen && representative && (
          <IntentDetailCard intent={representative} />
        )}
        {copyIssueOpen && representative ? (
          <CopyIssueModal
            intent={representative}
            onClose={() => setCopyIssueOpen(false)}
          />
        ) : null}
        <IntentCatalogModal
          open={catalogOpen}
          onClose={() => setCatalogOpen(false)}
        />
        {modal}
      </div>
    );
  }

  if (phase === 'stage2-page' || phase === 'quest-clear-2') {
    // Same field-Quest gating as Stage 1, scoped to stage2-page fields.
    const stage2QuestBody =
      phase === 'stage2-page' &&
      currentFieldId &&
      !fieldQuestSeen.has(currentFieldId)
        ? FIELD_QUEST_MESSAGES[currentFieldId] ?? null
        : null;
    const stage2QuestId = currentFieldId;
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <NotionTaskPage
          notion={notion}
          currentFieldId={phase === 'stage2-page' ? currentFieldId : null}
          disabled={validating}
          onSubmit={handleNotionSubmit}
        />
        {phase === 'quest-clear-2' ? (
          <QuestModal
            label="QUEST CLEAR"
            body="Stage 2 완료! 수정 방향을 정리했어요. 이제 Dev Sheet 에서 실제로 고칩니다."
            cta="다음 단계로"
            onAccept={() => {
              setCurrentFieldIdx(countFilledStage3Notion(notion));
              setPhase('sheet-edit');
            }}
          />
        ) : notionError ? (
          <FeedbackModal
            correct={false}
            message={notionError}
            onClose={() => setNotionError(null)}
          />
        ) : stage2QuestBody && stage2QuestId ? (
          <QuestModal
            label="QUEST"
            body={stage2QuestBody}
            cta="확인"
            onAccept={() =>
              setFieldQuestSeen((prev) => {
                const next = new Set(prev);
                next.add(stage2QuestId);
                return next;
              })
            }
          />
        ) : null}
      </div>
    );
  }

  if (phase === 'sheet-edit' || phase === 'quest-clear-3') {
    // Per-phase Quest modals are now owned by SheetEditPage itself
    // (add-intent → run-intent-script → add-triggers → run-trigger-script).
    // This block only layers on the stage-complete celebration + any
    // global notionError that leaked through.
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <SheetEditPage
          disabled={validating}
          representative={representative}
          onComplete={handleSheetComplete}
        />
        {notionError && (
          <FeedbackModal
            correct={false}
            message={notionError}
            onClose={() => setNotionError(null)}
          />
        )}
        {phase === 'quest-clear-3' && (
          <QuestModal
            label="QUEST CLEAR"
            body="Stage 3 완료! Dev 에 수정이 반영됐어요. 이제 Dev 챗봇에서 결과를 확인해봅니다."
            cta="다음 단계로"
            onAccept={() => {
              setCurrentFieldIdx(countFilledStage4Notion(notion));
              setPhase('chatbot-test');
            }}
          />
        )}
      </div>
    );
  }

  if (phase === 'chatbot-test') {
    const showStage4Mission = !stage4MissionSeen;
    // Once the first Q&A is persisted, prompt the learner to go record the
    // result back in the Notion task page (the "결과" block field there is
    // now the canonical place for final result text).
    const showGoToResult =
      !!chatbotInteraction.question &&
      !!chatbotInteraction.answer &&
      !showStage4Mission;
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <ChatbotTestPage
          disabled={validating}
          representativeIntentLabel={representative?.row.intent}
          representativeIntent={representative}
          onAskAndReply={handleChatbotExchange}
        />
        {showStage4Mission ? (
          <QuestModal
            label="QUEST"
            body="Stage 1 에서 발견했던 문제 발화를 이 Dev 챗봇에 그대로 넣어 보세요. 수정한 인텐트로 답변이 올바르게 매칭되면, 앞서 작성하던 Notion Task 로 돌아가 결과를 기록하며 마무리합니다."
            cta="확인"
            onAccept={() => setStage4MissionSeen(true)}
          />
        ) : showGoToResult ? (
          <QuestModal
            label="QUEST CLEAR"
            body="챗봇이 수정한 인텐트로 올바르게 답변했어요! 이제 Notion 으로 돌아가 작업 상태를 Done 으로 바꾸고 결과를 기록하며 마무리해요."
            cta="Notion 으로"
            onAccept={() => {
              setCurrentFieldIdx(countFilledStage4Notion(notion));
              setPhase('stage4-result-page');
            }}
          />
        ) : notionError ? (
          <FeedbackModal
            correct={false}
            message={notionError}
            onClose={() => setNotionError(null)}
          />
        ) : null}
      </div>
    );
  }

  if (phase === 'stage4-result-page') {
    // Stage 4 Quest copy: status gets "flip to Done" guidance on first sight;
    // result gets "we auto-filled, feel free to edit" guidance once active.
    const stage4QuestBody =
      currentFieldId === 'status' && !stage4FieldQuestSeen.has('status')
        ? '작업이 완료되었으니 Status 를 Done 으로 바꿔주세요.'
        : currentFieldId === 'result' && !stage4FieldQuestSeen.has('result')
          ? "📋 '작업 내역 불러오기' 로 작업내용을 펼치고, 📷 '테스트 결과 불러오기' 로 챗봇 응답을 결과 아래에 붙인 뒤, 결과란에 한 줄 후기를 적어 제출해주세요."
          : null;
    const stage4QuestId = currentFieldId;

    // "📋 작업 내역 불러오기" — replace the Stage 3 short summary in
    // notion.workContent with the detailed intent + triggers tables, and
    // persist. The workContent BlockField is rich, so it renders the HTML
    // as a read-only filled block above the result section.
    const handleAutoFillWork = async () => {
      if (!sheetArtifact || validating) return;
      const detailedHtml = generateWorkSummaryHtml(sheetArtifact);
      const newNotion: NotionState = { ...notion, workContent: detailedHtml };
      setValidating(true);
      const persistOk = await persist({ notion: newNotion });
      setValidating(false);
      if (!persistOk) return;
      setNotion(newNotion);
    };
    // "📷 테스트 결과 불러오기" — reveal a chat-bubble capture card
    // styled like the Dev 챗봇 UI below the result BlockField. Session
    // state only; the underlying Q&A is already persisted separately.
    const handleAutoFillCapture = () => {
      if (!chatbotInteraction.question || !chatbotInteraction.answer) return;
      setCaptureVisible(true);
    };

    // Work auto-fill is "done" once the persisted workContent differs from
    // the Stage 3 plain-text summary. Detection: any HTML opening tag at
    // the start means the detailed block was loaded (Stage 3 summaries are
    // always plain prose, never begin with '<').
    const workAutoFilled =
      typeof notion.workContent === 'string' &&
      notion.workContent.trimStart().startsWith('<');

    const captureNode =
      captureVisible && chatbotInteraction.question && chatbotInteraction.answer
        ? (
            <ChatbotCaptureBlock
              question={chatbotInteraction.question}
              answer={chatbotInteraction.answer}
            />
          )
        : null;

    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <NotionTaskPage
          notion={notion}
          currentFieldId={currentFieldId}
          disabled={validating}
          onSubmit={handleNotionSubmit}
          onAutoFillWork={
            sheetArtifact && !workAutoFilled ? handleAutoFillWork : undefined
          }
          onAutoFillCapture={
            !captureVisible &&
            chatbotInteraction.question &&
            chatbotInteraction.answer
              ? handleAutoFillCapture
              : undefined
          }
          captureNode={captureNode}
        />
        {notionError ? (
          <FeedbackModal
            correct={false}
            message={notionError}
            onClose={() => setNotionError(null)}
          />
        ) : stage4QuestBody && stage4QuestId ? (
          <QuestModal
            label="QUEST"
            body={stage4QuestBody}
            cta="확인"
            onAccept={() =>
              setStage4FieldQuestSeen((prev) => {
                const next = new Set(prev);
                next.add(stage4QuestId);
                return next;
              })
            }
          />
        ) : null}
      </div>
    );
  }

  // course-complete — cosmic celebration with fireworks + encouragement.
  return (
    <div className="relative h-full w-full">
      {saveErrorBanner}
      <CourseCompleteView />
    </div>
  );
}
