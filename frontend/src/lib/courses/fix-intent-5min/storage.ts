import type { CourseState } from './course-state';

// System convention for paperIds is the double-dash form ("slug--course").
// Everything else — QuizOverlay, CourseCanvas, VillageCanvas trackEvent,
// the /api/courses/{courseId}/completers reader — uses this shape. Previously
// this file hardcoded a slash form which made writeExploration derive a
// topicKey ("courses|slug|course", two pipes) that no other code path reads,
// so fix-intent-5min progress was invisible to the Learners tab.
const PAPER_ID = 'curious-nyang-intent-guide--fix-intent-5min';

export async function loadCourseState(
  passkeyPublicKey: string | undefined,
): Promise<CourseState | null> {
  const params = new URLSearchParams({ paperId: PAPER_ID });
  if (passkeyPublicKey) params.set('passkeyPublicKey', passkeyPublicKey);
  try {
    const res = await fetch(`/api/courses/fix-intent-5min/state?${params.toString()}`, {
      method: 'GET',
    });
    const data = await res.json();
    if (!data?.ok) return null;
    return (data.state as CourseState | null) ?? null;
  } catch (err) {
    console.error('[fix-intent-5min] loadCourseState failed', err);
    return null;
  }
}

export async function saveCourseState(
  passkeyPublicKey: string | undefined,
  courseState: CourseState,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/courses/fix-intent-5min/state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: PAPER_ID,
        passkeyPublicKey,
        courseState,
      }),
    });
    const data = await res.json();
    if (!data?.ok) return { ok: false, error: data?.error ?? 'save failed' };
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'save failed' };
  }
}

export async function recordStageComplete(
  passkeyPublicKey: string | undefined,
  stageNum: number,
): Promise<void> {
  try {
    await fetch('/api/stage-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paperId: PAPER_ID,
        stageNum,
        passkeyPublicKey,
      }),
    });
  } catch (err) {
    console.error('[fix-intent-5min] recordStageComplete failed', err);
  }
}
