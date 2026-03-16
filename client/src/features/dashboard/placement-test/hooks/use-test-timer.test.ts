// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTestTimer } from './use-test-timer';

describe('useTestTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-16T10:00:00.000Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts countdown from expiresAt and updates every second', () => {
        const expiresAt = '2026-03-16T10:00:05.000Z';
        const { result } = renderHook(() => useTestTimer(expiresAt));

        expect(result.current).toBe(5);

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current).toBe(3);
    });

    it('returns zero when expiresAt is missing', () => {
        const { result } = renderHook(() => useTestTimer(undefined));
        expect(result.current).toBe(0);
    });

    it('never returns a negative countdown value', () => {
        const expiresAt = '2026-03-16T10:00:01.000Z';
        const { result } = renderHook(() => useTestTimer(expiresAt));

        act(() => {
            vi.advanceTimersByTime(4000);
        });

        expect(result.current).toBe(0);
    });
});
