// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { useIeltsTests } from '../use-ielts-tests';
import { IELTS_PRACTICE_KEYS } from '../../constants/query-keys';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

describe('useIeltsTests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls useQuery with correct key including skill filter', () => {
    useIeltsTests({ skill: 'listening', page: 1, limit: 20 });

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: IELTS_PRACTICE_KEYS.list({ skill: 'listening', page: 1, limit: 20 }),
        staleTime: 30 * 1000,
        enabled: true,
      }),
    );
  });

  it('disables query when skill is empty string', () => {
    const querySkill = '' as 'listening';
    useIeltsTests({ skill: querySkill, page: 1 });

    const calls = vi.mocked(useQuery).mock.calls;
    // Use the most recent call
    const latestCall = calls[calls.length - 1][0];
    expect(latestCall.enabled).toBe(false);
  });
});
