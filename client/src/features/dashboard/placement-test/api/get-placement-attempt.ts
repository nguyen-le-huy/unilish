import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { RuntimeAttempt } from '../types/runtime.types';

export const getPlacementAttempt = async (attemptId: string): Promise<RuntimeAttempt> => {
    return apiGetUnwrappedEnvelope<RuntimeAttempt>(`/placement-tests/runtime/attempts/${attemptId}`);
};
