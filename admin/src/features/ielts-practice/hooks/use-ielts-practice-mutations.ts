/* ──────────────────────────────────────────────────────────────
 * useIeltsPracticeMutations — Admin CRUD mutations
 * ────────────────────────────────────────────────────────────── */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { ieltsPracticeApi } from '../api/ielts-practice.api';
import { IELTS_PRACTICE_QUERY_KEYS } from '../constants/query-keys';
import type { IeltsPracticeUpsertBody, UpdateStatusPayload } from '../types';

export const useCreateIeltsPractice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: IeltsPracticeUpsertBody) => ieltsPracticeApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.lists() });
      toast.success('Đã tạo đề IELTS');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Tạo đề IELTS thất bại'));
    },
  });
};

export const useUpdateIeltsPractice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<IeltsPracticeUpsertBody> }) =>
      ieltsPracticeApi.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.lists() });
      toast.success('Đã lưu đề IELTS');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Lưu đề IELTS thất bại'));
    },
  });
};

export const useCreateIeltsPracticeVersion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch?: Partial<IeltsPracticeUpsertBody> }) =>
      ieltsPracticeApi.createVersion(id, patch),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.lists() });
      toast.success('Đã tạo phiên bản nháp mới');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Tạo phiên bản thất bại'));
    },
  });
};

export const useUpdateIeltsPracticeStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateStatusPayload }) =>
      ieltsPracticeApi.updateStatus(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.lists() });
      toast.success('Đã cập nhật trạng thái đề IELTS');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'));
    },
  });
};

export const useDeleteIeltsPractice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ieltsPracticeApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.lists() });
      toast.success('Đã lưu trữ đề IELTS');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Lưu trữ đề IELTS thất bại'));
    },
  });
};

export const useHardDeleteIeltsPractice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ieltsPracticeApi.hardDelete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.lists() });
      toast.success('Đã xoá vĩnh viễn đề IELTS');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Xoá vĩnh viễn đề IELTS thất bại'));
    },
  });
};

export const useRollbackIeltsPractice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      ieltsPracticeApi.rollback(id, version),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: IELTS_PRACTICE_QUERY_KEYS.lists() });
      toast.success('Đã tạo bản rollback nháp');
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Rollback thất bại'));
    },
  });
};

export const useValidateIeltsPracticePublish = () => {
  return useMutation({
    mutationFn: (id: string) => ieltsPracticeApi.validatePublish(id),
  });
};
