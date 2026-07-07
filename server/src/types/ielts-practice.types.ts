// ─── Enums ───────────────────────────────────────────────────────────────────

export const IeltsSkill = {
    LISTENING: 'listening',
    READING: 'reading',
    WRITING: 'writing',
    SPEAKING: 'speaking',
} as const;

export type IeltsSkill = (typeof IeltsSkill)[keyof typeof IeltsSkill];

export const IeltsQuestionType = {
    FORM_COMPLETION: 'form_completion',
    TRUE_FALSE_NOT_GIVEN: 'true_false_not_given',
    ACADEMIC_TASK_1_CHART: 'academic_task_1_chart',
    AI_CONVERSATION: 'ai_conversation',
} as const;

export type IeltsQuestionType = (typeof IeltsQuestionType)[keyof typeof IeltsQuestionType];

export const ContentStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'archived',
} as const;

export type ContentStatus = (typeof ContentStatus)[keyof typeof ContentStatus];

// ─── Skill → Question Type mapping (MVP) ─────────────────────────────────────

export const SKILL_QUESTION_TYPE_MAP: Record<IeltsSkill, IeltsQuestionType> = {
    [IeltsSkill.LISTENING]: IeltsQuestionType.FORM_COMPLETION,
    [IeltsSkill.READING]: IeltsQuestionType.TRUE_FALSE_NOT_GIVEN,
    [IeltsSkill.WRITING]: IeltsQuestionType.ACADEMIC_TASK_1_CHART,
    [IeltsSkill.SPEAKING]: IeltsQuestionType.AI_CONVERSATION,
};

// ─── Admin Content (with answer keys) ────────────────────────────────────────

export interface ListeningAdminContent {
    instruction: string;
    heading: string;
    audioAssetId: string;
    items: Array<{
        id: string;
        order: number;
        before: string;
        after: string;
        acceptedAnswers: string[];
        caseSensitive?: boolean;
    }>;
}

export interface ReadingAdminContent {
    title: string;
    passage: string[];
    instruction: string;
    statements: Array<{
        id: string;
        order: number;
        text: string;
        correctAnswer: 'TRUE' | 'FALSE' | 'NOT_GIVEN';
        explanation?: string;
    }>;
}

export interface WritingAdminContent {
    prompt: string;
    instruction: string;
    imageAssetId: string;
    imageAlt: string;
    minWords: number;
    gradingRubricVersion?: string;
}

export interface SpeakingAdminContent {
    scenarioTitle: string;
    context: string;
    openingPrompt: string;
    expectedDurationMinutes: number;
    voice: string;
    gradingRubricVersion?: string;
}

export type IeltsPracticeAdminContent =
    | ListeningAdminContent
    | ReadingAdminContent
    | WritingAdminContent
    | SpeakingAdminContent;

// ─── Learner DTOs (redacted — no answer keys) ────────────────────────────────

export interface TestSummaryDto {
    id: string;
    slug: string;
    title: string;
    description?: string;
    skill: IeltsSkill;
    questionType: IeltsQuestionType;
    itemCount: number;
    durationMinutes: number;
    attemptCount: number;
    availability: 'free';
    activeAttemptId?: string;
    learnerStats?: LearnerTestStatsDto;
    publishedAt: string;
}

export interface LearnerAttemptScoreDto {
    attemptId: string;
    status: AttemptStatus | 'graded';
    submittedAt?: string;
    startedAt: string;
    scoreLabel?: string;
    normalizedScore?: number;
    correct?: number;
    total?: number;
    overallBand?: number;
}

export interface LearnerTestStatsDto {
    attemptCount: number;
    completedCount: number;
    latestAttempt?: LearnerAttemptScoreDto;
    scores: LearnerAttemptScoreDto[];
}

export interface BaseTestDetailDto extends TestSummaryDto {
    version: number;
}

export interface ListeningDetailDto extends BaseTestDetailDto {
    skill: 'listening';
    questionType: 'form_completion';
    content: {
        instruction: string;
        heading: string;
        audio: { assetId: string; url: string; durationSeconds: number };
        items: Array<{ id: string; order: number; before: string; after: string }>;
    };
}

export interface ReadingDetailDto extends BaseTestDetailDto {
    skill: 'reading';
    questionType: 'true_false_not_given';
    content: {
        title: string;
        passage: string[];
        instruction: string;
        statements: Array<{ id: string; order: number; text: string }>;
    };
}

export interface WritingDetailDto extends BaseTestDetailDto {
    skill: 'writing';
    questionType: 'academic_task_1_chart';
    content: {
        prompt: string;
        instruction: string;
        image: { assetId: string; url: string; alt: string };
        minWords: number;
    };
}

export interface SpeakingDetailDto extends BaseTestDetailDto {
    skill: 'speaking';
    questionType: 'ai_conversation';
    content: {
        scenarioTitle: string;
        context: string;
        openingPrompt: string;
        expectedDurationMinutes: number;
        voice: string;
    };
}

export type TestDetailDto =
    | ListeningDetailDto
    | ReadingDetailDto
    | WritingDetailDto
    | SpeakingDetailDto;

// ─── Hub summary ─────────────────────────────────────────────────────────────

export interface SkillSummaryDto {
    skill: IeltsSkill;
    activeTests: number;
}

export interface IeltsHubSummaryDto {
    skills: SkillSummaryDto[];
}

// ─── Validation result ───────────────────────────────────────────────────────

export interface PublishValidationError {
    path: string;
    code: string;
    message: string;
}

export interface PublishValidationResult {
    valid: boolean;
    errors: PublishValidationError[];
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface IeltsPracticeAnalyticsDto {
    totalAttempts: number;
    completedAttempts: number;
    completionRate: number;
    averageDurationSeconds: number;
    averageNormalizedScore: number;
    gradingFailed: number;
}

// ─── Attempt DTOs ────────────────────────────────────────────────────────────

export type AttemptStatus = 'in_progress' | 'submitted' | 'expired' | 'abandoned';

export interface AttemptStartResponse {
    attemptId: string;
    testId: string;
    testVersion: number;
    skill: IeltsSkill;
    questionType: IeltsQuestionType;
    status: AttemptStatus | 'graded';
    startedAt: string;
    deadlineAt: string;
    revision: number;
    draft: Record<string, unknown>;
    test: TestDetailDto;
    resumed: boolean;
    submittedAt?: string;
    lastSavedAt?: string;
    result?: GradingResult;
}

export interface AttemptSaveResponse {
    attemptId: string;
    revision: number;
    savedAt: string;
}

export interface AttemptConflictResponse {
    latestRevision: number;
    latestDraft: Record<string, unknown>;
    savedAt: string;
}

export interface AttemptSubmitResponse {
    attemptId: string;
    status: AttemptStatus | 'graded';
    submittedAt: string;
    result?: ObjectiveResult | AiResult;
    grading?: 'not_available';
}

export interface ObjectiveResult {
    gradingType: 'objective';
    correct: number;
    total: number;
    normalizedScore: number;
    itemResults: Array<{ itemId: string; correct: boolean }>;
}

export interface AiResult {
    gradingType: 'ai';
    overallBand: number;
    criteria: {
        taskAchievement: number;
        coherenceCohesion: number;
        lexicalResource: number;
        grammarRangeAccuracy: number;
    };
    strengths: string[];
    improvements: string[];
    detailedFeedback: string;
    correctedEssay: string;
    teacherNotes: string[];
    gradingVersion: string;
}

export type GradingResult = ObjectiveResult | AiResult;

export interface ObjectiveResultDetail {
    itemId: string;
    order: number;
    prompt: string;
    learnerAnswer: string;
    correctAnswers: string[];
    correct: boolean;
    explanation?: string;
}

// ─── Draft shapes ────────────────────────────────────────────────────────────

export interface ListeningDraft {
    answers: Record<string, string>;
    flaggedItemIds?: string[];
}

export interface ReadingDraft {
    answers: Record<string, 'TRUE' | 'FALSE' | 'NOT_GIVEN'>;
    flaggedItemIds?: string[];
}

export interface WritingDraft {
    essay: string;
    wordCount: number;
}

export interface SpeakingDraft {
    transcriptSegments: Array<{
        id: string;
        speaker: 'learner' | 'coach';
        text: string;
        startedAtMs: number;
        endedAtMs?: number;
    }>;
    audioAssetIds: string[];
}
