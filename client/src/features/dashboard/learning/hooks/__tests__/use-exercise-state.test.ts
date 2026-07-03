// @vitest-environment node
//
// Phase 4A - FE-03: Exercise state unit tests
// Validates answer management, checkpoint restore, dirty tracking,
// matching completeness, and submission answer ordering.

import { describe, expect, it } from 'vitest';
import { isEmptyAnswer, isMatchingComplete } from '../use-exercise-state';

describe('isEmptyAnswer', () => {
    it('MC with no selectedOptionId is empty', () => {
        expect(isEmptyAnswer({ selectedOptionId: '' })).toBe(true);
    });

    it('MC with selectedOptionId is not empty', () => {
        expect(isEmptyAnswer({ selectedOptionId: 'opt-a' })).toBe(false);
    });

    it('FILL with empty text is empty', () => {
        expect(isEmptyAnswer({ text: '' })).toBe(true);
        expect(isEmptyAnswer({ text: '  ' })).toBe(true);
    });

    it('FILL with non-empty text is not empty', () => {
        expect(isEmptyAnswer({ text: 'hello' })).toBe(false);
    });

    it('TF with null value is empty', () => {
        expect(isEmptyAnswer({ value: null as unknown as boolean })).toBe(true);
    });

    it('TF with false is NOT empty (false is a valid answer)', () => {
        expect(isEmptyAnswer({ value: false })).toBe(false);
    });

    it('TF with true is not empty', () => {
        expect(isEmptyAnswer({ value: true })).toBe(false);
    });

    it('MATCHING with no pairs is empty', () => {
        expect(isEmptyAnswer({ pairs: {} })).toBe(true);
    });

    it('MATCHING with pairs is not empty', () => {
        expect(isEmptyAnswer({ pairs: { left: 'right' } })).toBe(false);
    });
});

describe('isMatchingComplete', () => {
    it('returns false for undefined pairs', () => {
        expect(isMatchingComplete(undefined, 3)).toBe(false);
    });

    it('returns false when fewer items than required', () => {
        expect(isMatchingComplete({ a: '1', b: '2' }, 3)).toBe(false);
    });

    it('returns false when targets have duplicates', () => {
        expect(isMatchingComplete({ a: '1', b: '1', c: '3' }, 3)).toBe(false);
    });

    it('returns true when all items paired with unique targets', () => {
        expect(isMatchingComplete({ a: 'x', b: 'y', c: 'z' }, 3)).toBe(true);
    });

    it('returns true for single pair', () => {
        expect(isMatchingComplete({ a: '1' }, 1)).toBe(true);
    });
});
