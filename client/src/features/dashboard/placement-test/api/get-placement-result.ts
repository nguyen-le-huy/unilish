import { apiGetUnwrappedEnvelope } from '@/lib/axios';
import type { PlacementResultResponse } from '../types/result.types';

export const getPlacementResult = async (sessionId: string): Promise<PlacementResultResponse> => {
    return apiGetUnwrappedEnvelope<PlacementResultResponse>(
        `/placement-sessions/${sessionId}/result`,
    );
};