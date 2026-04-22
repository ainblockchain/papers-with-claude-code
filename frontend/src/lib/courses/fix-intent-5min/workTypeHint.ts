import {
  WORK_TYPES,
  type WorkTypeKey,
} from '@/data/courses/fix-intent-5min/work-types';
import {
  workTypeAnswer,
  workTypeHints,
  workTypeNextHints,
} from '@/data/courses/fix-intent-5min/notion-options';

const KNOWN_KEYS = new Set<string>(WORK_TYPES.map((w) => w.key));

/**
 * Decide what to show the learner when a workType submission fails.
 *
 * Branches, in priority:
 * 1. Nothing selected   → ask them to pick at least one.
 * 2. A wrong key is in  → show *its* hint (from workTypeHints) so the
 *    learner understands why that work type doesn't fit, not just that
 *    it's wrong. First offending key wins; one correction at a time
 *    reads better than a wall of text.
 * 3. Only correct keys, but one of the required keys is missing → a
 *    nudge (from workTypeNextHints) that walks the learner toward the
 *    missing piece WITHOUT naming it, preserving the guess-and-learn
 *    loop.
 */
export function computeWorkTypeHint(rawValue: string): string {
  const selected = rawValue
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean) as WorkTypeKey[];

  if (selected.length === 0) {
    return '작업 유형을 하나 이상 골라 주세요. 이 Task는 여러 작업 유형이 함께 필요해요.';
  }

  const answerSet = new Set<WorkTypeKey>(workTypeAnswer);
  const wrong = selected.filter(
    (k) => KNOWN_KEYS.has(k) && !answerSet.has(k),
  );
  const missing = workTypeAnswer.filter((k) => !selected.includes(k));

  if (wrong.length > 0) {
    return workTypeHints[wrong[0]];
  }

  if (missing.length > 0) {
    // The learner has only one of the required keys. Nudge toward the
    // missing piece from the perspective of what they already picked,
    // without naming the correct label.
    const pickedCorrect = selected.find((k) => answerSet.has(k));
    const nudge = pickedCorrect ? workTypeNextHints[pickedCorrect] : undefined;
    return (
      nudge ??
      '좋은 방향이에요. 이 Task를 완전히 해결하려면 작업이 하나 더 필요해요. 어떤 유형일지 떠올려 보세요.'
    );
  }

  // All required keys are present and no wrong keys — shouldn't reach
  // here since validate would have returned true. Safe fallback.
  return '작업 유형을 다시 확인해 주세요.';
}
