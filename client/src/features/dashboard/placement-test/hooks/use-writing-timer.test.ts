// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWritingTimer } from './use-writing-timer';

describe('useWritingTimer', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('counts down while active', () => {
        const onExpire = vi.fn();
        const { result } = renderHook(() => useWritingTimer({
            timeLimitMinutes: 0.05, // 3 seconds
            isActive: true,
            onExpire,
        }));

        expect(result.current.remainingSeconds).toBe(3);

        act(() => {
            vi.advanceTimersByTime(1000);
        });

        expect(result.current.remainingSeconds).toBe(2);
        expect(onExpire).not.toHaveBeenCalled();
    });

    it('triggers expire callback once when timer reaches zero', () => {
        const onExpire = vi.fn();
        const { result } = renderHook(() => useWritingTimer({
            timeLimitMinutes: 0.05, // 3 seconds
            isActive: true,
            onExpire,
        }));

        act(() => {
            vi.advanceTimersByTime(5000);
        });

        expect(result.current.remainingSeconds).toBe(0);
        expect(result.current.hasExpired).toBe(true);
        expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('resets timer when timeLimitMinutes changes', () => {
        const onExpire = vi.fn();
        const { result, rerender } = renderHook(
            ({ timeLimitMinutes }) => useWritingTimer({
                timeLimitMinutes,
                isActive: true,
                onExpire,
            }),
            {
                initialProps: { timeLimitMinutes: 0.05 },
            },
        );

        act(() => {
            vi.advanceTimersByTime(2000);
        });

        expect(result.current.remainingSeconds).toBe(1);

        rerender({ timeLimitMinutes: 0.1 }); // 6 seconds

        expect(result.current.remainingSeconds).toBe(6);
        expect(result.current.hasExpired).toBe(false);
    });
});
