/* ──────────────────────────────────────────────────────────────
 * IELTS Practice Admin — Types
 * Based on docs/ielts-practice/api-contract.md v1
 * ────────────────────────────────────────────────────────────── */

// ─── Enums (shared) ──────────────────────────────────────────

export type IeltsSkill = 'listening' | 'reading' | 'writing' | 'speaking';
export type IeltsQuestionType =
  | 'form_completion'
  | 'true_false_not_given'
  | 'academic_task_1_chart'
  | 'ai_conversation';
export type ContentStatus = 'draft' | 'active' | 'paused' | 'archived';

// ─── Mapping ─────────────────────────────────────────────────

export const SKILL_QUESTION_TYPE_MAP: Record<IeltsSkill, IeltsQuestionType> = {
  listening: 'form_completion',
  reading: 'true_false_not_given',
  writing: 'academic_task_1_chart',
  speaking: 'ai_conversation',
};

export const SKILL_LABELS: Record<IeltsSkill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  writing: 'Writing',
  speaking: 'Speaking',
};

export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  archived: 'Archived',
};

export const DEFAULT_DURATION: Record<IeltsSkill, number> = {
  listening: 12,
  reading: 60,
  writing: 20,
  speaking: 15,
};

// ─── Admin Content (with answer key) ─────────────────────────

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

// ─── Upsert Payload ──────────────────────────────────────────

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

// ─── List Item ───────────────────────────────────────────────

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

export interface PaginatedAdminList {
  data: AdminTestListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminTestFilters {
  page?: number;
  limit?: number;
  skill?: IeltsSkill;
  status?: ContentStatus;
  search?: string;
}

// ─── Detail ──────────────────────────────────────────────────

export interface AdminTestDetail extends AdminTestListItem {
  kind: string;
  format: string;
  content: IeltsPracticeAdminContent;
  createdBy?: string;
  createdAt?: string;
  settings?: { allowRetake: boolean; retakeCooldownDays: number };
}

// ─── Publish Validation ──────────────────────────────────────

export interface PublishValidationResult {
  valid: boolean;
  errors: Array<{
    path: string;
    code: string;
    message: string;
  }>;
}

// ─── Version History ─────────────────────────────────────────

export interface VersionHistoryItem {
  _id: string;
  version: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
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

// ─── Status Update ──────────────────────────────────────────

export interface UpdateStatusPayload {
  status: 'active' | 'paused' | 'archived';
}

// ─── Error helpers ──────────────────────────────────────────

export const ERROR_CODES = {
  VERSION_REQUIRED: 'VERSION_REQUIRED',
  DRAFT_VERSION_EXISTS: 'DRAFT_VERSION_EXISTS',
  PUBLISH_VALIDATION_FAILED: 'PUBLISH_VALIDATION_FAILED',
  INVALID_SKILL: 'INVALID_SKILL',
  INVALID_QUESTION_TYPE: 'INVALID_QUESTION_TYPE',
} as const;
