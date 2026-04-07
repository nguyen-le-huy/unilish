import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { WritingResult } from '../types/writing.types';

export const getWritingResult = async (sessionId: string): Promise<WritingResult> => {
    return apiGetUnwrappedEnvelope<WritingResult>(
        `/placement-sessions/${sessionId}/writing/result`,
    );
};