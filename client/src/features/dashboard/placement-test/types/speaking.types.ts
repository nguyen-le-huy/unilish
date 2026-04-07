export interface SpeakingQuestion {
    text: string;
    audioKey?: string;
}

export interface SpeakingCueCard {
    text: string;
    audioKey?: string;
    shouldSay?: string[];
}

export interface StartSpeakingAttemptResult {
    speakingAttemptId: string;
    part1Qs: SpeakingQuestion[];
    cueCard: SpeakingCueCard;
    part3Qs: SpeakingQuestion[];
    config?: {
        ttsVoice?: string;
        gradingModel?: string;
        silenceThresholdSeconds?: number;
    };
}

import type { PronunciationDataPayload } from './azure-speech.types';

export interface UploadAudioChunkPayload {
    speakingAttemptId: string;
    part: 1 | 2 | 3;
    questionIdx: number;
    audioBlob: Blob;
    transcript?: string;
    pronunciationData?: PronunciationDataPayload;
}

export interface UploadAudioChunkResult {
    saved: boolean;
}

export interface SubmitSpeakingAttemptPayload {
    speakingAttemptId: string;
}

export interface SubmitSpeakingAttemptResult {
    jobId?: string;
    status: 'grading' | 'done';
}

export interface ExaminerVoicePayload {
    text: string;
    audioKey?: string;
}