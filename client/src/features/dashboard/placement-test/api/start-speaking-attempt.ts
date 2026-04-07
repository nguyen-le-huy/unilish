import { apiPostUnwrappedEnvelope } from '@/lib/axios';
import type { StartSpeakingAttemptResult } from '../types/speaking.types';

export const startSpeakingAttempt = async (sessionId: string): Promise<StartSpeakingAttemptResult> => {
    return apiPostUnwrappedEnvelope<StartSpeakingAttemptResult>(
        `/placement-sessions/${sessionId}/speaking/start`,
    );
};