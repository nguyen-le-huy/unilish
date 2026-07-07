// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { useIeltsTestDetail } from '../use-ielts-test-detail';
import { IELTS_PRACTICE_KEYS } from '../../constants/query-keys';

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
}));

describe('useIeltsTestDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enables query when slug is provided', () => {
    useIeltsTestDetail('cam-20-listening-1');

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: IELTS_PRACTICE_KEYS.detail('cam-20-listening-1'),
        enabled: true,
        staleTime: 60 * 1000,
      }),
    );
  });

  it('disables query when slug is undefined', () => {
    useIeltsTestDetail(undefined);

    const calls = vi.mocked(useQuery).mock.calls;
    const latestCall = calls[calls.length - 1][0];
    expect(latestCall.enabled).toBe(false);
  });
});
