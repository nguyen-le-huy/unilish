import { apiPostUnwrappedEnvelope } from '@/lib/axios';
import type {
    SubmitWritingAttemptPayload,
    SubmitWritingAttemptResult,
} from '../types/writing.types';

export const submitWritingAttempt = async (
    sessionId: string,
    payload: SubmitWritingAttemptPayload,
): Promise<SubmitWritingAttemptResult> => {
    return apiPostUnwrappedEnvelope<SubmitWritingAttemptResult, SubmitWritingAttemptPayload>(
        `/placement-sessions/${sessionId}/writing/submit`,
        payload,
    );
};