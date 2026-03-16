import { apiPostUnwrappedEnvelope } from '@/lib/axios';
import type { RuntimeAttempt } from '../types/runtime.types';

export interface SubmitPlacementAttemptResult {
    attempt: RuntimeAttempt;
    profileUpdate: {
        placementTestScore: number;
        currentLevel: string;
        weakSkills: string[];
    };
}

export const submitPlacementAttempt = async (attemptId: string): Promise<SubmitPlacementAttemptResult> => {
    return apiPostUnwrappedEnvelope<SubmitPlacementAttemptResult>(
        `/placement-tests/runtime/attempts/${attemptId}/submit`,
    );
};
