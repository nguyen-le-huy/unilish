// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import {
  useAttempt,
  useAttemptResult,
  useStartAttempt,
  useSaveDraft,
  useSubmitAttempt,
  useAbandonAttempt,
} from '../use-ielts-attempt';
import { IELTS_PRACTICE_KEYS } from '../../constants/query-keys';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useMutation: vi.fn(() => ({ mutateAsync: vi.fn(), isPending: false })),
  useQueryClient: vi.fn(() => ({
    setQueryData: vi.fn(),
    invalidateQueries: vi.fn(),
  })),
}));

vi.mock('../../api/ielts-practice.service', () => ({
  fetchAttempt: vi.fn(),
  fetchAttemptResult: vi.fn(),
  startAttempt: vi.fn(),
  saveDraft: vi.fn(),
  submitAttempt: vi.fn(),
  abandonAttempt: vi.fn(),
}));

describe('useAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables query when attemptId is provided', () => {
    useAttempt('attempt-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: IELTS_PRACTICE_KEYS.attempt('attempt-123'),
        enabled: true,
        staleTime: 15 * 1000,
      }),
    );
  });

  it('disables query when attemptId is undefined', () => {
    useAttempt(undefined);

    const calls = vi.mocked(useQuery).mock.calls;
    const latestCall = calls[calls.length - 1][0];
    expect(latestCall.enabled).toBe(false);
  });
});

describe('useAttemptResult', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables query when attemptId is provided', () => {
    useAttemptResult('attempt-123');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: IELTS_PRACTICE_KEYS.result('attempt-123'),
        enabled: true,
      }),
    );
  });
});

describe('mutation hooks', () => {
  it('useStartAttempt is a function', () => {
    expect(typeof useStartAttempt).toBe('function');
  });

  it('useSaveDraft is a function', () => {
    expect(typeof useSaveDraft).toBe('function');
  });

  it('useSubmitAttempt is a function', () => {
    expect(typeof useSubmitAttempt).toBe('function');
  });

  it('useAbandonAttempt is a function', () => {
    expect(typeof useAbandonAttempt).toBe('function');
  });
});
