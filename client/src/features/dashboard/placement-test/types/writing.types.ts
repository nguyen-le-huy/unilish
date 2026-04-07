export type WritingLevel = 'low' | 'mid' | 'high';

export interface StartWritingAttemptPayload {
    lrScore: number;
}

export interface StartWritingAttemptResult {
    writingAttemptId: string;
    prompt: string;
    promptImageUrl?: string;
    timeLimitMinutes: number;
    wordLimit: number;
    level: WritingLevel;
}

export interface SubmitWritingAttemptPayload {
    writingAttemptId: string;
    essay: string;
    wordCount: number;
    durationSeconds: number;
}

export interface SubmitWritingAttemptResult {
    jobId?: string;
    status: 'grading' | 'pending' | 'done';
}

export interface WritingFeedback {
    strengths?: string[];
    errors?: string[];
    tips?: string[];
}

export interface WritingResult {
    status: 'grading' | 'pending' | 'done';
    band?: number;
    criteria?: {
        TR?: number;
        CC?: number;
        LR?: number;
        GRA?: number;
    };
    feedback?: WritingFeedback;
}