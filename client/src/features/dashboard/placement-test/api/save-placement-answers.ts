import { apiPatchUnwrappedEnvelope } from '@/lib/axios';
import type { RuntimeAnswerOption, RuntimeAttempt } from '../types/runtime.types';

export interface SavePlacementAnswerInput {
    questionId: string;
    selectedOption?: RuntimeAnswerOption | null;
    flagged?: boolean;
}

export interface SavePlacementAnswersPayload {
    attemptId: string;
    answers: SavePlacementAnswerInput[];
}

export interface SavePlacementAnswersResult {
    attemptId: string;
    status: RuntimeAttempt['status'];
    answerSheet: RuntimeAttempt['answerSheet'];
    progress: {
        answered: number;
        total: number;
        flagged: number;
    };
}

export const savePlacementAnswers = async (
    payload: SavePlacementAnswersPayload,
): Promise<SavePlacementAnswersResult> => {
    return apiPatchUnwrappedEnvelope<SavePlacementAnswersResult, { answers: SavePlacementAnswerInput[] }>(
        `/placement-tests/runtime/attempts/${payload.attemptId}/answers`,
        { answers: payload.answers },
    );
};
