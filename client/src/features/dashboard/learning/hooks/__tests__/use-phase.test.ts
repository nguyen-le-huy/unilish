// @vitest-environment node
//
// Phase 4A - FE-02: Phase state machine unit tests
// Validates derivePhase pure function and isValidTransition for all
// states defined in the design spec (design-spec.md §3).

import { describe, expect, it } from 'vitest';
import { derivePhase, isValidTransition, phaseLabel } from '../use-phase';
import type { DerivePhaseParams } from '../use-phase';

const baseParams: DerivePhaseParams = {
    isLoading: false,
    isError: false,
    hasLessonData: true,
    exercise: { kind: 'OBJECTIVE', state: 'AVAILABLE', questions: [], passingScore: 80 },
    progressStatus: 'NOT_STARTED',
    hasStarted: false,
    isSubmitting: false,
    submissionResult: null,
    dismissedRestoredResult: false,
    isStale: false,
};

describe('derivePhase', () => {
    it('returns LOADING when isLoading is true', () => {
        expect(derivePhase({ ...baseParams, isLoading: true })).toBe('LOADING');
    });

    it('returns ERROR when isError is true', () => {
        expect(derivePhase({ ...baseParams, isError: true })).toBe('ERROR');
    });

    it('returns ERROR when no lesson data', () => {
        expect(derivePhase({ ...baseParams, hasLessonData: false })).toBe('ERROR');
    });

    it('returns REVIEW for completed lesson not dismissed', () => {
        expect(derivePhase({
            ...baseParams,
            progressStatus: 'COMPLETED',
            dismissedRestoredResult: false,
        })).toBe('REVIEW');
    });

    it('returns READY for completed lesson that has been dismissed and has result', () => {
        expect(derivePhase({
            ...baseParams,
            progressStatus: 'COMPLETED',
            dismissedRestoredResult: true,
            submissionResult: { attemptId: 'restored', score: 100, passed: true, latestScore: 100, bestScore: 100, feedback: null, progress: { lessonStatus: 'COMPLETED', unitStatus: 'COMPLETED', courseStatus: 'ACTIVE', courseProgressPercent: 0 }, nextLessonId: null },
        })).toBe('RESULT');
    });

    it('returns UNAVAILABLE when exercise state is UNAVAILABLE', () => {
        expect(derivePhase({
            ...baseParams,
            exercise: { kind: 'OBJECTIVE', state: 'UNAVAILABLE' },
        })).toBe('UNAVAILABLE');
    });

    it('returns UNAVAILABLE when exercise state is UNSUPPORTED', () => {
        expect(derivePhase({
            ...baseParams,
            exercise: { kind: 'OBJECTIVE', state: 'UNSUPPORTED' },
        })).toBe('UNAVAILABLE');
    });

    it('returns READY when exercise is null (completion lesson)', () => {
        expect(derivePhase({ ...baseParams, exercise: null })).toBe('READY');
    });

    it('returns RESULT when submission result is present', () => {
        expect(derivePhase({
            ...baseParams,
            submissionResult: { attemptId: 'a', score: 80, passed: true, latestScore: 80, bestScore: 80, feedback: null, progress: { lessonStatus: 'COMPLETED', unitStatus: 'COMPLETED', courseStatus: 'ACTIVE', courseProgressPercent: 50 }, nextLessonId: null },
        })).toBe('RESULT');
    });

    it('returns SUBMITTING when isSubmitting is true', () => {
        expect(derivePhase({ ...baseParams, isSubmitting: true })).toBe('SUBMITTING');
    });

    it('returns STALE when isStale is true', () => {
        expect(derivePhase({ ...baseParams, isStale: true })).toBe('STALE');
    });

    it('returns READY when not started', () => {
        expect(derivePhase({ ...baseParams, hasStarted: false })).toBe('READY');
    });

    it('returns ANSWERING when started and exercise available', () => {
        expect(derivePhase({ ...baseParams, hasStarted: true })).toBe('ANSWERING');
    });
});

describe('isValidTransition', () => {
    it('same phase is always valid', () => {
        expect(isValidTransition('READY', 'READY')).toBe(true);
        expect(isValidTransition('ANSWERING', 'ANSWERING')).toBe(true);
        expect(isValidTransition('LOADING', 'LOADING')).toBe(true);
    });

    it('LOADING → READY, REVIEW, UNAVAILABLE, ERROR', () => {
        expect(isValidTransition('LOADING', 'READY')).toBe(true);
        expect(isValidTransition('LOADING', 'REVIEW')).toBe(true);
        expect(isValidTransition('LOADING', 'UNAVAILABLE')).toBe(true);
        expect(isValidTransition('LOADING', 'ERROR')).toBe(true);
    });

    it('READY → ANSWERING', () => {
        expect(isValidTransition('READY', 'ANSWERING')).toBe(true);
        expect(isValidTransition('READY', 'LOADING')).toBe(true);
    });

    it('ANSWERING → SUBMITTING, STALE, READY (back to start)', () => {
        expect(isValidTransition('ANSWERING', 'SUBMITTING')).toBe(true);
        expect(isValidTransition('ANSWERING', 'STALE')).toBe(true);
        expect(isValidTransition('ANSWERING', 'READY')).toBe(true);
    });

    it('SUBMITTING → RESULT, ANSWERING, STALE', () => {
        expect(isValidTransition('SUBMITTING', 'RESULT')).toBe(true);
        expect(isValidTransition('SUBMITTING', 'ANSWERING')).toBe(true);
        expect(isValidTransition('SUBMITTING', 'STALE')).toBe(true);
    });

    it('RESULT → READY', () => {
        expect(isValidTransition('RESULT', 'READY')).toBe(true);
    });

    it('REVIEW → READY', () => {
        expect(isValidTransition('REVIEW', 'READY')).toBe(true);
    });

    it('STALE → LOADING', () => {
        expect(isValidTransition('STALE', 'LOADING')).toBe(true);
    });

    it('UNAVAILABLE → LOADING', () => {
        expect(isValidTransition('UNAVAILABLE', 'LOADING')).toBe(true);
    });

    it('ERROR → LOADING', () => {
        expect(isValidTransition('ERROR', 'LOADING')).toBe(true);
    });

    it('invalid transitions return false', () => {
        expect(isValidTransition('READY', 'SUBMITTING')).toBe(false);
        expect(isValidTransition('LOADING', 'ANSWERING')).toBe(false);
        expect(isValidTransition('RESULT', 'SUBMITTING')).toBe(false);
        expect(isValidTransition('ANSWERING', 'RESULT')).toBe(false); // must go through SUBMITTING
    });
});

describe('phaseLabel', () => {
    it('returns Vietnamese labels for each phase', () => {
        expect(phaseLabel('LOADING')).toBe('Đang tải...');
        expect(phaseLabel('READY')).toBe('Sẵn sàng');
        expect(phaseLabel('ANSWERING')).toBe('Đang làm bài');
        expect(phaseLabel('SUBMITTING')).toBe('Đang chấm bài...');
        expect(phaseLabel('RESULT')).toBe('Kết quả');
        expect(phaseLabel('REVIEW')).toBe('Xem lại');
        expect(phaseLabel('STALE')).toBe('Nội dung đã thay đổi');
        expect(phaseLabel('UNAVAILABLE')).toBe('Không khả dụng');
        expect(phaseLabel('ERROR')).toBe('Lỗi');
    });
});
