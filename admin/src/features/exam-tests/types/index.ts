export type ExamFormat = 'toeic_lr' | 'ielts';
export type ExamTestStatus = 'draft' | 'active' | 'paused' | 'archived';
export type ExamScoringFw = 'toeic_score' | 'ielts_band';
export type ExamModuleType = 'listening' | 'reading' | 'writing' | 'speaking';

export interface IExamQuestionItem {
    question: string;
    options: { A: string; B: string; C: string; D: string };
    correctOption: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
    transcript?: string;
    audioUrl?: string;
    imageUrl?: string;
    imageUrls?: string[];
}

export interface IExamPartConfig {
    part: number;
    name: string;
    questionsCount: number;
    poolTag: string;
    manualContent?: {
        questionItems?: IExamQuestionItem[];
        audioUrl?: string;
        groupPattern?: number[];
        rawText?: string;
    };
}

export interface IExamModuleListening {
    type: 'listening';
    name: string;
    timeLimitMinutes: number;
    audioUrl?: string;
    parts: IExamPartConfig[];
}

export interface IExamModuleReading {
    type: 'reading';
    name: string;
    timeLimitMinutes: number;
    parts: IExamPartConfig[];
}

export interface IExamModuleWriting {
    type: 'writing';
    name: string;
    timeLimitMinutes: number;
    tasks: { task: 1 | 2; minWords: number; topics: string[] }[];
}

export interface IExamModuleSpeaking {
    type: 'speaking';
    name: string;
    part1Topics: { text: string; audioKey?: string }[];
    part2CueCards: { text: string; shouldSay?: string[]; audioKey?: string }[];
    part3Topics: { text: string; audioKey?: string }[];
}

export type IExamModule =
    | IExamModuleListening
    | IExamModuleReading
    | IExamModuleWriting
    | IExamModuleSpeaking;

export interface IExamBandThreshold {
    band: string;
    minScore: number;
    maxScore: number;
}

export interface IExamScoringConfig {
    framework: ExamScoringFw;
    bandThresholds: IExamBandThreshold[];
}

export interface IExamTestSettings {
    allowRetake: boolean;
    retakeCooldownDays: number;
    timeLimitOverrideMinutes?: number;
}

export interface IExamTest {
    _id: string;
    name: string;
    format: ExamFormat;
    languageId: string;
    language: string;
    description?: string;
    status: ExamTestStatus;
    version: number;
    modules: IExamModule[];
    scoringConfig: IExamScoringConfig;
    settings: IExamTestSettings;
    createdBy?: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export type IExamTestSummary = Omit<IExamTest, 'modules' | 'scoringConfig'>;

export interface IPaginatedExamTests {
    data: IExamTestSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface IExamTestFilters {
    page?: number;
    limit?: number;
    search?: string;
    format?: ExamFormat;
    status?: ExamTestStatus;
}

export interface ICreateExamTestPayload {
    name: string;
    format: ExamFormat;
    languageId: string;
    language: string;
    description?: string;
    modules?: IExamModule[];
    scoringConfig?: IExamScoringConfig;
    settings?: Partial<IExamTestSettings>;
}

export type IUpdateExamTestPayload = Partial<Omit<ICreateExamTestPayload, 'format'>>;

export interface IUpdateExamStatusPayload {
    status: 'active' | 'paused' | 'archived';
}

export interface IExamWizardStep1 {
    name: string;
    format: ExamFormat;
    languageId: string;
    language: string;
    description?: string;
}

export interface IExamWizardStep2 {
    modules: IExamModule[];
}

export interface IExamWizardStep3 {
    scoringConfig: IExamScoringConfig;
}

export interface IExamWizardStep4 {
    settings: IExamTestSettings;
}

export interface IExamVersionItem {
    _id: string;
    version: number;
    status: ExamTestStatus;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
    updatedBy?: string;
}

export interface IExamAnalyticsSummary {
    totalAttempts?: number;
    completedAttempts?: number;
    dropoutRate?: number;
    avgDurationMinutes?: number;
}
