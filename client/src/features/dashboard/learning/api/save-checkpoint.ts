import { apiPatchUnwrappedEnvelope } from '@/lib/axios';
import type { ExerciseCheckpointKind } from '../types/learning.types';

export interface CheckpointPayload {
    version: number;
    checkpoint: ExerciseCheckpointKind;
    activeSecondsDelta: number;
    conflictStrategy?: 'STRICT' | 'LAST_WRITE_WINS';
}

export interface CheckpointResult {
    progressId: string;
    checkpointVersion: number;
    timeSpentSeconds: number;
    status: string;
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
