import { describe, expect, it } from 'vitest';
import { formatCountdownLabel, getAutosaveRetryDelayMs } from './timer';

describe('placement test timer utils', () => {
    it('formats countdown as MM:SS', () => {
        expect(formatCountdownLabel(0)).toBe('00:00');
        expect(formatCountdownLabel(65)).toBe('01:05');
        expect(formatCountdownLabel(3599)).toBe('59:59');
    });

    it('bounds negative seconds to zero', () => {
        expect(formatCountdownLabel(-10)).toBe('00:00');
    });

    it('computes autosave retry delay with upper bound', () => {
        expect(getAutosaveRetryDelayMs(1)).toBe(1500);
        expect(getAutosaveRetryDelayMs(3)).toBe(4500);
        expect(getAutosaveRetryDelayMs(10)).toBe(7500);
    });
});
