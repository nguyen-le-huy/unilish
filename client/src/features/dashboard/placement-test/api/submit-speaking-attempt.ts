import { apiPostUnwrappedEnvelope } from '@/lib/axios';
import type {
    SubmitSpeakingAttemptPayload,
    SubmitSpeakingAttemptResult,
} from '../types/speaking.types';

export const submitSpeakingAttempt = async (
    sessionId: string,
    payload: SubmitSpeakingAttemptPayload,
): Promise<SubmitSpeakingAttemptResult> => {
    return apiPostUnwrappedEnvelope<SubmitSpeakingAttemptResult, SubmitSpeakingAttemptPayload>(
        `/placement-sessions/${sessionId}/speaking/submit`,
        payload,
    );
};