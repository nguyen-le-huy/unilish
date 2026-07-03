import type { PracticeAnswer } from './practice.types';

/**
 * Extract pairs from a MATCHING PracticeAnswer, or return empty object.
 */
export function matchingAnswerToPairs(
    answer: PracticeAnswer | undefined,
): Record<string, string> {
    if (!answer) return {};
    if ('pairs' in answer && typeof answer.pairs === 'object') {
        return answer.pairs as Record<string, string>;
    }
    return {};
}

/**
 * Create a MATCHING PracticeAnswer from pairs.
 */
export function pairsToMatchingAnswer(
    pairs: Record<string, string>,
): PracticeAnswer {
    return { pairs };
}

/**
 * Check if a PracticeAnswer is effectively empty (unanswered).
 * Re-exported from use-exercise-state for convenience.
 */
export { isEmptyAnswer, isMatchingComplete } from '../../../hooks/use-exercise-state';
