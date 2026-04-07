import { apiPostUnwrappedEnvelope } from '@/lib/axios';
import type { UploadAudioChunkPayload, UploadAudioChunkResult } from '../types/speaking.types';

export const uploadAudioChunk = async (
    sessionId: string,
    payload: UploadAudioChunkPayload,
): Promise<UploadAudioChunkResult> => {
    const formData = new FormData();
    formData.append('speakingAttemptId', payload.speakingAttemptId);
    formData.append('part', String(payload.part));
    formData.append('questionIdx', String(payload.questionIdx));
    formData.append('audio', payload.audioBlob, `speaking-part-${payload.part}-q-${payload.questionIdx}.webm`);
    if (payload.transcript) {
        formData.append('transcript', payload.transcript);
    }

    if (payload.pronunciationData) {
        formData.append('pronunciationData', JSON.stringify(payload.pronunciationData));
    }

    return apiPostUnwrappedEnvelope<UploadAudioChunkResult, FormData>(
        `/placement-sessions/${sessionId}/speaking/audio-chunk`,
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        },
    );
};