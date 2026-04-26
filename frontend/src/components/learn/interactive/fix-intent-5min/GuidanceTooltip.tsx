'use client';

import { useEffect, useRef } from 'react';
import { Tooltip as TooltipPrimitive } from 'radix-ui';

interface Props {
  open: boolean;
  anchorEl: HTMLElement | null;
  message: string;
  tone?: 'soft' | 'firm';
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
}

// Controlled tooltip anchored to an arbitrary DOM element via a virtual
// trigger. Themed with the fix-intent-5min orange palette (peach surface
// + brown text) — visually distinct from QuestModal's blue so the two
// keep separate roles (tooltip = gentle nudge, modal = blocking gate).
//
// `anchorEl` is used instead of wrapping children in TooltipTrigger
// because the anchor can live deep inside a child component whose ref
// is callback-reported up to IntentFixCourse — passing the element
// directly avoids threading refs through multiple layers.
//
// Composes `TooltipPrimitive` directly (not the shadcn `TooltipContent`
// wrapper) so the arrow's fill can be themed per-tone without editing
// the shared ui/tooltip.tsx primitive.
export function GuidanceTooltip({
  open,
  anchorEl,
  message,
  tone = 'soft',
  side = 'top',
  align = 'center',
}: Props) {
  // A zero-size, pointer-events-none virtual trigger positioned on top
  // of the real anchor. Radix needs a physical trigger element to
  // measure against; mirroring the anchor's bounding rect lets the
  // tooltip point at the real button without hijacking its clicks.
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!anchorEl || !triggerRef.current) return;
    const trigger = triggerRef.current;
    const sync = () => {
      const rect = anchorEl.getBoundingClientRect();
      trigger.style.position = 'fixed';
      trigger.style.left = `${rect.left}px`;
      trigger.style.top = `${rect.top}px`;
      trigger.style.width = `${rect.width}px`;
      trigger.style.height = `${rect.height}px`;
      trigger.style.pointerEvents = 'none';
    };
    sync();
    window.addEventListener('scroll', sync, true);
    window.addEventListener('resize', sync);
    const ro = new ResizeObserver(sync);
    ro.observe(anchorEl);
    return () => {
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
      ro.disconnect();
    };
  }, [anchorEl]);

  // When the tooltip opens on an off-screen anchor (e.g. notion-landing's
  // "새로 만들기" button sitting below the fold), scroll it into view so
  // the arrow has something visible to point at. No-op when the anchor
  // is already on screen.
  useEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const inView =
      rect.top >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    if (!inView) {
      anchorEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [open, anchorEl]);

  // Orange palette. A single solid border is applied to BOTH the
  // content box and the arrow SVG (no separate `ring`/box-shadow).
  // A ring on the box alone left the arrow visually detached from
  // the outline; a shared solid border unifies the two surfaces so
  // the V of the arrow reads as a continuation of the box edge.
  // Firm tier differentiates itself via thicker border + deeper
  // colour, not via a ring.
  const surfaceBg = '#FFF8EF';
  const borderSoft = '#FDE6CE';
  const borderFirm = '#FF9D00';
  const borderColor = tone === 'firm' ? borderFirm : borderSoft;
  const borderWidth = tone === 'firm' ? 2 : 1;

  return (
    <TooltipPrimitive.Root open={open && anchorEl !== null}>
      <TooltipPrimitive.Trigger asChild>
        <span ref={triggerRef} aria-hidden="true" />
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={10}
          collisionPadding={12}
          // Keeps the arrow at least this far from the content's
          // rounded corners. For `align='start'` with a narrow anchor
          // this pins the arrow near the left edge without letting it
          // disappear under the `rounded-lg` mask.
          arrowPadding={12}
          // Force the configured `side` to stick. Without this radix
          // silently flips the tooltip to the opposite side when
          // available space is tight — which on Stage 1 swapped the
          // arrow from bottom-of-box (pointing at the table header) to
          // top-of-box, breaking the intended "box above, V below"
          // arrangement. Anchor placement has to guarantee enough room
          // on the requested side; if it ever doesn't, the layout
          // bug is surfaced immediately instead of getting papered
          // over by a flip.
          avoidCollisions={false}
          // Persistent mode: the tooltip stays visible until the phase
          // advances. Radix's default close-on-outside-click and
          // close-on-ESC would dismiss the guidance prematurely, so
          // both events are swallowed.
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          // `w-fit` makes the content box shrink to the longest
          // actually-rendered line instead of always filling max-w —
          // fixes the right-edge whitespace when a short second line
          // sat next to a long first line. `max-w-[320px]` is the
          // wrap-at boundary, raised from 280 so most firm copy fits
          // on a single line at 12.5px Korean.
          className={`z-[60] w-fit max-w-[320px] rounded-lg px-3 py-2 text-[12.5px] font-medium leading-snug text-[#3B2A1F] shadow-[0_10px_30px_-12px_rgba(255,157,0,0.45)] data-[state=delayed-open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:fade-in-0 data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1`}
          style={{
            background: surfaceBg,
            border: `${borderWidth}px solid ${borderColor}`,
          }}
        >
          <span className="flex items-start gap-2">
            <span
              aria-hidden="true"
              className="mt-[3px] inline-flex h-1.5 w-1.5 flex-none rounded-full"
              style={{ background: '#FF9D00' }}
            />
            {/* `keep-all` prevents Korean words (어절) from splitting
                mid-syllable — e.g. "알맞은" breaking into "알맞 / 은". */}
            <span style={{ wordBreak: 'keep-all' }}>{message}</span>
          </span>
          <TooltipPrimitive.Arrow width={10} height={5} asChild>
            {/* Clipped rotated-square arrow.
                Earlier approaches failed because:
                  (1) SVG polyline stroke + CSS border anti-alias
                      differently, leaving a hairline seam at the box /
                      arrow junction; and
                  (2) a plain rotated square showed the FULL diamond
                      (upper half + lower half) because radix renders
                      the arrow as a Content descendant — it paints on
                      top of the Content background, so there's no way
                      to "hide behind" the tooltip body via z-index.
                Fix: use `clip-path` to keep only the lower-right
                triangle of the pre-rotation square. After `rotate(45)`
                + `translateY(-50%)` that clipped half becomes the
                lower half of the diamond; the clip boundary is a
                horizontal line through the diamond's vertical center,
                which ends up exactly at the content's outer bottom.
                The two remaining edges (original right + bottom) are
                the V's slanted sides, rendered with the SAME CSS
                `border` rule as the content box so they read as a
                seamless continuation of the outline. */}
            <div
              style={{
                width: '10px',
                height: '10px',
                boxSizing: 'border-box',
                background: surfaceBg,
                border: `${borderWidth}px solid ${borderColor}`,
                // Extra `-${borderWidth}px` on top of `-50%` pushes
                // the V up so its horizontal "top" (the clip edge, no
                // border) lands at the content box's INNER bottom
                // border edge, not its outer edge. That way the V's
                // fill overpaints the content's bottom border in the
                // V's x-range — creating an effective GAP in the
                // horizontal border exactly where the V joins. The
                // V's two slanted borders then continue from the
                // gap's endpoints outward, so the eye reads a single
                // continuous speech-bubble outline instead of a box
                // border + a separate V.
                transform: `translateY(calc(-50% - ${borderWidth}px)) rotate(45deg)`,
                clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
              }}
            />
          </TooltipPrimitive.Arrow>
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
