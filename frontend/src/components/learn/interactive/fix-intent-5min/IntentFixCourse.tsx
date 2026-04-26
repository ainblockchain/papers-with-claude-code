'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { CourseIntro } from './CourseIntro';
import { DashboardView } from './DashboardView';
import { FeedbackModal } from './FeedbackModal';
import { QuestModal } from './QuestModal';
import { ValidationErrorModal } from './ValidationErrorModal';
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
import { MissionBar } from './MissionBar';
import {
  getMissionCopy,
  type SheetPhase,
} from '@/lib/courses/fix-intent-5min/mission-copy';
import {
  guidanceConfig,
  getGuidanceEntry,
  initialGuidanceEntry,
  resolveActiveGuidancePhase,
  type GuidanceEntry,
  type GuidancePhase,
  type GuidanceState,
} from '@/lib/courses/fix-intent-5min/tooltip-guidance';
import { guidanceCopy } from '@/lib/courses/fix-intent-5min/tooltip-copy';
import type { SheetId } from '@/data/courses/fix-intent-5min/intent-sheets';
import { useIdleGuidance, useStrayClick } from '@/lib/courses/fix-intent-5min/useGuidance';
import { GuidanceTooltip } from './GuidanceTooltip';
import { TooltipProvider } from '@/components/ui/tooltip';

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
  | 'intro'
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

// Sub-phase GuidancePhases that get a one-shot QuestModal when the
// MissionBar copy transitions to them. Complements (not replaces) the
// phase-entry modals already gated on *QuestSeen state: those cover
// the first landing on each phase; this set covers mid-phase objective
// changes (field advance in Stage 1/4 Notion, script step in Stage 3).
const SUB_PHASE_MODAL_GUIDANCE_NAMES: ReadonlySet<GuidancePhase> = new Set<
  GuidancePhase
>([
  'notion-field-agent',
  'notion-field-title',
  'notion-field-assignee',
  'notion-field-status',
  'notion-field-season',
  'notion-field-workType',
  // problemAnalysis walks through 3 sub-phases. Step 1 (copy) and step 3
  // (submit) get their own one-shot briefing modals so the learner is
  // oriented before each action. Step 2 (copy-modal) intentionally does
  // NOT get a briefing modal: the CopyIssueModal itself IS the briefing
  // surface — stacking a QuestModal on top of it would be redundant and
  // (worse) suppresses the step-2 tooltip that should be pointing at
  // "전체 복사" the moment the modal opens.
  'notion-field-problemAnalysis-copy',
  'notion-field-problemAnalysis-submit',
  // Stage 3 step 1 splits on the active sheet tab — each sub-phase gets
  // its own one-shot briefing so the learner is oriented before both
  // (a) picking the domain tab and (b) hitting "+ 인텐트 행 추가".
  'sheet-add-intent-tab',
  'sheet-add-intent-row',
  // Stage 3 step 1-B — per-column row-fill guidance after the row is
  // added. Each gets its own one-shot briefing so the learner knows
  // what to write in every column before the idle tooltip fires.
  'sheet-field-intent',
  'sheet-field-leadSentence',
  'sheet-related-copy',
  'sheet-field-prompt-paste',
  'sheet-run-intent-script',
  'sheet-add-triggers',
  'sheet-run-trigger-script',
  // Stage 4 result-field splits into 3 sub-phases (load work → load
  // capture → submit). Each gets its own one-shot briefing so the
  // learner is oriented before every click in the sequence.
  'stage4-result-load-work',
  'stage4-result-load-capture',
  'stage4-result-submit',
]);

// GuidancePhases whose anchor element is reported via a dedicated child
// ref callback (e.g. the in-field "복사하러가기" button, the "제출"
// button, Stage 4 auto-fill buttons). `activePhaseAnchor` — which writes
// the active field wrapper to whatever phase is currently active — must
// SKIP these or it will overwrite the precise button element with the
// whole field row and the tooltip will point at the wrong place.
const DEDICATED_ANCHOR_PHASES: ReadonlySet<GuidancePhase> = new Set<
  GuidancePhase
>([
  'notion-field-problemAnalysis-copy',
  'notion-field-problemAnalysis-copy-modal',
  'notion-field-problemAnalysis-submit',
  'stage4-result-load-work',
  'stage4-result-load-capture',
  'stage4-result-submit',
  // Sheet sub-phases with their own per-cell / per-button anchors.
  'sheet-field-intent',
  'sheet-field-leadSentence',
  'sheet-field-prompt-paste',
  'sheet-related-copy',
  'sheet-add-intent-tab',
  'sheet-add-intent-row',
  'sheet-run-intent-script',
  'sheet-add-triggers',
  'sheet-run-trigger-script',
  // Non-notion phases — `onActiveFieldEl` never fires for these because
  // NotionTaskPage isn't on screen, but listing them documents the fact
  // that they rely on dedicated refs (chatbot input, notion-landing
  // buttons, dashboard).
  'notion-landing',
  'chatbot-before',
  'chatbot-after',
  'dashboard',
]);

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
          QUEST ALL CLEAR
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
          <p className="mb-2 flex items-center justify-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-[#FFD5F5]">
            <img
              src="/courses/fix-intent-5min/curious-nyang-avatar.png"
              alt="궁금하냥"
              width={22}
              height={22}
              className="h-[22px] w-[22px] rounded-full object-cover"
              draggable={false}
            />
            궁금하냥이 여러분의 손을 기다려요
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
// result BlockField on Stage 4 after the learner clicks "테스트 결과
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

// Thin outer wrapper that mounts a single `TooltipProvider` around the
// course. The inner component has ~10 early-return branches (one per
// phase), so wrapping at the call site here keeps us from sprinkling
// providers into every branch. `delayDuration=0` because our tooltip is
// controlled programmatically (idle/stray triggers), not hover.
export function IntentFixCourse() {
  return (
    <TooltipProvider delayDuration={0} skipDelayDuration={0}>
      <IntentFixCourseInner />
    </TooltipProvider>
  );
}

function IntentFixCourseInner() {
  const passkeyPublicKey = useAuthStore((s) => s.passkeyInfo?.publicKey);
  const githubUsername = useAuthStore((s) => s.user?.username ?? null);

  const [loading, setLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Default to 'intro' so brand-new users (no on-chain state yet → the
  // `if (!state)` early-return in the mount effect) see the orientation
  // page instead of landing straight on the quiz. Returning users with
  // any progress have their phase overwritten by the restore logic below.
  const [phase, setPhase] = useState<Phase>('intro');
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
  // Blocking FeedbackModal for stray clicks on the Notion landing (Stage 1,
  // pre-panel). Complements the guidance tooltip: the tooltip covers
  // idle/persistent nudging, the modal is the "that button, not this one"
  // gate on an actual misclick so it cannot be ignored.
  const [notionStrayFeedback, setNotionStrayFeedback] = useState(false);
  // The full list of "새로 만들기" button elements reported up from
  // NotionLanding. The chosen tooltip anchor (topmost-then-leftmost)
  // is derived from this list in an effect below.
  const [notionCreateButtons, setNotionCreateButtons] = useState<HTMLButtonElement[]>([]);
  // The chosen notion-landing anchor element, and a cached rect used to
  // compute dynamic tooltip side/align so the nudge doesn't clip the
  // viewport edges when the anchor is near the top/bottom/sides.
  const [notionLandingAnchor, setNotionLandingAnchor] = useState<HTMLButtonElement | null>(null);
  // Per-field attempt counters — used to escalate hint specificity when the
  // learner misses repeatedly on free-input fields (solutionDirection today,
  // extensible later). Reset on successful submission.
  const [fieldAttempts, setFieldAttempts] = useState<
    Partial<Record<NotionFieldId, number>>
  >({});
  // Captured field id + value when validateNotionField returns
  // `server-error` so the learner can retry the exact same submission
  // from the ValidationErrorModal. Crucially, hitting this branch does
  // NOT increment fieldAttempts — a transient Azure / JSON / network
  // blip should not count against the learner's hint-escalation budget.
  const [serverErrorRetry, setServerErrorRetry] = useState<{
    fieldId: NotionFieldId;
    value: string;
  } | null>(null);
  // Guards phase-advancing handlers while a blockchain write is in-flight,
  // so a rapid second click can't race ahead of a failed persist.
  const [persisting, setPersisting] = useState(false);
  // Session-only tooltip guidance state — per-GuidancePhase counters and
  // dismissal bookkeeping. Kept as one map so restart can reset all
  // entries with a single setState. See `tooltip-guidance.ts` for the
  // GuidancePhase enum and escalation rules. The old Notion stray-click
  // FeedbackModal (notionStrayFeedback) is retired — its role is now
  // played by the orange GuidanceTooltip anchored at the 새로 만들기
  // button, which doesn't blocking-scrim the page on every misclick.
  const [guidance, setGuidance] = useState<GuidanceState>({});
  // Active anchor element per GuidancePhase — populated by child
  // components via onAnchorEl / primaryButtonRef / data-field-id lookup.
  // Reset to {} on phase transition so a stale ref from the previous
  // phase can't anchor a tooltip on the new phase.
  const [anchorEls, setAnchorEls] = useState<
    Partial<Record<GuidancePhase, HTMLElement | null>>
  >({});
  // Copy-Issue modal for problemAnalysis — opens on the helper button
  // under the 문제 상황 분석 block so the learner can grab the chat log.
  const [copyIssueOpen, setCopyIssueOpen] = useState(false);
  // Session-local flag tracking whether "전체 복사" has fired at least
  // once. Drives the 3-step tooltip sequence for the problemAnalysis
  // field: advances the idle tooltip from the modal CTA (step 2) to the
  // field's 제출 button (step 3) once the clipboard holds the log. Not
  // persisted — on reload, the logic falls back to "still on step 1"
  // until they re-copy, which is harmless since the clipboard may have
  // cleared anyway.
  const [problemAnalysisCopied, setProblemAnalysisCopied] = useState(false);
  // Intent-Catalog modal — opened from the workType briefing QuestModal's
  // CTA (or any manual trigger inside NotionTaskPage). No longer
  // auto-opens on workType becoming active; that role now belongs to
  // the briefing QuestModal, which hands off to the catalog sheet
  // (where the work-type taxonomy badges now live alongside the grid)
  // when the learner is ready to explore.
  const [catalogOpen, setCatalogOpen] = useState(false);
  // One-shot per session: did the learner already see the workType
  // briefing QuestModal? Flipped true on accept (CTA / Enter / Escape —
  // QuestModal maps all three to onAccept) so the briefing doesn't
  // re-appear mid-field. Restore also sets this true for returning
  // users who already filled workType — they've clearly moved past the
  // briefing.
  const [workTypeBriefingSeen, setWorkTypeBriefingSeen] = useState(false);
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
  // One-shot stage-1 briefing — shown once on first dashboard entry. The
  // MissionBar carries the same objective, but new learners benefit from a
  // blocking Quest modal before the HUD starts interacting. Dismissed for
  // the rest of the session; restart/refresh with progress skips it.
  const [stage1QuestSeen, setStage1QuestSeen] = useState(false);
  // One-shot Agents & Intents (Notion landing) briefing — shown once when
  // the learner arrives on the Notion landing after picking a broken intent.
  // Skipped for returning users who already opened the task panel.
  const [agentsPageQuestSeen, setAgentsPageQuestSeen] = useState(false);
  // Per-phase one-shot briefings. Each modal shows the first time the user
  // lands on that phase's UI surface in this session, giving a concrete
  // action before interaction starts. Auto-dismissed (set true) on restore
  // if the learner has already progressed past that phase.
  const [stage2PageQuestSeen, setStage2PageQuestSeen] = useState(false);
  const [sheetEditQuestSeen, setSheetEditQuestSeen] = useState(false);
  const [chatbotTestQuestSeen, setChatbotTestQuestSeen] = useState(false);
  const [stage4ResultQuestSeen, setStage4ResultQuestSeen] = useState(false);
  // Sub-phase one-shot briefings — fire a QuestModal whenever the
  // MissionBar copy changes to a *field/step* level objective that
  // isn't already covered by a phase-entry modal above. The set is
  // keyed by GuidancePhase so it dovetails with the tooltip system.
  const [seenSubPhaseQuests, setSeenSubPhaseQuests] = useState<
    Set<GuidancePhase>
  >(new Set());
  const markSubPhaseSeen = (p: GuidancePhase) => {
    setSeenSubPhaseQuests((prev) => {
      if (prev.has(p)) return prev;
      const next = new Set(prev);
      next.add(p);
      return next;
    });
  };
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
  // Mirrors SheetEditPage's internal phase so the MissionBar can surface
  // the matching Stage 3 step ("Step 1/4", "Step 2/4", …). Initial value
  // matches SheetEditPage's initial phase to avoid a mismatch on first
  // sheet-edit entry.
  const [sheetPhase, setSheetPhase] = useState<SheetPhase>('add-intent');
  // Mirrors SheetEditPage's internal active tab. Feeds the guidance
  // resolver so the step-1 tooltip flips between "pick a domain tab"
  // (on the default trigger-sentence tab) and "press + 인텐트 행 추가"
  // (on any of the 4 intent category tabs). Starts `null` until the
  // sheet page mounts and reports its initial tab.
  const [sheetActiveTabId, setSheetActiveTabId] =
    useState<SheetId | null>(null);
  // Mirrors SheetEditPage's added-intent row fill state. `null` while
  // the learner hasn't clicked "+ 인텐트 행 추가" yet; once clicked,
  // flips to an object tracking which of the 3 editable columns have
  // non-empty values. Feeds the guidance resolver to walk through
  // intent → leadSentence → prompt column tooltips.
  const [sheetRowFilled, setSheetRowFilled] = useState<{
    intent: boolean;
    leadSentence: boolean;
    prompt: boolean;
  } | null>(null);
  // Session-local: has the RelatedInfoCard's "복사" button fired at
  // least once this session? Toggles the Prompt-column guidance
  // between `sheet-related-copy` (copy first) and
  // `sheet-field-prompt-paste` (paste into cell). Reset on restart
  // since the fresh run gets a fresh walkthrough.
  const [relatedInfoCopied, setRelatedInfoCopied] = useState(false);
  // Mirrors SheetEditPage's internal ConfirmDialog open/closed state.
  // Folded into `anyModalOpen` so the Custom-Scripts idle tooltip is
  // suppressed while the blue "모든 프롬프트를 dev에 업데이트하시겠습니까?"
  // dialog is up (otherwise the tooltip pokes out beside the dialog with
  // stale "run the script" copy the learner already acted on).
  const [sheetConfirmDialogOpen, setSheetConfirmDialogOpen] = useState(false);
  // Mirrors SheetEditPage's `running` (script executing) and `menuOpen`
  // (Custom Scripts dropdown open) states. Folded into `anyModalOpen` to
  // suppress the idle Custom-Scripts tooltip during either interaction.
  const [sheetScriptRunning, setSheetScriptRunning] = useState(false);
  const [sheetScriptMenuOpen, setSheetScriptMenuOpen] = useState(false);

  // Countdown tick — decrement once per second while the dashboard is
  // actively interactive. Pauses whenever a modal is up (feedback /
  // restart / persist) so reading feedback doesn't cost time.
  useEffect(() => {
    if (phase !== 'dashboard') return;
    if (showRestart) return;
    if (dashboardFeedback) return;
    if (persisting) return;
    if (!stage1QuestSeen) return;
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
    stage1QuestSeen,
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
      // Returning mid-progress users have already seen the Stage 1 brief.
      if (restoredSelected.length > 0 || restoredRep) setStage1QuestSeen(true);
      // Anyone past the dashboard (has a representative) has already been
      // oriented to the Agents & Intents page at least once.
      if (restoredRep) setAgentsPageQuestSeen(true);
      // Phase-specific briefings: if the learner is already past a given
      // phase in state, skip its entry modal on this session's load.
      if (restoredNotion.solutionDirection != null) {
        setStage2PageQuestSeen(true);
      }
      if (restoredNotion.workContent != null) {
        setSheetEditQuestSeen(true);
      }
      if (restoredChat.question && restoredChat.answer) {
        setChatbotTestQuestSeen(true);
      }
      if (restoredNotion.result != null) {
        setStage4ResultQuestSeen(true);
      }
      // Pre-populate seen sub-phase quests from restored field state so
      // returning users aren't re-briefed on objectives they already
      // completed. Each filled Stage-1 field → corresponding notion-field-*;
      // any Stage-3 completion → all sheet-* sub-phases; Stage-4 result
      // submission → all three stage4-result-* sub-phases.
      const restoredSubPhaseSeen = new Set<GuidancePhase>();
      if (restoredNotion.agent != null) restoredSubPhaseSeen.add('notion-field-agent');
      if (restoredNotion.title != null) restoredSubPhaseSeen.add('notion-field-title');
      if (restoredNotion.assignee != null) restoredSubPhaseSeen.add('notion-field-assignee');
      // Stage 1 `status` is preset to 'In Progress' via the auto-fill,
      // so presence alone isn't enough — treat as seen only when the
      // learner has moved beyond that field (represented by a later
      // Stage-1 field being filled).
      if (restoredNotion.season != null || restoredNotion.workType != null) {
        restoredSubPhaseSeen.add('notion-field-status');
      }
      if (restoredNotion.season != null) restoredSubPhaseSeen.add('notion-field-season');
      if (restoredNotion.workType != null) {
        restoredSubPhaseSeen.add('notion-field-workType');
        // Already-filled workType means they've passed the briefing
        // step → don't re-show it on resume.
        setWorkTypeBriefingSeen(true);
      }
      if (restoredNotion.problemAnalysis != null) {
        // Returning users who already submitted the problemAnalysis block
        // have completed every briefed sub-phase; mark each seen so no
        // briefing re-fires during restoration. `copy-modal` has no
        // briefing (the CopyIssueModal itself is the context surface),
        // so only the copy + submit sub-phases are tracked here.
        restoredSubPhaseSeen.add('notion-field-problemAnalysis-copy');
        restoredSubPhaseSeen.add('notion-field-problemAnalysis-submit');
      }
      if (restoredNotion.workContent != null) {
        // Stage 3 workContent is only persisted once the sheet flow
        // finishes end-to-end — so both step-1 sub-phase briefings
        // (tab-picking + add-intent-row), the per-column row-fill
        // briefings, and the later script/trigger sub-phases are all
        // guaranteed to have been shown already.
        restoredSubPhaseSeen.add('sheet-add-intent-tab');
        restoredSubPhaseSeen.add('sheet-add-intent-row');
        restoredSubPhaseSeen.add('sheet-field-intent');
        restoredSubPhaseSeen.add('sheet-field-leadSentence');
        restoredSubPhaseSeen.add('sheet-related-copy');
        restoredSubPhaseSeen.add('sheet-field-prompt-paste');
        restoredSubPhaseSeen.add('sheet-run-intent-script');
        restoredSubPhaseSeen.add('sheet-add-triggers');
        restoredSubPhaseSeen.add('sheet-run-trigger-script');
      }
      if (restoredNotion.result != null) {
        restoredSubPhaseSeen.add('stage4-result-load-work');
        restoredSubPhaseSeen.add('stage4-result-load-capture');
        restoredSubPhaseSeen.add('stage4-result-submit');
      }
      if (restoredSubPhaseSeen.size > 0) {
        setSeenSubPhaseQuests(restoredSubPhaseSeen);
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
        setPhase('intro');
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

  // NOTE: catalog no longer auto-opens on workType entry. The workType
  // briefing QuestModal (rendered in the notion phase block below)
  // takes over as the first-touch UX; its CTA opens the catalog, which
  // now hosts the workType taxonomy badges inline next to the grid.

  const handleRowClick = (row: ChatLogRow) => {
    if (dashboardFeedback || showRestart || persisting) return;
    if (!stage1QuestSeen) return;
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
    setServerErrorRetry(null);
    setHearts(3);
    setTimerRemaining(TIMER_TOTAL);
    setActiveSets([buildStaticChatLogSet()]);
    setShowRestart(false);
    setPhase('dashboard');
    // Fresh run → fresh tooltip guidance. Without this, dashboard
    // tooltips would re-enter firm-silent mode for learners who
    // exhausted both tiers before game-over.
    setGuidance({});
    setAnchorEls({});
    // problemAnalysis tooltip sequence is session-local — reset so the
    // 3-step progression (copy-helper → modal-CTA → submit) starts
    // fresh on the next time the learner reaches that field.
    setProblemAnalysisCopied(false);
    setCopyIssueOpen(false);
    // Stage 3 row-fill guidance is session-local — reset so the new
    // run starts from "no row added yet" and "clipboard untouched".
    setSheetRowFilled(null);
    setRelatedInfoCopied(false);
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

  // Landing's "새로 만들기" button opens the floating task panel directly
  // — the persistent MissionBar already tells the learner what to do, so
  // we skip the intermediate celebration modal the old flow layered on.
  const handleCreateTask = () => {
    setPanelOpen(true);
  };

  // Clicks on NotionLanding that did NOT land on "새로 만들기" bubble up
  // here. Delegated to the shared `registerStray` so escalation (count
  // → threshold → tooltip) is consistent with every other phase, and
  // so the guidance-enabled predicate (modals / persist / firmFired)
  // short-circuits misclicks at the right times. On top of that we pop
  // a blocking FeedbackModal ("틀렸습니다") so the misclick produces an
  // immediate, unmistakable "not this button" signal — the tooltip
  // alone can read as ambient decoration once it's already visible.
  const handleNotionStray = (event: React.MouseEvent) => {
    if (phase !== 'notion') return;
    if (panelOpen) return;
    // If the click landed inside any of the 5 known create buttons,
    // skip — NotionSplitCreateButton / the bottom button already
    // stopPropagation on a successful click, but a click on the
    // outer-wrapper ring pulse area (padding between the two halves)
    // could still bubble.
    const target = event.target;
    if (target instanceof Node) {
      const hit = notionCreateButtons.some((el) => el && el.contains(target));
      if (hit) return;
    }
    registerStray(event);
    setNotionStrayFeedback(true);
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
    // Transient server error (Azure 5xx after retries / JSON parse fail /
    // network blip). Show the soft "try again" modal and DO NOT count
    // this submission against fieldAttempts — the learner's input may
    // be perfectly correct.
    if (result.kind === 'server-error') {
      setValidating(false);
      setServerErrorRetry({ fieldId, value });
      return;
    }
    if (result.kind === 'fail') {
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

  // ────────────────────────────────────────────────────────────────
  // Guidance tooltip wiring
  //
  // Placed BEFORE the `if (loading) return` early exit so the hooks
  // below (useIdleGuidance / useStrayClick / useEffect) run on every
  // render — Rules of Hooks. When loading, `activeGuidancePhase` is
  // null because phase/panel/etc. are still at their initial values,
  // so the hooks run but are no-ops (enabled=false, nothing to reset).
  // ────────────────────────────────────────────────────────────────
  // Stage 4 result auto-fill detection. `workAutoFilled` flips true once
  // notion.workContent holds the detailed HTML block (auto-fill button
  // writes HTML that always starts with '<'). Used by both the guidance
  // resolver and the mission-copy resolver to pick the right sub-phase.
  // Irrelevant outside stage4-result-page; the resolvers ignore it there.
  const workAutoFilled =
    typeof notion.workContent === 'string' &&
    notion.workContent.trimStart().startsWith('<');

  const activeGuidancePhase = resolveActiveGuidancePhase({
    phase,
    currentFieldId,
    sheetPhase,
    panelOpen,
    hasChatbotAnswer: Boolean(
      chatbotInteraction.question && chatbotInteraction.answer,
    ),
    copyIssueOpen,
    problemAnalysisCopied,
    sheetActiveTabId,
    sheetRowFilled,
    relatedInfoCopied,
    workAutoFilled,
    captureVisible,
  });

  // Shared pause predicate for both idle and stray hooks. A QuestModal
  // briefing is scoped to its own phase, so each *QuestSeen check is
  // gated on `phase === <that-phase>` — otherwise a still-unseen modal
  // on a downstream phase would falsely suppress guidance on the phase
  // the learner is currently sitting in.
  // Workype briefing: shown once per session when the workType field
  // first becomes active. Takes the place of the generic sub-phase
  // modal for 'notion-field-workType', and also replaces the old
  // "auto-open the catalog on workType entry" shortcut.
  const workTypeBriefingShouldShow =
    phase === 'notion' &&
    panelOpen &&
    currentFieldId === 'workType' &&
    !workTypeBriefingSeen;

  const questModalOpenHere =
    (phase === 'dashboard' && !stage1QuestSeen) ||
    (phase === 'notion' && !panelOpen && !agentsPageQuestSeen) ||
    (phase === 'stage2-page' && !stage2PageQuestSeen) ||
    (phase === 'sheet-edit' && !sheetEditQuestSeen) ||
    (phase === 'chatbot-test' && !chatbotTestQuestSeen) ||
    (phase === 'stage4-result-page' && !stage4ResultQuestSeen) ||
    workTypeBriefingShouldShow ||
    // Any sub-phase briefing modal (notion-field-*, sheet-run-*, stage4-result-*)
    // also pauses guidance: the modal already tells the learner what to do.
    (activeGuidancePhase !== null &&
      SUB_PHASE_MODAL_GUIDANCE_NAMES.has(activeGuidancePhase) &&
      !seenSubPhaseQuests.has(activeGuidancePhase));

  const anyModalOpen =
    !!dashboardFeedback ||
    showRestart ||
    // Intentional exception: the CopyIssueModal is itself the guidance
    // target for `notion-field-problemAnalysis-copy-modal` (step 2 of
    // the problemAnalysis tooltip sequence). Suppressing guidance while
    // it's open would prevent the learner from seeing the tooltip that
    // points at "전체 복사". The modal still blocks learner input on the
    // page behind it via its own backdrop; we just don't treat it as a
    // modal for the purpose of gating the guidance tooltip.
    (copyIssueOpen &&
      activeGuidancePhase !== 'notion-field-problemAnalysis-copy-modal') ||
    catalogOpen ||
    !!notionError ||
    notionStrayFeedback ||
    // Transient validation-server error modal — pause guidance while
    // the learner decides whether to retry their submission.
    !!serverErrorRetry ||
    // Stage 3 ConfirmDialog — blocks the Custom-Scripts tooltip while the
    // learner is confirming "Update Intent Prompts / Triggers (dev)".
    sheetConfirmDialogOpen ||
    // Same blocking for while the script is actively running, or while
    // the Custom Scripts dropdown menu is open — both overlap / occlude
    // the idle tooltip area and the copy is stale mid-action.
    sheetScriptRunning ||
    sheetScriptMenuOpen ||
    questModalOpenHere;

  const activeEntry = activeGuidancePhase
    ? getGuidanceEntry(guidance, activeGuidancePhase)
    : initialGuidanceEntry;
  const activeAnchorEl = activeGuidancePhase
    ? anchorEls[activeGuidancePhase] ?? null
    : null;
  const activeConfig = activeGuidancePhase
    ? guidanceConfig[activeGuidancePhase]
    : null;
  const activeMessage = activeGuidancePhase
    ? guidanceCopy[activeGuidancePhase]
    : null;

  // Guidance is enabled whenever we have an anchor element, a resolved
  // phase, no blocking modal, persist not in flight, validation not in
  // flight, loading complete, and the phase hasn't been silenced after
  // two dismissals.
  const guidanceEnabled =
    !loading &&
    !!activeGuidancePhase &&
    !!activeAnchorEl &&
    !!activeConfig &&
    !anyModalOpen &&
    !persisting &&
    !validating &&
    !activeEntry.firmFired &&
    !saveError;

  const setGuidanceField = (
    gphase: GuidancePhase,
    patch: Partial<GuidanceEntry>,
  ) => {
    setGuidance((prev) => {
      const curr = prev[gphase] ?? initialGuidanceEntry;
      return { ...prev, [gphase]: { ...curr, ...patch } };
    });
  };

  useIdleGuidance({
    enabled: guidanceEnabled && !activeEntry.idleFired,
    delayMs: activeConfig?.idleMs ?? 999999,
    resetKey: activeGuidancePhase ?? 'none',
    onFire: () => {
      if (activeGuidancePhase) {
        setGuidanceField(activeGuidancePhase, { idleFired: true });
      }
    },
  });

  useStrayClick({
    enabled: guidanceEnabled,
    strayCount: activeEntry.strayCount,
    threshold: activeConfig?.strayThreshold ?? 999,
    onIncrement: () => {},
    onFire: () => {
      if (activeGuidancePhase && !activeEntry.idleFired) {
        setGuidanceField(activeGuidancePhase, { idleFired: true });
      }
    },
  });

  // No global phase-wipe useEffect here. Earlier revisions wiped
  // `anchorEls = {}` on every `phase` change, but that effect runs
  // AFTER React commits (incl. after the new phase's ref callback has
  // already set its anchor). The wipe then clobbered the fresh anchor;
  // because the ref callbacks are `useCallback`-stable, React never
  // re-invoked them, and the anchor stayed null forever → guidance
  // was silently disabled for the whole phase. Child components null
  // their own anchors on unmount via the ref callback protocol, which
  // is sufficient cleanup. Stale entries for non-active phases are
  // harmless: the tooltip only reads `anchorEls[activeGuidancePhase]`.

  // Stray-click registrar. Called from phase-component onClick bubbles;
  // increments the counter unless the click originated on the anchor.
  const registerStray = (event: React.MouseEvent) => {
    if (!guidanceEnabled || !activeGuidancePhase) return;
    if (
      activeAnchorEl &&
      event.target instanceof Node &&
      activeAnchorEl.contains(event.target)
    ) {
      return;
    }
    setGuidance((prev) => {
      const curr = prev[activeGuidancePhase] ?? initialGuidanceEntry;
      return {
        ...prev,
        [activeGuidancePhase]: {
          ...curr,
          strayCount: curr.strayCount + 1,
        },
      };
    });
  };

  // No user-facing dismiss in persistent mode: the tooltip stays open
  // from the moment it fires until the learner actually completes the
  // phase's primary action, at which point `activeGuidancePhase`
  // resolves to a new value and a fresh entry (idleFired=false) is
  // looked up for the next phase. Outside clicks / ESC are explicitly
  // neutralized inside GuidanceTooltip via `onPointerDownOutside` and
  // `onEscapeKeyDown` preventDefault.

  // Report an anchor element (or `null` on unmount) for a phase. Wrapped
  // in `useCallback([])` — React re-invokes ref callbacks with null/el
  // every time their identity changes, so an inline arrow here would
  // feed setState on every commit and blow the update-depth budget.
  // `setAnchorEls` from useState is already reference-stable, so the
  // empty dep list is safe.
  const setAnchorFor = useCallback(
    (gphase: GuidancePhase, el: HTMLElement | null) => {
      setAnchorEls((prev) => {
        if (prev[gphase] === el) return prev;
        return { ...prev, [gphase]: el };
      });
    },
    [],
  );

  // Stable per-phase anchor callbacks. For hard-coded phases the deps
  // list contains only `setAnchorFor` (itself stable), so identity is
  // stable across every render. For `activePhaseAnchor` the identity
  // changes only when the resolved guidance phase changes (i.e. on a
  // real sub-phase transition), which is rare and not every render.
  const dashboardAnchorRef = useCallback(
    (el: HTMLElement | null) => setAnchorFor('dashboard', el),
    [setAnchorFor],
  );
  // Collect handler for NotionLanding's 5 "새로 만들기" buttons. Picks
  // the topmost button by bounding-rect top; ties (within ~2px) go to
  // the leftmost. The chosen element then becomes the notion-landing
  // anchor for the GuidanceTooltip.
  const handleNotionCreateButtonsRef = useCallback((els: HTMLButtonElement[]) => {
    setNotionCreateButtons(els);
    if (els.length === 0) {
      setNotionLandingAnchor(null);
      setAnchorFor('notion-landing', null);
      return;
    }
    const withRects = els.map((el) => ({ el, rect: el.getBoundingClientRect() }));
    withRects.sort((a, b) => {
      const dTop = a.rect.top - b.rect.top;
      if (Math.abs(dTop) > 2) return dTop;
      return a.rect.left - b.rect.left;
    });
    const chosen = withRects[0].el;
    setNotionLandingAnchor(chosen);
    setAnchorFor('notion-landing', chosen);
  }, [setAnchorFor]);
  const chatbotBeforeAnchorRef = useCallback(
    (el: HTMLInputElement | null) => setAnchorFor('chatbot-before', el),
    [setAnchorFor],
  );
  // Step-1 anchor: the in-field "복사하러가기" button reported by
  // NotionTaskPage. Populated only while the problemAnalysis field is
  // active (the button itself only renders then).
  const problemCopyHelperAnchorRef = useCallback(
    (el: HTMLButtonElement | null) =>
      setAnchorFor('notion-field-problemAnalysis-copy', el),
    [setAnchorFor],
  );
  // Step-2 anchor: the "전체 복사" button inside CopyIssueModal.
  // Reported by the modal itself; goes null on modal close.
  const problemCopyModalAnchorRef = useCallback(
    (el: HTMLButtonElement | null) =>
      setAnchorFor('notion-field-problemAnalysis-copy-modal', el),
    [setAnchorFor],
  );
  // Step-3 anchor: the field's 제출 button reported by NotionTaskPage.
  // Same element regardless of which active field — the parent only
  // reads it when the sub-phase resolves to problemAnalysis-submit.
  const problemSubmitAnchorRef = useCallback(
    (el: HTMLButtonElement | null) =>
      setAnchorFor('notion-field-problemAnalysis-submit', el),
    [setAnchorFor],
  );
  // Anchor the currently-active guidance phase on the active field's
  // wrapper div (reported by NotionTaskPage via `onActiveFieldEl`, which
  // queries `[data-field-id="..."]`). Used for the simple single-anchor
  // sub-phases (agent / title / status / etc.) that don't have a
  // dedicated element to point at.
  //
  // IMPORTANT: sub-phases that own a dedicated anchor ref (the in-field
  // "복사하러가기" button, the "제출" button, the Stage 4 auto-fill
  // buttons, etc.) MUST be excluded here. Otherwise this effect writes
  // the whole field wrapper into the anchor slot AFTER the dedicated
  // ref wrote the precise button, clobbering it. The tooltip then points
  // at the entire field row instead of the button.
  const activePhaseAnchor = useCallback(
    (el: HTMLElement | null) => {
      if (!activeGuidancePhase) return;
      if (DEDICATED_ANCHOR_PHASES.has(activeGuidancePhase)) return;
      setAnchorFor(activeGuidancePhase, el);
    },
    [activeGuidancePhase, setAnchorFor],
  );
  // Stage 3 step 1-B anchors — the 3 editable cells of the newly-added
  // intent row, reported via SheetEditPage → IntentSheetTable. Each
  // column has its own GuidancePhase + anchor; SheetEditPage fires the
  // setters with the <td> on mount and `null` on unmount, so the parent
  // doesn't have to orchestrate a single "active" ref per phase.
  const handleIntentRowCellEl = useCallback(
    (colId: 'intent' | 'leadSentence' | 'prompt', el: HTMLElement | null) => {
      const phase: GuidancePhase =
        colId === 'intent'
          ? 'sheet-field-intent'
          : colId === 'leadSentence'
            ? 'sheet-field-leadSentence'
            : 'sheet-field-prompt-paste';
      setAnchorFor(phase, el);
    },
    [setAnchorFor],
  );
  // Stage 4 result-field sub-phase anchors. Reported by NotionTaskPage
  // via `onLoadWorkButtonEl` / `onLoadCaptureButtonEl`. Each goes null
  // once the parent hides the corresponding button (post-auto-fill), so
  // the guidance silently disables instead of pointing at a stale target.
  // Step 3 (submit) re-uses the existing `problemSubmitAnchorRef` wiring
  // — NotionTaskPage's onSubmitButtonEl scans the active field's subtree
  // for the "제출" button and works identically for the result field.
  const loadWorkAnchorRef = useCallback(
    (el: HTMLButtonElement | null) =>
      setAnchorFor('stage4-result-load-work', el),
    [setAnchorFor],
  );
  const loadCaptureAnchorRef = useCallback(
    (el: HTMLButtonElement | null) =>
      setAnchorFor('stage4-result-load-capture', el),
    [setAnchorFor],
  );
  // Stage 4 step-3 anchor (result field 제출 button). Reuses the same
  // element-reporting logic as problemAnalysis step 3 but writes into
  // the `stage4-result-submit` slot. The parent only reads this slot
  // when `activeGuidancePhase === 'stage4-result-submit'`.
  const stage4ResultSubmitAnchorRef = useCallback(
    (el: HTMLButtonElement | null) =>
      setAnchorFor('stage4-result-submit', el),
    [setAnchorFor],
  );
  // RelatedInfoCard's "복사" button — anchor for `sheet-related-copy`.
  // The card only mounts during `add-intent` / `run-intent-script`, so
  // the ref naturally goes null outside that window and the guidance
  // silently disables instead of pointing at a stale target.
  const relatedInfoCopyAnchorRef = useCallback(
    (el: HTMLButtonElement | null) => setAnchorFor('sheet-related-copy', el),
    [setAnchorFor],
  );
  // Anchor forwarder for SheetEditPage's internal-phase-driven anchors
  // (tab / add-row button / custom scripts menu / trigger-row button).
  // Writes to a SPECIFIC GuidancePhase slot per SheetEditPage's
  // current anchor target, rather than to `activeGuidancePhase` — the
  // parent's resolver may be on one of the new per-column sub-phases
  // (sheet-field-*) whose anchors come from different sources.
  const handleSheetAnchorEl = useCallback(
    (el: HTMLElement | null) => {
      // We don't know which slot to write from here alone — the
      // SheetEditPage-side resolution (sheetPhase + activeTabId +
      // menuOpen) is opaque. Walk the plausible slots: write the el
      // into the slot that matches the current external resolver inputs.
      if (sheetPhase === 'add-intent') {
        // On the default trigger-sentence tab, the el is the leftmost
        // intent tab; on any intent tab, the el is the "+ 인텐트 행
        // 추가" button. The resolver picks `sheet-add-intent-tab` vs
        // `sheet-add-intent-row` on the same criterion, so writing to
        // both slots and letting the resolver pick is safe — only one
        // is ever active at a time.
        setAnchorFor('sheet-add-intent-tab', el);
        setAnchorFor('sheet-add-intent-row', el);
      } else if (sheetPhase === 'run-intent-script') {
        setAnchorFor('sheet-run-intent-script', el);
      } else if (sheetPhase === 'add-triggers') {
        setAnchorFor('sheet-add-triggers', el);
      } else if (sheetPhase === 'run-trigger-script') {
        setAnchorFor('sheet-run-trigger-script', el);
      }
    },
    [sheetPhase, setAnchorFor],
  );

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

  // Single source of mission copy for the persistent bar. Intro and
  // course-complete return null so the bar is hidden in orientation and
  // final-celebration screens.
  const missionCopy = getMissionCopy({
    phase,
    currentFieldId,
    sheetPhase,
    panelOpen,
    hasChatbotAnswer: Boolean(
      chatbotInteraction.question && chatbotInteraction.answer,
    ),
    sheetRowFilled,
    relatedInfoCopied,
    workAutoFilled,
    captureVisible,
  });

  // Sub-phase briefing modal: fires once per MissionBar transition that
  // *isn't* already covered by a phase-entry modal above. Reuses the
  // MissionBar message so wording stays in one place.
  const subPhaseQuestToShow: GuidancePhase | null =
    activeGuidancePhase &&
    // workType gets a dedicated briefing QuestModal (rendered in the
    // notion phase block above) instead of the generic sub-phase
    // QuestModal. Skip it here so the two don't stack.
    activeGuidancePhase !== 'notion-field-workType' &&
    SUB_PHASE_MODAL_GUIDANCE_NAMES.has(activeGuidancePhase) &&
    !seenSubPhaseQuests.has(activeGuidancePhase)
      ? activeGuidancePhase
      : null;
  const subPhaseQuestModal =
    subPhaseQuestToShow && missionCopy ? (
      <QuestModal
        label={missionCopy.stageLabel}
        body={missionCopy.message}
        onAccept={() => markSubPhaseSeen(subPhaseQuestToShow)}
      />
    ) : null;

  // Shared "validation server transient error" modal — rendered in
  // every phase that runs through handleNotionSubmit (notion,
  // stage2-page, stage4-result-page) plus sheet-edit / chatbot-test
  // for completeness. Retry replays the captured submission via the
  // existing handler; close just clears the modal so the learner can
  // edit and retry manually.
  const validationErrorModalEl = serverErrorRetry ? (
    <ValidationErrorModal
      onRetry={() => {
        const captured = serverErrorRetry;
        setServerErrorRetry(null);
        handleNotionSubmit(captured.fieldId, captured.value);
      }}
      onClose={() => setServerErrorRetry(null)}
    />
  ) : null;

  // For the notion-landing phase only, the anchor button is chosen
  // dynamically from 5 candidates — so its position on screen varies.
  // Compute a sensible side/align based on the chosen button's rect vs
  // the viewport so the tooltip doesn't clip or overlap the anchor.
  // Other phases continue to read static values from guidanceConfig.
  let resolvedSide = activeConfig?.side;
  let resolvedAlign = activeConfig?.align;
  if (
    activeGuidancePhase === 'notion-landing' &&
    notionLandingAnchor &&
    typeof window !== 'undefined'
  ) {
    const rect = notionLandingAnchor.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const vw = window.innerWidth || document.documentElement.clientWidth;
    if (rect.top < vh * 0.3) {
      resolvedSide = 'bottom';
    } else if (rect.bottom > vh * 0.7) {
      resolvedSide = 'top';
    } else {
      resolvedSide = 'right';
    }
    const cx = rect.left + rect.width / 2;
    if (cx < vw * 0.2) {
      resolvedAlign = 'start';
    } else if (cx > vw * 0.8) {
      resolvedAlign = 'end';
    } else {
      resolvedAlign = 'center';
    }
  }

  // Renders the controlled tooltip for the currently-active phase. Kept
  // as a helper so each phase's JSX tree can drop it in once without
  // repeating the state-plumbing boilerplate.
  // `open` mirrors `guidanceEnabled` (not just `idleFired`) so any
  // blocking modal — QuestModal (QUEST CLEAR celebration, stage
  // briefings), FeedbackModal, CopyIssueModal, IntentCatalogModal,
  // game-over — instantly hides the tooltip instead of letting it
  // peek through from underneath. When the modal dismisses and
  // `guidanceEnabled` flips back to true, the tooltip reappears as
  // long as `idleFired` is still set for the active phase.
  const guidanceTooltip =
    activeGuidancePhase && activeAnchorEl && activeConfig && activeMessage ? (
      <GuidanceTooltip
        open={activeEntry.idleFired && guidanceEnabled}
        anchorEl={activeAnchorEl}
        message={activeMessage}
        tone={activeEntry.tone}
        side={resolvedSide}
        align={resolvedAlign}
      />
    ) : null;

  if (phase === 'intro') {
    return (
      <div className="relative h-full w-full">
        {saveErrorBanner}
        <CourseIntro onNext={() => setPhase('dashboard')} />
      </div>
    );
  }

  if (phase === 'dashboard' && currentSet) {
    return (
      <div className="flex h-full w-full flex-col bg-[#F9F9FA]">
        {missionCopy && <MissionBar {...missionCopy} />}
        <div className="relative min-h-0 flex-1">
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
            onAnchorRef={dashboardAnchorRef}
            onAnyClick={registerStray}
          />
          {guidanceTooltip}
          {!stage1QuestSeen && !dashboardFeedback && !showRestart && (
            <QuestModal
              body="문제가 있는 인텐트의 행을 클릭하세요"
              onAccept={() => setStage1QuestSeen(true)}
            />
          )}
          {dashboardFeedback && !showRestart && (
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
      </div>
    );
  }

  if (phase === 'notion' || phase === 'quest-clear') {
    // Only two modals remain: the stage-boundary celebration (which also
    // advances phase) and FeedbackModal variants for stray clicks / field
    // validation errors. All mission briefing is now in the MissionBar.
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
    } else if (
      phase === 'notion' &&
      !panelOpen &&
      !agentsPageQuestSeen
    ) {
      modal = (
        <QuestModal
          body="Agents & Intents 페이지에 이슈를 Task로 등록해봅시다"
          onAccept={() => setAgentsPageQuestSeen(true)}
        />
      );
    } else if (phase === 'notion' && !panelOpen && notionStrayFeedback) {
      // Misclick on the Notion landing — blocks until the learner
      // acknowledges. Takes priority over the ambient guidance tooltip
      // so the "틀렸습니다" signal lands unambiguously.
      modal = (
        <FeedbackModal
          correct={false}
          message="이 버튼이 아니에요. '새로 만들기' 버튼을 찾아보세요."
          onClose={() => setNotionStrayFeedback(false)}
        />
      );
    } else if (workTypeBriefingShouldShow) {
      // First-touch briefing for Stage 1 workType. Rendered as a plain
      // QuestModal (blue accent, Target icon) — the workType badge
      // taxonomy now lives INSIDE the catalog modal so the learner can
      // see it alongside the existing intents/triggers. CTA opens the
      // IntentCatalogModal; Enter/Escape both run onAccept for least
      // surprise (QuestModal maps them the same).
      modal = (
        <QuestModal
          label="STAGE 1 · 이슈 등록"
          body="아래 엑셀 시트에서 기존 인텐트와 트리거링 문장을 살펴본 뒤, 어떤 유형으로 고칠지 고민해봅시다."
          cta="엑셀 시트 살펴보기"
          onAccept={() => {
            setWorkTypeBriefingSeen(true);
            setCatalogOpen(true);
          }}
        />
      );
    } else if (subPhaseQuestModal) {
      // Field-level briefing inside the Notion task panel — fires on
      // each field advance until dismissed.
      modal = subPhaseQuestModal;
    } else if (notionError) {
      modal = (
        <FeedbackModal
          correct={false}
          message={notionError}
          onClose={() => setNotionError(null)}
        />
      );
    }

    // Promote-to-page pattern: once "새로 만들기" is clicked (panelOpen=true)
    // the task page takes over the full view instead of squeezing into the
    // 560px side panel. NotionLanding is hidden; IntentDetailCard stays as
    // the bottom overlay so the learner can still refer back to the found
    // intent while filling out the task.
    return (
      <div className="flex h-full w-full flex-col">
        {missionCopy && <MissionBar {...missionCopy} />}
        <div className="relative min-h-0 flex-1">
          {saveErrorBanner}
          {!panelOpen && (
            <NotionLanding
              onCreate={handleCreateTask}
              onStray={handleNotionStray}
              onCreateButtonsRef={handleNotionCreateButtonsRef}
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
              onActiveFieldEl={activePhaseAnchor}
              onCopyHelperEl={problemCopyHelperAnchorRef}
              onSubmitButtonEl={problemSubmitAnchorRef}
            />
          )}
          {guidanceTooltip}
          {panelOpen && representative && (
            <IntentDetailCard intent={representative} />
          )}
          {copyIssueOpen && representative ? (
            <CopyIssueModal
              intent={representative}
              onClose={() => setCopyIssueOpen(false)}
              onCopy={() => setProblemAnalysisCopied(true)}
              onCopyButtonEl={problemCopyModalAnchorRef}
            />
          ) : null}
          <IntentCatalogModal
            open={catalogOpen}
            onClose={() => {
              setCatalogOpen(false);
              // Fire the workType guidance tooltip IMMEDIATELY on catalog
              // close. The learner has just digested the briefing +
              // catalog, then returns to the workType field with the
              // popover dropdown showing the 6 options — this is exactly
              // the moment the "Intent 카탈로그를 참고해 알맞은 수정
              // 유형을 골라주세요" nudge is most relevant. Waiting the
              // full 25s idle threshold leaves them staring at 6 unlabeled
              // options with no connection back to the catalog. Setting
              // `idleFired: true` trips the tooltip's `open` prop
              // immediately (see `guidanceTooltip` resolver).
              setGuidanceField('notion-field-workType', {
                idleFired: true,
                strayCount: 0,
                dismissedAt: null,
                tone: 'soft',
                firmFired: false,
              });
            }}
          />
          {modal}
          {validationErrorModalEl}
        </div>
      </div>
    );
  }

  if (phase === 'stage2-page' || phase === 'quest-clear-2') {
    return (
      <div className="flex h-full w-full flex-col">
        {missionCopy && <MissionBar {...missionCopy} />}
        <div className="relative min-h-0 flex-1">
          {saveErrorBanner}
          <NotionTaskPage
            notion={notion}
            currentFieldId={phase === 'stage2-page' ? currentFieldId : null}
            disabled={validating}
            onSubmit={handleNotionSubmit}
            onActiveFieldEl={activePhaseAnchor}
          />
          {guidanceTooltip}
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
          ) : phase === 'stage2-page' && !stage2PageQuestSeen ? (
            <QuestModal
              body="발견한 문제의 수정 방향을 정리해봅시다"
              onAccept={() => setStage2PageQuestSeen(true)}
            />
          ) : notionError ? (
            <FeedbackModal
              correct={false}
              message={notionError}
              onClose={() => setNotionError(null)}
            />
          ) : null}
          {validationErrorModalEl}
        </div>
      </div>
    );
  }

  if (phase === 'sheet-edit' || phase === 'quest-clear-3') {
    // Per-phase briefing modals have been retired; MissionBar surfaces
    // the active Stage 3 step (Step 1/4 … 4/4) via sheetPhase. This block
    // keeps only the stage-complete celebration and any notionError that
    // leaked through.
    return (
      <div className="flex h-full w-full flex-col">
        {missionCopy && <MissionBar {...missionCopy} />}
        <div className="relative min-h-0 flex-1">
          {saveErrorBanner}
          <SheetEditPage
            disabled={validating}
            representative={representative}
            onComplete={handleSheetComplete}
            onPhaseChange={setSheetPhase}
            onAnchorEl={handleSheetAnchorEl}
            onActiveTabChange={setSheetActiveTabId}
            onIntentRowCellEl={handleIntentRowCellEl}
            onIntentRowFilled={setSheetRowFilled}
            onRelatedInfoCopyButtonEl={relatedInfoCopyAnchorRef}
            onRelatedInfoCopy={() => setRelatedInfoCopied(true)}
            onConfirmDialogChange={setSheetConfirmDialogOpen}
            onScriptRunningChange={setSheetScriptRunning}
            onScriptMenuOpenChange={setSheetScriptMenuOpen}
          />
          {guidanceTooltip}
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
          {phase === 'sheet-edit' && !sheetEditQuestSeen && !notionError && (
            <QuestModal
              body="Dev 시트에서 인텐트를 추가하고 트리거 문장을 작성해봅시다"
              onAccept={() => setSheetEditQuestSeen(true)}
            />
          )}
          {phase === 'sheet-edit' &&
            sheetEditQuestSeen &&
            !notionError &&
            subPhaseQuestModal}
          {validationErrorModalEl}
        </div>
      </div>
    );
  }

  if (phase === 'chatbot-test') {
    // After a successful Q&A is persisted, gate the move to the result
    // entry page on a QUEST CLEAR modal whose CTA advances phase — this
    // modal stays because it's the transition trigger, not just briefing.
    const showGoToResult =
      !!chatbotInteraction.question && !!chatbotInteraction.answer;
    return (
      <div className="flex h-full w-full flex-col">
        {missionCopy && <MissionBar {...missionCopy} />}
        <div className="relative min-h-0 flex-1">
          {saveErrorBanner}
          <ChatbotTestPage
            disabled={validating}
            representativeIntentLabel={representative?.row.intent}
            representativeIntent={representative}
            onAskAndReply={handleChatbotExchange}
            onInputRef={chatbotBeforeAnchorRef}
          />
          {guidanceTooltip}
          {showGoToResult ? (
            <QuestModal
              label="QUEST CLEAR"
              body="챗봇이 수정한 인텐트로 올바르게 답변했어요! 이제 Notion 으로 돌아가 작업 상태를 Done 으로 바꾸고 결과를 기록하며 마무리해요."
              cta="Notion 으로"
              onAccept={() => {
                setCurrentFieldIdx(countFilledStage4Notion(notion));
                setPhase('stage4-result-page');
              }}
            />
          ) : !chatbotTestQuestSeen ? (
            <QuestModal
              body="Dev 챗봇에 문제 발화를 직접 입력해 수정 결과를 확인해봅시다"
              onAccept={() => setChatbotTestQuestSeen(true)}
            />
          ) : notionError ? (
            <FeedbackModal
              correct={false}
              message={notionError}
              onClose={() => setNotionError(null)}
            />
          ) : null}
          {validationErrorModalEl}
        </div>
      </div>
    );
  }

  if (phase === 'stage4-result-page') {
    // Per-field briefing modals (status / result) retired — MissionBar
    // surfaces the active field's instruction in a persistent line.
    // "작업 내역 불러오기" — replace the Stage 3 short summary in
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
    // "테스트 결과 불러오기" — reveal a chat-bubble capture card
    // styled like the Dev 챗봇 UI below the result BlockField. Session
    // state only; the underlying Q&A is already persisted separately.
    const handleAutoFillCapture = () => {
      if (!chatbotInteraction.question || !chatbotInteraction.answer) return;
      setCaptureVisible(true);
    };

    // `workAutoFilled` is computed once at the component level (above the
    // guidance/mission resolvers) and read here for the auto-fill button's
    // "already done?" gate so the button hides after the learner clicks
    // it. See top-level declaration for the detection heuristic.

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
      <div className="flex h-full w-full flex-col">
        {missionCopy && <MissionBar {...missionCopy} />}
        <div className="relative min-h-0 flex-1">
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
            onActiveFieldEl={activePhaseAnchor}
            onLoadWorkButtonEl={loadWorkAnchorRef}
            onLoadCaptureButtonEl={loadCaptureAnchorRef}
            onSubmitButtonEl={stage4ResultSubmitAnchorRef}
          />
          {guidanceTooltip}
          {!stage4ResultQuestSeen ? (
            <QuestModal
              body="작업 상태를 Done 으로 바꾸고 결과를 기록해 마무리합시다"
              onAccept={() => setStage4ResultQuestSeen(true)}
            />
          ) : subPhaseQuestModal ? (
            subPhaseQuestModal
          ) : notionError ? (
            <FeedbackModal
              correct={false}
              message={notionError}
              onClose={() => setNotionError(null)}
            />
          ) : null}
          {validationErrorModalEl}
        </div>
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
