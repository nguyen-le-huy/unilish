/* ──────────────────────────────────────────────────────────────
 * IELTS Practice — Learner API Service
 * Based on docs/ielts-practice/api-contract.md v1
 * ────────────────────────────────────────────────────────────── */

import {
  api,
  apiGetUnwrappedEnvelope,
  apiPostUnwrappedEnvelope,
  apiPatchUnwrappedEnvelope,
} from '@/lib/axios';
import type {
  SkillSummary,
  TestSummaryDto,
  PaginationMeta,
  TestDetailDto,
  AttemptStartResponse,
  DraftSaveResponse,
  SubmitResponse,
  AttemptResultResponse,
  IeltsSkill,
} from '../types/ielts-practice.types';

const BASE = '/ielts-practice';

// ─── GET /api/ielts-practice/summary ──────────────────────────

export interface SummaryResponse {
  skills: SkillSummary[];
}

export const fetchSummary = async (): Promise<SummaryResponse> => {
  return apiGetUnwrappedEnvelope<SummaryResponse>(`${BASE}/summary`);
};

// ─── GET /api/ielts-practice/tests ─────────────────────────────

export interface TestListQuery {
  skill: IeltsSkill;
  page?: number;
  limit?: number;
  search?: string;
}

export interface TestListResponse {
  data: TestSummaryDto[];
  meta: PaginationMeta;
}

interface ApiEnvelope<T> {
  status: string;
  code: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export const fetchTests = async (query: TestListQuery): Promise<TestListResponse> => {
  const params = new URLSearchParams();
  params.set('skill', query.skill);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.search) params.set('search', query.search);

  const response = await api.get<ApiEnvelope<TestSummaryDto[]>, ApiEnvelope<TestSummaryDto[]>>(
    `${BASE}/tests?${params.toString()}`,
  );

  return {
    data: response.data,
    meta: response.meta ?? {
      page: query.page ?? 1,
      limit: query.limit ?? response.data.length,
      total: response.data.length,
      totalPages: 1,
    },
  };
};

// ─── GET /api/ielts-practice/tests/:slug ───────────────────────

export const fetchTestDetail = async (slug: string): Promise<TestDetailDto> => {
  return apiGetUnwrappedEnvelope<TestDetailDto>(`${BASE}/tests/${encodeURIComponent(slug)}`);
};

// ─── POST /api/ielts-practice/tests/:testId/attempts ──────────

export interface StartAttemptPayload {
  clientStartedAt: string;
}

export const startAttempt = async (
  testId: string,
  payload: StartAttemptPayload,
  idempotencyKey: string,
): Promise<AttemptStartResponse> => {
  return apiPostUnwrappedEnvelope<AttemptStartResponse, StartAttemptPayload>(
    `${BASE}/tests/${encodeURIComponent(testId)}/attempts`,
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
};

// ─── GET /api/ielts-practice/attempts/:attemptId ───────────────

export const fetchAttempt = async (attemptId: string): Promise<AttemptStartResponse> => {
  return apiGetUnwrappedEnvelope<AttemptStartResponse>(
    `${BASE}/attempts/${encodeURIComponent(attemptId)}`,
  );
};

// ─── PATCH /api/ielts-practice/attempts/:attemptId/draft ──────

export interface SaveDraftPayload {
  skill: IeltsSkill;
  revision: number;
  answers?: Record<string, string>;
  flaggedItemIds?: string[];
  essay?: string;
  transcriptSegments?: Array<{
    id: string;
    speaker: 'learner' | 'coach';
    text: string;
    startedAtMs: number;
    endedAtMs?: number;
  }>;
  audioAssetIds?: string[];
}

export const saveDraft = async (
  attemptId: string,
  payload: SaveDraftPayload,
): Promise<DraftSaveResponse> => {
  return apiPatchUnwrappedEnvelope<DraftSaveResponse, SaveDraftPayload>(
    `${BASE}/attempts/${encodeURIComponent(attemptId)}/draft`,
    payload,
  );
};

// ─── POST /api/ielts-practice/attempts/:attemptId/submit ──────

export interface SubmitPayload {
  revision: number;
}

export const submitAttempt = async (
  attemptId: string,
  payload: SubmitPayload,
  idempotencyKey: string,
): Promise<SubmitResponse> => {
  return apiPostUnwrappedEnvelope<SubmitResponse, SubmitPayload>(
    `${BASE}/attempts/${encodeURIComponent(attemptId)}/submit`,
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
};

// ─── GET /api/ielts-practice/attempts/:attemptId/result ───────

export const fetchAttemptResult = async (attemptId: string): Promise<AttemptResultResponse> => {
  return apiGetUnwrappedEnvelope<AttemptResultResponse>(
    `${BASE}/attempts/${encodeURIComponent(attemptId)}/result`,
  );
};

// ─── POST /api/ielts-practice/attempts/:attemptId/abandon ─────

export const abandonAttempt = async (
  attemptId: string,
  idempotencyKey: string,
): Promise<void> => {
  await apiPostUnwrappedEnvelope<unknown, unknown>(
    `${BASE}/attempts/${encodeURIComponent(attemptId)}/abandon`,
    undefined,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
};
