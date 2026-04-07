// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { usePlacementResultQuery } from './use-placement-result-query';
import { getPlacementResult } from '../api/get-placement-result';

vi.mock('@tanstack/react-query', () => ({
    useQuery: vi.fn(),
}));

vi.mock('../api/get-placement-result', () => ({
    getPlacementResult: vi.fn(),
}));

describe('usePlacementResultQuery', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getPlacementResult).mockResolvedValue({
            sessionId: 'session-1',
            cefr: 'B1',
            scores: {
                listening: { rawPercent: 70 },
                reading: { rawPercent: 68 },
                writing: { band: 5.5 },
                speaking: { band: 5.5 },
            },
            status: 'ready',
        });

        vi.mocked(useQuery).mockReturnValue({
            data: undefined,
            isLoading: false,
            isError: false,
        } as unknown as ReturnType<typeof useQuery>);
    });

    it('disables query when sessionId is null', () => {
        renderHook(() => usePlacementResultQuery(null));

        expect(useQuery).toHaveBeenCalledWith(expect.objectContaining({
            enabled: false,
            queryKey: ['placement-test', 'result', null],
        }));
    });

    it('stops polling when result status is ready', async () => {
        renderHook(() => usePlacementResultQuery('session-1'));

        const options = vi.mocked(useQuery).mock.calls[0]?.[0] as unknown as {
            queryFn: () => Promise<unknown>;
            refetchInterval: (query: unknown) => number | false | undefined;
        } | undefined;
        expect(options).toBeTruthy();
        if (!options) {
            throw new Error('Expected query options to be present');
        }

        await options.queryFn();

        const interval = options.refetchInterval({
            state: {
                data: {
                    status: 'ready',
                },
            },
        } as never);

        expect(interval).toBe(false);
    });

    it('continues polling every 5s when result is pending', () => {
        renderHook(() => usePlacementResultQuery('session-1'));

        const options = vi.mocked(useQuery).mock.calls[0]?.[0] as unknown as {
            refetchInterval: (query: unknown) => number | false | undefined;
        } | undefined;
        expect(options).toBeTruthy();
        if (!options) {
            throw new Error('Expected query options to be present');
        }

        const interval = options.refetchInterval({
            state: {
                data: {
                    status: 'pending',
                },
            },
        } as never);

        expect(interval).toBe(5000);
    });
});
