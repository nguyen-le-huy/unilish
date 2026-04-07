import { apiPostUnwrappedEnvelope } from '@/lib/axios';
import type {
    StartWritingAttemptPayload,
    StartWritingAttemptResult,
} from '../types/writing.types';

export const startWritingAttempt = async (
    sessionId: string,
    payload: StartWritingAttemptPayload,
): Promise<StartWritingAttemptResult> => {
    return apiPostUnwrappedEnvelope<StartWritingAttemptResult, StartWritingAttemptPayload>(
        `/placement-sessions/${sessionId}/writing/start`,
        payload,
    );
};