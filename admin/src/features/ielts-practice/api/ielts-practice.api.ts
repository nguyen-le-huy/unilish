/* ──────────────────────────────────────────────────────────────
 * IELTS Practice Admin — API Service
 * Uses existing /api/exam-tests endpoints (extended per ADR-002)
 * ────────────────────────────────────────────────────────────── */

import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  AdminTestDetail,
  AdminTestFilters,
  PaginatedAdminList,
  IeltsPracticeUpsertBody,
  PublishValidationResult,
  VersionHistoryItem,
  TestAnalytics,
  UpdateStatusPayload,
} from '../types';

const BASE_PATH = '/exam-tests';

type ServerIeltsPracticePayload = Omit<IeltsPracticeUpsertBody, 'title' | 'content'> & {
  name: string;
  content: IeltsPracticeUpsertBody['content'] & {
    questionType: IeltsPracticeUpsertBody['questionType'];
  };
};

type ServerSettings = IeltsPracticeUpsertBody['settings'] & {
  timeLimitOverrideMinutes?: number | null;
};

function normalizeSettings(settings: ServerSettings | undefined): IeltsPracticeUpsertBody['settings'] | undefined {
  if (!settings) return undefined;

  return {
    allowRetake: settings.allowRetake,
    retakeCooldownDays: settings.retakeCooldownDays,
  };
}

function normalizeContent(
  content: IeltsPracticeUpsertBody['content'],
): IeltsPracticeUpsertBody['content'] {
  if ('passage' in content) {
    const passage = content.passage
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    return {
      ...content,
      passage: passage.length > 0 ? passage : [''],
      statements: content.statements.map((statement) => ({
        ...statement,
        text: statement.text.trim(),
        explanation: statement.explanation?.trim() || undefined,
      })),
    };
  }

  return content;
}

// ─── Helpers ─────────────────────────────────────────────────

function serializeFilters(filters: AdminTestFilters): Record<string, unknown> {
  const params: Record<string, unknown> = {
    kind: 'skill_practice',
    format: 'ielts',
  };
  if (filters.page !== undefined) params.page = filters.page;
  if (filters.limit !== undefined) params.limit = filters.limit;
  if (filters.skill) params.skill = filters.skill;
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  return params;
}

function toServerPayload(payload: IeltsPracticeUpsertBody): ServerIeltsPracticePayload {
  const { title, content, questionType, settings: rawSettings, ...rest } = payload;
  const normalizedContent = normalizeContent(content);
  const settings = normalizeSettings(rawSettings as ServerSettings | undefined);

  return {
    ...rest,
    ...(settings ? { settings } : {}),
    name: title,
    questionType,
    content: {
      ...normalizedContent,
      questionType,
    },
  };
}

function toServerPatch(payload: Partial<IeltsPracticeUpsertBody>): Partial<ServerIeltsPracticePayload> {
  const { title, content, questionType, kind: _kind, format: _format, settings: rawSettings, ...rest } = payload;
  const settings = normalizeSettings(rawSettings as ServerSettings | undefined);
  const serverPatch: Partial<ServerIeltsPracticePayload> = {
    ...rest,
    ...(rawSettings !== undefined && settings ? { settings } : {}),
  };

  if (title !== undefined) {
    serverPatch.name = title;
  }
  if (questionType !== undefined) {
    serverPatch.questionType = questionType;
  }
  if (content !== undefined) {
    const normalizedContent = normalizeContent(content);
    serverPatch.content = {
      ...normalizedContent,
      ...(questionType !== undefined ? { questionType } : {}),
    } as ServerIeltsPracticePayload['content'];
  }

  return serverPatch;
}

// ─── API ─────────────────────────────────────────────────────

export const ieltsPracticeApi = {

  // ─── LIST ──────────────────────────────────────────────────

  getAll: async (filters: AdminTestFilters): Promise<PaginatedAdminList> => {
    const response = await apiClient.get<ApiResponse<PaginatedAdminList['data']>>(BASE_PATH, {
      params: serializeFilters(filters),
    });
    const meta = response.data.meta;

    return {
      data: response.data.data,
      total: meta?.total ?? response.data.data.length,
      page: meta?.page ?? filters.page ?? 1,
      limit: meta?.limit ?? filters.limit ?? response.data.data.length,
      totalPages:
        (meta as { totalPages?: number } | undefined)?.totalPages
        ?? meta?.pages
        ?? 1,
    };
  },

  // ─── GET BY ID ─────────────────────────────────────────────

  getById: async (id: string): Promise<AdminTestDetail> => {
    const response = await apiClient.get<ApiResponse<AdminTestDetail>>(`${BASE_PATH}/${id}`);
    return response.data.data;
  },

  // ─── CREATE ────────────────────────────────────────────────

  create: async (payload: IeltsPracticeUpsertBody): Promise<AdminTestDetail> => {
    const response = await apiClient.post<ApiResponse<AdminTestDetail>>(
      BASE_PATH,
      toServerPayload(payload),
    );
    return response.data.data;
  },

  // ─── UPDATE (draft only) ───────────────────────────────────

  update: async (id: string, payload: Partial<IeltsPracticeUpsertBody>): Promise<AdminTestDetail> => {
    const response = await apiClient.put<ApiResponse<AdminTestDetail>>(
      `${BASE_PATH}/${id}`,
      toServerPatch(payload),
    );
    return response.data.data;
  },

  // ─── CREATE VERSION ────────────────────────────────────────

  createVersion: async (id: string, patch?: Partial<IeltsPracticeUpsertBody>): Promise<AdminTestDetail> => {
    const response = await apiClient.post<ApiResponse<AdminTestDetail>>(
      `${BASE_PATH}/${id}/versions`,
      { patch: patch ? toServerPatch(patch) : undefined },
    );
    return response.data.data;
  },

  // ─── VALIDATE PUBLISH ──────────────────────────────────────

  validatePublish: async (id: string): Promise<PublishValidationResult> => {
    const response = await apiClient.post<ApiResponse<PublishValidationResult>>(
      `${BASE_PATH}/${id}/validate-publish`,
    );
    return response.data.data;
  },

  // ─── UPDATE STATUS (publish/pause/archive) ────────────────

  updateStatus: async (id: string, payload: UpdateStatusPayload): Promise<AdminTestDetail> => {
    const response = await apiClient.patch<ApiResponse<AdminTestDetail>>(
      `${BASE_PATH}/${id}/status`,
      payload,
    );
    return response.data.data;
  },

  // ─── SOFT DELETE (archive alias) ──────────────────────────

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${id}`);
  },

  hardDelete: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${id}/hard-delete`);
  },

  // ─── VERSION HISTORY ──────────────────────────────────────

  getVersionHistory: async (id: string): Promise<VersionHistoryItem[]> => {
    const response = await apiClient.get<ApiResponse<VersionHistoryItem[]>>(
      `${BASE_PATH}/${id}/versions`,
    );
    return response.data.data;
  },

  // ─── ROLLBACK ─────────────────────────────────────────────

  rollback: async (id: string, version: number): Promise<AdminTestDetail> => {
    const response = await apiClient.post<ApiResponse<AdminTestDetail>>(
      `${BASE_PATH}/${id}/rollback/${version}`,
    );
    return response.data.data;
  },

  // ─── ANALYTICS ────────────────────────────────────────────

  getAnalytics: async (id: string): Promise<TestAnalytics> => {
    const response = await apiClient.get<ApiResponse<TestAnalytics>>(
      `${BASE_PATH}/${id}/analytics`,
    );
    return response.data.data;
  },
};
