import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    startAttemptSchema,
    getAttemptSchema,
    saveDraftSchema,
    submitAttemptSchema,
    abandonAttemptSchema,
} from '../src/validations/ielts-attempt.validation.js';

const VALID_ID = '507f1f77bcf86cd799439011';

// ─── Start attempt ───────────────────────────────────────────────────────────

describe('startAttemptSchema', () => {
    it('accepts valid params and body', () => {
        const result = startAttemptSchema.safeParse({
            params: { testId: VALID_ID },
            body: { clientStartedAt: '2026-07-06T04:00:00.000Z' },
        });
        assert.equal(result.success, true);
    });

    it('accepts empty body', () => {
        const result = startAttemptSchema.safeParse({
            params: { testId: VALID_ID },
            body: {},
        });
        assert.equal(result.success, true);
    });

    it('rejects invalid testId', () => {
        const result = startAttemptSchema.safeParse({
            params: { testId: 'invalid-id' },
            body: {},
        });
        assert.equal(result.success, false);
    });

    it('rejects missing testId', () => {
        const result = startAttemptSchema.safeParse({
            params: {},
            body: {},
        });
        assert.equal(result.success, false);
    });
});

// ─── Get attempt ─────────────────────────────────────────────────────────────

describe('getAttemptSchema', () => {
    it('accepts valid attemptId', () => {
        const result = getAttemptSchema.safeParse({
            params: { attemptId: VALID_ID },
        });
        assert.equal(result.success, true);
    });

    it('rejects invalid attemptId', () => {
        const result = getAttemptSchema.safeParse({
            params: { attemptId: 'bad' },
        });
        assert.equal(result.success, false);
    });
});

// ─── Save draft ──────────────────────────────────────────────────────────────

describe('saveDraftSchema', () => {
    it('accepts listening draft', () => {
        const result = saveDraftSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: {
                skill: 'listening',
                revision: 3,
                answers: { 'l-01': 'sky', 'l-02': 'blue' },
                flaggedItemIds: ['l-02'],
            },
        });
        assert.equal(result.success, true);
    });

    it('accepts reading draft', () => {
        const result = saveDraftSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: {
                skill: 'reading',
                revision: 2,
                answers: { 'r-01': 'TRUE', 'r-02': 'FALSE' },
            },
        });
        assert.equal(result.success, true);
    });

    it('rejects reading draft with invalid answer value', () => {
        const result = saveDraftSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: {
                skill: 'reading',
                revision: 1,
                answers: { 'r-01': 'INVALID' },
            },
        });
        assert.equal(result.success, false);
    });

    it('accepts writing draft', () => {
        const result = saveDraftSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: {
                skill: 'writing',
                revision: 2,
                essay: 'The chart compares...',
            },
        });
        assert.equal(result.success, true);
    });

    it('accepts speaking draft', () => {
        const result = saveDraftSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: {
                skill: 'speaking',
                revision: 1,
                transcriptSegments: [
                    { id: 'seg-1', speaker: 'learner', text: 'Hello', startedAtMs: 100 },
                ],
                audioAssetIds: ['audio-123'],
            },
        });
        assert.equal(result.success, true);
    });

    it('rejects unknown skill', () => {
        const result = saveDraftSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: {
                skill: 'unknown_skill',
                revision: 1,
            },
        });
        assert.equal(result.success, false);
    });

    it('rejects negative revision', () => {
        const result = saveDraftSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: {
                skill: 'listening',
                revision: -1,
            },
        });
        assert.equal(result.success, false);
    });
});

// ─── Submit attempt ──────────────────────────────────────────────────────────

describe('submitAttemptSchema', () => {
    it('accepts valid submit body', () => {
        const result = submitAttemptSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: { revision: 5 },
        });
        assert.equal(result.success, true);
    });

    it('rejects missing revision', () => {
        const result = submitAttemptSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: {},
        });
        assert.equal(result.success, false);
    });
});

// ─── Abandon attempt ─────────────────────────────────────────────────────────

describe('abandonAttemptSchema', () => {
    it('accepts valid abandon body', () => {
        const result = abandonAttemptSchema.safeParse({
            params: { attemptId: VALID_ID },
            body: {},
        });
        assert.equal(result.success, true);
    });
});
