export type RuntimeAnswerOption = 'A' | 'B' | 'C' | 'D';
export type RuntimeSkill = 'listening' | 'reading';

export interface RuntimeQuestion {
    questionId: string;
    questionNumber: number;
    part: number;
    skill: RuntimeSkill;
    questionText: string;
    options: Array<{ id: RuntimeAnswerOption; text: string }>;
    groupId?: string;
    imageUrl?: string;
    imageUrls?: string[];
    audioUrl?: string;
}

export interface RuntimePart {
    part: number;
    name: string;
    skill: RuntimeSkill;
    audioUrl?: string;
    questions: RuntimeQuestion[];
}

export interface RuntimeModule {
    order: number;
    type: 'mcq';
    name: string;
    timeLimitMinutes: number;
    parts: RuntimePart[];
}

export interface RuntimeAnswerSheetItem {
    questionId: string;
    selectedOption?: RuntimeAnswerOption | null;
    flagged: boolean;
    answeredAt?: string | Date | null;
}

export interface RuntimeAttempt {
    attemptId: string;
    placementTestId: string;
    language: string;
    status: string;
    startedAt: string;
    expiresAt: string;
    submittedAt?: string | null;
    durationSeconds?: number | null;
    totalQuestions: number;
    modules: RuntimeModule[];
    answerSheet: RuntimeAnswerSheetItem[];
}

export interface ActivePlacementTest {
    _id: string;
    language: string;
    name: string;
    version: number;
    status: string;
}

export interface LocalAnswerState {
    selectedOption: RuntimeAnswerOption | null;
    flagged: boolean;
}
