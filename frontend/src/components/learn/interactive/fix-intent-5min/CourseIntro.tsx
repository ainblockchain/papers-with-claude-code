'use client';

import { useEffect, useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { getPreRenderedSprite } from '@/lib/sprites/cache';
import type { Palette, SpriteFrame } from '@/lib/sprites/types';

interface Props {
  onNext: () => void;
}

// Claude Code's coral pixel mascot wearing a safety hat — a blocky chonky
// creature with two square eyes, two side tabs ("ears"), four legs, and a
// yellow hard hat on top. Drawn as a 22×14 palette grid so it can flow
// through the same cache/render path the in-game sprites use.
const CC_PALETTE: Palette = [
  '',        // 0  transparent
  '#CF6F50', // 1  coral body
  '#FFD100', // 2  safety hat yellow
  '#C99400', // 3  hat brim shadow / dark trim
];
const CC_FRAME: SpriteFrame = [
  // Hat dome (tapered top)
  [0, 0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 0, 0, 0, 0],
  // Hat brim (widest — overhangs body)
  [0, 0, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 0, 0, 0],
  // Body
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];
const CC_COLS = CC_FRAME[0].length;
const CC_ROWS = CC_FRAME.length;

function PixelHero({ size = 128 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Preserve aspect: source is wider than tall, so width drives target px.
  const targetW = size;
  const targetH = Math.round((size * CC_ROWS) / CC_COLS);
  useEffect(() => {
    const target = canvasRef.current;
    if (!target) return;
    const source = getPreRenderedSprite(
      `course-intro-cc-mascot-${targetW}x${targetH}`,
      CC_FRAME,
      CC_PALETTE,
      targetW,
      targetH,
    );
    target.width = targetW;
    target.height = targetH;
    const ctx = target.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(source, 0, 0);
  }, [targetW, targetH]);
  return (
    <>
      <style>{`
        @keyframes pixel-hero-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-5px); }
        }
      `}</style>
      <canvas
        ref={canvasRef}
        width={targetW}
        height={targetH}
        aria-label="Claude Code pixel mascot"
        style={{
          width: targetW,
          height: targetH,
          imageRendering: 'pixelated',
          flex: '0 0 auto',
          animation: 'pixel-hero-bob 2.4s ease-in-out infinite',
        }}
      />
    </>
  );
}

// Papers-with-Claude-Code brand orange — matches the #FF9D00 used across
// the app shell (dashboard CTAs, learn loading spinner, header accents).
// Tints follow the existing /10, /25 alpha pattern found in dashboard/page.tsx.
const ORANGE = '#FF9D00';
const ORANGE_HOVER = '#E88C00';
const PAGE_BG = '#FFF9EE'; // very light peach — echoes bg-[#FF9D00]/4 on white
const CHIP_BG = 'rgba(255,157,0,0.10)'; // matches bg-[#FF9D00]/10
const CARD_BORDER = 'rgba(255,157,0,0.22)';
const TEXT_STRONG = 'rgba(7,23,34,0.88)';
const TEXT_BODY = 'rgba(7,23,34,0.72)';
const TEXT_MUTED = 'rgba(7,23,34,0.56)';

interface Section {
  title: string;
  body: React.ReactNode;
}

const SECTIONS: Section[] = [
  {
    title: '인텐트란?',
    body: (
      <>
        인텐트(Intent)는 유저 질문이 매칭되는{' '}
        <strong style={{ color: TEXT_STRONG }}>의미 단위</strong>예요.
        <br />
        <span style={{ color: TEXT_MUTED }}>
          예) &ldquo;등록금 얼마야?&rdquo; · &ldquo;수업료 알려줘&rdquo; ·
          &ldquo;학비 궁금해&rdquo; → 모두{' '}
        </span>
        <code
          style={{
            padding: '1px 6px',
            borderRadius: 4,
            background: CHIP_BG,
            color: ORANGE_HOVER,
            fontSize: '0.88em',
            fontWeight: 600,
          }}
        >
          등록금_문의
        </code>
        <span style={{ color: TEXT_MUTED }}> 하나의 인텐트로 분류됩니다.</span>
      </>
    ),
  },
  {
    title: '궁금하냥에 기여해요',
    body: (
      <>
        <strong style={{ color: TEXT_STRONG }}>궁금하냥</strong>은 한양대학교
        학사 행정 AI 챗봇이에요. 인텐트 시스템이 학생 질문을 분류하고 답변을
        매칭합니다. 여러분이 고친 인텐트는 실제 학생이 쓰는 챗봇에 반영돼요.
      </>
    ),
  },
  {
    title: '인텐트 수정이란?',
    body: (
      <>
        Prod 기록에서 잘못 매칭됐거나 답변이 부정확한 인텐트를 찾아,
        <br />
        Dev Google Sheet에서{' '}
        <code
          style={{
            padding: '1px 6px',
            borderRadius: 4,
            background: CHIP_BG,
            color: ORANGE_HOVER,
            fontSize: '0.88em',
            fontWeight: 600,
          }}
        >
          트리거 문장 수정
        </code>{' '}
        ·{' '}
        <code
          style={{
            padding: '1px 6px',
            borderRadius: 4,
            background: CHIP_BG,
            color: ORANGE_HOVER,
            fontSize: '0.88em',
            fontWeight: 600,
          }}
        >
          인텐트 프롬프트 수정
        </code>{' '}
        ·{' '}
        <code
          style={{
            padding: '1px 6px',
            borderRadius: 4,
            background: CHIP_BG,
            color: ORANGE_HOVER,
            fontSize: '0.88em',
            fontWeight: 600,
          }}
        >
          신규 인텐트 등록
        </code>{' '}
        중 한 가지로 고친 뒤 Dev 챗봇에서 검증해요.
        <br />
        <span style={{ color: TEXT_MUTED, fontSize: '0.92em' }}>
          (Prod 반영은 이후 PM이 담당합니다.)
        </span>
      </>
    ),
  },
  {
    title: '이 강의에서 다루는 4단계',
    body: (
      <ol
        style={{
          margin: 0,
          paddingLeft: 0,
          display: 'grid',
          gap: 8,
          listStyle: 'none',
          color: TEXT_BODY,
        }}
      >
        {[
          ['고칠 인텐트 찾기', 'Prod 채팅 기록에서 문제 있는 인텐트 발견'],
          ['수정 방향 결정', 'Notion에 이슈를 Task로 등록'],
          ['Sheet에서 직접 수정', 'Dev Google Sheet 편집 + App Script 실행'],
          ['결과 확인', 'Dev 챗봇에서 수정 테스트'],
        ].map(([label, desc], i) => (
          <li
            key={label}
            style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}
          >
            <span
              style={{
                flex: '0 0 18px',
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                color: ORANGE,
                border: `1.5px solid ${ORANGE}`,
                fontSize: 10,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
              }}
            >
              {i + 1}
            </span>
            <span>
              <strong style={{ color: TEXT_STRONG }}>{label}</strong>
              <span style={{ color: TEXT_MUTED }}> — {desc}</span>
            </span>
          </li>
        ))}
      </ol>
    ),
  },
];

export function CourseIntro({ onNext }: Props) {
  return (
    <div
      className="relative h-full w-full overflow-y-auto font-[family:var(--font-lato),Arial,sans-serif]"
      style={{ background: PAGE_BG }}
    >
      <div
        className="mx-auto flex min-h-full flex-col"
        style={{ maxWidth: 820, padding: '44px 16px 52px' }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 999,
                background: CHIP_BG,
                color: ORANGE_HOVER,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 14,
              }}
            >
              <Sparkles size={12} strokeWidth={2.2} />
              시작하기 전에
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 700,
                color: TEXT_STRONG,
                lineHeight: 1.3,
              }}
            >
              궁금하냥 인텐트, 5분만에 고치기
            </h1>
            <p
              style={{
                margin: '10px 0 0',
                fontSize: 14,
                color: TEXT_MUTED,
                lineHeight: 1.6,
              }}
            >
              이 강의가 무엇을 다루는지 아주 짧게 살펴볼게요.
            </p>
          </div>
          <PixelHero size={140} />
        </header>

        <div style={{ display: 'grid', gap: 14 }}>
          {SECTIONS.map((s, i) => (
            <section
              key={s.title}
              style={{
                background: '#fff',
                border: `1px solid ${CARD_BORDER}`,
                borderRadius: 12,
                padding: '18px 20px',
                boxShadow: '0 1px 2px rgba(255,157,0,0.06)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    flex: '0 0 24px',
                    height: 24,
                    borderRadius: 6,
                    background: ORANGE,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                  }}
                >
                  {i + 1}
                </span>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 15,
                    fontWeight: 700,
                    color: TEXT_STRONG,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {s.title}
                </h2>
              </div>
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.7,
                  color: TEXT_BODY,
                }}
              >
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <div style={{ marginTop: 28, display: 'flex', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onNext}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: ORANGE,
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              padding: '12px 28px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 0 32px rgba(255,157,0,0.35)',
              transition: 'background 120ms ease, box-shadow 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = ORANGE_HOVER;
              e.currentTarget.style.boxShadow =
                '0 0 48px rgba(255,157,0,0.55)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = ORANGE;
              e.currentTarget.style.boxShadow =
                '0 0 32px rgba(255,157,0,0.35)';
            }}
          >
            다음
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </div>
  );
}
