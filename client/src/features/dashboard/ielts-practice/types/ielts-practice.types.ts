/* ──────────────────────────────────────────────────────────────
 * IELTS Practice — Contract types
 * Based on docs/ielts-practice/api-contract.md v1
 * ────────────────────────────────────────────────────────────── */

// ─── Enums ─────────────────────────────────────────────────────

export type IeltsSkill = 'listening' | 'reading' | 'writing' | 'speaking';

export type IeltsQuestionType =
  | 'form_completion'
  | 'true_false_not_given'
  | 'academic_task_1_chart'
  | 'ai_conversation';

export type ContentStatus = 'draft' | 'active' | 'paused' | 'archived';

export type AttemptStatus =
  | 'in_progress'
  | 'submitted'
  | 'pending_grading'
  | 'graded'
  | 'grading_failed'
  | 'expired'
  | 'abandoned';

export type Availability = 'free';

// ─── Pagination ────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Learner Content DTOs (redacted — no answer key) ─────────

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
  availability: Availability;
  activeAttemptId?: string;
  learnerStats?: LearnerTestStats;
  publishedAt: string;
}

export interface LearnerAttemptScore {
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

export interface LearnerTestStats {
  attemptCount: number;
  completedCount: number;
  latestAttempt?: LearnerAttemptScore;
  scores: LearnerAttemptScore[];
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
    minWords: 150;
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

// ─── Hub Summary ───────────────────────────────────────────────

export interface SkillSummary {
  skill: IeltsSkill;
  activeTests: number;
}

export interface IeltsSummaryData {
  skills: SkillSummary[];
}

// ─── Attempt Draft (discriminated by skill) ────────────────────

export type AttemptDraft =
  | { skill: 'listening'; answers: Record<string, string> }
  | { skill: 'reading'; answers: Record<string, 'TRUE' | 'FALSE' | 'NOT_GIVEN'> }
  | { skill: 'writing'; essay: string; wordCount: number }
  | {
      skill: 'speaking';
      transcriptSegments: Array<{
        id: string;
        speaker: 'learner' | 'coach';
        text: string;
        startedAtMs: number;
        endedAtMs?: number;
      }>;
      audioAssetIds: string[];
    };

// ─── Attempt ───────────────────────────────────────────────────

export interface AttemptStartResponse {
  attemptId: string;
  testId: string;
  testVersion: number;
  skill: IeltsSkill;
  questionType?: IeltsQuestionType;
  status: AttemptStatus | 'graded';
  startedAt: string;
  deadlineAt: string;
  revision: number;
  draft: AttemptDraft;
  test: TestDetailDto;
  resumed: boolean;
  submittedAt?: string;
  lastSavedAt?: string;
  result?: GradingResult;
}

export interface AttemptResumeResponse extends AttemptStartResponse {
  resumed: true;
}

export interface DraftSaveResponse {
  attemptId: string;
  revision: number;
  savedAt: string;
}

export interface RevisionConflictData {
  latestRevision: number;
  latestDraft: AttemptDraft;
  savedAt: string;
}

// ─── Objective Result ──────────────────────────────────────────

export interface ObjectiveResult {
  gradingType: 'objective';
  correct: number;
  total: number;
  normalizedScore: number;
  itemResults: Array<{ itemId: string; correct: boolean }>;
  details?: ObjectiveResultDetail[];
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

export interface AttemptResultResponse {
  status: AttemptStatus | 'graded';
  submittedAt?: string;
  result?: GradingResult;
  grading?: 'not_available';
}

export interface SubmitResponse {
  attemptId: string;
  status: AttemptStatus | 'graded';
  submittedAt: string;
  result?: GradingResult;
}

// ─── Admin Content (with answer key) ──────────────────────────

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
  minWords: 150;
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

// ─── Admin Upsert Payload ──────────────────────────────────────

export interface IeltsPracticeUpsertBody {
  kind: 'skill_practice';
  format: 'ielts';
  slug: string;
  title: string;
  description?: string;
  languageId: string;
  language: string;
  skill: IeltsSkill;
  questionType: IeltsQuestionType;
  durationMinutes: number;
  content: IeltsPracticeAdminContent;
  settings?: { allowRetake: boolean; retakeCooldownDays: number };
}

// ─── Admin List Item ───────────────────────────────────────────

export interface AdminTestListItem {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  skill: IeltsSkill;
  questionType: IeltsQuestionType;
  durationMinutes: number;
  status: ContentStatus;
  version: number;
  attemptCount?: number;
  publishedAt?: string;
  updatedAt: string;
  updatedBy?: string;
  languageId: string;
  language: string;
}

// ─── Publish Validation ────────────────────────────────────────

export interface PublishValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    code: string;
    message: string;
  }>;
}

// ─── Analytics ────────────────────────────────────────────────

export interface TestAnalytics {
  totalAttempts: number;
  completedAttempts: number;
  completionRate: number;
  averageDurationSeconds: number;
  averageNormalizedScore: number;
  gradingFailed: number;
}

// ─── ApiError helpers ──────────────────────────────────────────

export interface ApiErrorEnvelope {
  status: 'error';
  code: number;
  message: string;
  errorCode?: string;
  data?: unknown;
}

export const IELTS_SKILL_LABELS: Record<IeltsSkill, { name: string; label: string; icon: string }> = {
  listening: { name: 'Listening', label: 'Nghe', icon: '◖' },
  reading: { name: 'Reading', label: 'Đọc', icon: '▤' },
  writing: { name: 'Writing', label: 'Viết', icon: '✎' },
  speaking: { name: 'Speaking', label: 'Nói', icon: '◉' },
};

export const QUESTION_TYPE_LABELS: Record<IeltsQuestionType, string> = {
  form_completion: 'Form Completion',
  true_false_not_given: 'True / False / Not Given',
  academic_task_1_chart: 'Academic Task 1 – Chart',
  ai_conversation: 'AI Conversation',
};

export const SKILL_QUESTION_TYPE_MAP: Record<IeltsSkill, IeltsQuestionType> = {
  listening: 'form_completion',
  reading: 'true_false_not_given',
  writing: 'academic_task_1_chart',
  speaking: 'ai_conversation',
};

export const DEFAULT_DURATION_MINUTES: Record<IeltsSkill, number> = {
  listening: 12,
  reading: 60,
  writing: 20,
  speaking: 15,
};
