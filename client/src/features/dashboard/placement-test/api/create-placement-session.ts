import { apiPostUnwrappedEnvelope } from '@/lib/axios';

export interface CreatePlacementSessionPayload {
    lrAttemptId: string;
    lrRawScore: number;
}

export interface CreatePlacementSessionResult {
    sessionId: string;
}

export const createPlacementSession = async (
    payload: CreatePlacementSessionPayload,
): Promise<CreatePlacementSessionResult> => {
    return apiPostUnwrappedEnvelope<CreatePlacementSessionResult, CreatePlacementSessionPayload>(
        '/placement-sessions',
        payload,
    );
};