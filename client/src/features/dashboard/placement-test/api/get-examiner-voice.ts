import { api } from '@/lib/axios';
import type { ExaminerVoicePayload } from '../types/speaking.types';

export const getExaminerVoice = async (payload: ExaminerVoicePayload): Promise<Blob> => {
    const blob = await api.get<Blob, Blob>('/speaking/examiner-voice', {
        params: {
            text: payload.text,
            audioKey: payload.audioKey,
        },
        responseType: 'blob',
    });

    return blob;
};