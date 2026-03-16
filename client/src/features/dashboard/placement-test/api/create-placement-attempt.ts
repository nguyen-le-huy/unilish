import { apiPostUnwrappedEnvelope } from '@/lib/axios';
import type { RuntimeAttempt } from '../types/runtime.types';

interface CreatePlacementAttemptPayload {
    placementTestId: string;
}

export const createPlacementAttempt = async (
    payload: CreatePlacementAttemptPayload,
): Promise<RuntimeAttempt> => {
    return apiPostUnwrappedEnvelope<RuntimeAttempt, CreatePlacementAttemptPayload>(
        '/placement-tests/runtime/attempts',
        payload,
    );
};
