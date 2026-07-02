import { apiPatchUnwrappedEnvelope } from '@/lib/axios';

export interface CheckpointPayload {
    version: number;
    checkpoint: Record<string, unknown>;
    activeSecondsDelta: number;
}

export interface CheckpointResult {
    version: number;
    totalTimeSeconds: number;
}

export const saveCheckpoint = async (
    lessonId: string,
    payload: CheckpointPayload,
): Promise<CheckpointResult> => {
    return apiPatchUnwrappedEnvelope<CheckpointResult, CheckpointPayload>(
        `/learning/lessons/${lessonId}/checkpoint`,
        payload,
        {
            headers: { 'Idempotency-Key': crypto.randomUUID() },
        },
    );
};
