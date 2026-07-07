// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { useIeltsSummary } from '../use-ielts-summary';
import { IELTS_PRACTICE_KEYS } from '../../constants/query-keys';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
}));

describe('useIeltsSummary', () => {
  it('calls useQuery with correct key and staleTime', () => {
    useIeltsSummary();

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: IELTS_PRACTICE_KEYS.summary(),
        staleTime: 60 * 1000,
      }),
    );
  });

  it('passes queryFn to fetch summary', () => {
    useIeltsSummary();

    const call = vi.mocked(useQuery).mock.calls[0][0];
    expect(typeof call.queryFn).toBe('function');
  });
});
