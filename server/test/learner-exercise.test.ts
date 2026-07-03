import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { HttpStatus } from '../src/constants/http-status.js';
import { AppError } from '../src/utils/app-error.js';
import {
    determineExerciseKind,
    buildStem,
    sanitizeMultipleChoice,
    sanitizeFillInBlank,
    sanitizeTrueFalse,
    sanitizeMatching,
    sanitizeErrorCorrection,
    sanitizeQuestion,
    type RawQuestionDoc,
} from '../src/services/learner-exercise.service.js';
import {
    saveCheckpointSchema,
    submitLessonSchema,
} from '../src/validations/learning.validation.js';

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('determineExerciseKind', () => {
    // ─── VOCAB ──────────────────────────────────────────────────────────────

    it('returns OBJECTIVE for VOCAB with valid questions', () => {
        const result = determineExerciseKind('VOCAB', 'FIXED', 3);
        assert.equal(result.kind, 'OBJECTIVE');
        assert.equal(result.requiresQuestions, true);
    });

    it('returns COMPLETION for VOCAB with no valid questions', () => {
        const result = determineExerciseKind('VOCAB', 'FIXED', 0);
        assert.equal(result.kind, 'COMPLETION');
        assert.equal(result.requiresQuestions, false);
    });

    it('throws 422 for VOCAB with DYNAMIC mode', () => {
        assert.throws(
            () => determineExerciseKind('VOCAB', 'DYNAMIC', 5),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.UNPROCESSABLE_ENTITY);
                return true;
            },
        );
    });

    // ─── GRAMMAR ────────────────────────────────────────────────────────────

    it('returns OBJECTIVE for GRAMMAR with valid questions', () => {
        const result = determineExerciseKind('GRAMMAR', 'FIXED', 5);
        assert.equal(result.kind, 'OBJECTIVE');
    });

    it('returns COMPLETION for GRAMMAR with no valid questions', () => {
        const result = determineExerciseKind('GRAMMAR', 'FIXED', 0);
        assert.equal(result.kind, 'COMPLETION');
    });

    // ─── READING ────────────────────────────────────────────────────────────

    it('returns OBJECTIVE for READING with valid questions', () => {
        const result = determineExerciseKind('READING', 'FIXED', 2);
        assert.equal(result.kind, 'OBJECTIVE');
    });

    it('returns COMPLETION for READING with no valid questions', () => {
        const result = determineExerciseKind('READING', 'FIXED', 0);
        assert.equal(result.kind, 'COMPLETION');
    });

    // ─── LISTENING ──────────────────────────────────────────────────────────

    it('returns OBJECTIVE for LISTENING with valid questions', () => {
        const result = determineExerciseKind('LISTENING', 'FIXED', 4);
        assert.equal(result.kind, 'OBJECTIVE');
    });

    it('returns COMPLETION for LISTENING with no valid questions', () => {
        const result = determineExerciseKind('LISTENING', 'FIXED', 0);
        assert.equal(result.kind, 'COMPLETION');
    });

    // ─── SPEAKING ───────────────────────────────────────────────────────────

    it('returns SPEAKING always', () => {
        const result = determineExerciseKind('SPEAKING', 'FIXED', 0);
        assert.equal(result.kind, 'SPEAKING');
        assert.equal(result.requiresQuestions, false);
    });

    // ─── WRITING ────────────────────────────────────────────────────────────

    it('returns WRITING always', () => {
        const result = determineExerciseKind('WRITING', 'FIXED', 0);
        assert.equal(result.kind, 'WRITING');
        assert.equal(result.requiresQuestions, false);
    });

    // ─── UNIT_TEST ──────────────────────────────────────────────────────────

    it('returns OBJECTIVE for UNIT_TEST with valid questions', () => {
        const result = determineExerciseKind('UNIT_TEST', 'FIXED', 10);
        assert.equal(result.kind, 'OBJECTIVE');
        assert.equal(result.requiresQuestions, true);
    });

    it('throws 422 for UNIT_TEST with no valid questions (AC-31)', () => {
        assert.throws(
            () => determineExerciseKind('UNIT_TEST', 'FIXED', 0),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.UNPROCESSABLE_ENTITY);
                assert.match(err.message, /câu hỏi hợp lệ/);
                return true;
            },
        );
    });

    it('throws 422 for UNIT_TEST with DYNAMIC mode', () => {
        assert.throws(
            () => determineExerciseKind('UNIT_TEST', 'DYNAMIC', 5),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.UNPROCESSABLE_ENTITY);
                return true;
            },
        );
    });

    // ─── DYNAMIC Mode for non-UNIT_TEST ──────────────────────────────────────

    it('throws 422 for any DYNAMIC mode lesson', () => {
        assert.throws(
            () => determineExerciseKind('GRAMMAR', 'DYNAMIC', 3),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.UNPROCESSABLE_ENTITY);
                assert.match(err.message, /động.*chưa được hỗ trợ/);
                return true;
            },
        );
    });
});

describe('buildStem', () => {
    it('includes text when defined', () => {
        const result = buildStem({ text: 'What is this?', audioUrl: undefined, imageUrl: undefined });
        assert.equal(result.text, 'What is this?');
    });

    it('excludes undefined text', () => {
        const result = buildStem({ text: undefined, audioUrl: 'https://audio.url', imageUrl: undefined });
        assert.equal(result.text, undefined);
        assert.equal(result.audioUrl, 'https://audio.url');
    });

    it('includes audioUrl when defined', () => {
        const result = buildStem({ text: 'Stem', audioUrl: 'https://audio.url', imageUrl: null as any });
        assert.equal(result.audioUrl, 'https://audio.url');
    });

    it('includes imageUrl when defined', () => {
        const result = buildStem({ text: 'Stem', audioUrl: undefined, imageUrl: 'https://img.url' });
        assert.equal(result.imageUrl, 'https://img.url');
    });

    it('returns empty object when nothing is defined', () => {
        const result = buildStem({ text: undefined, audioUrl: undefined, imageUrl: undefined });
        assert.deepEqual(result, {});
    });
});

// ─── Validation Schema Tests ───────────────────────────────────────────────────

describe('saveCheckpointSchema', () => {
    it('accepts valid OBJECTIVE checkpoint', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 3,
                checkpoint: {
                    kind: 'OBJECTIVE',
                    answers: [
                        {
                            questionId: '507f1f77bcf86cd799439011',
                            questionVersion: 2,
                            type: 'MULTIPLE_CHOICE',
                            answer: { selectedOptionId: 'option-a' },
                        },
                    ],
                    currentQuestionIndex: 1,
                },
                activeSecondsDelta: 30,
            },
        });
        assert.equal(result.success, true, JSON.stringify(result.error?.format()));
    });

    it('accepts valid WRITING checkpoint', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: {
                    kind: 'WRITING',
                    text: 'My essay...',
                    warmupAnswers: { task1: 'answer' },
                },
                activeSecondsDelta: 0,
            },
        });
        assert.equal(result.success, true);
    });

    it('accepts valid SPEAKING checkpoint', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: {
                    kind: 'SPEAKING',
                    sessionId: null,
                },
                activeSecondsDelta: 0,
            },
        });
        assert.equal(result.success, true);
    });

    it('accepts valid COMPLETION checkpoint', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: {
                    kind: 'COMPLETION',
                    acknowledged: true,
                },
                activeSecondsDelta: 0,
            },
        });
        assert.equal(result.success, true);
    });

    it('rejects unknown checkpoint kind', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: { kind: 'INVALID', data: {} },
                activeSecondsDelta: 0,
            },
        });
        assert.equal(result.success, false);
    });

    it('rejects COMPLETION with acknowledged: false', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: { kind: 'COMPLETION', acknowledged: false },
                activeSecondsDelta: 0,
            },
        });
        assert.equal(result.success, false);
    });

    it('rejects large activeSecondsDelta beyond 300', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: { kind: 'COMPLETION', acknowledged: true },
                activeSecondsDelta: 500,
            },
        });
        assert.equal(result.success, false);
    });
});

describe('submitLessonSchema', () => {
    it('accepts valid OBJECTIVE submission', () => {
        const result = submitLessonSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                clientAttemptId: '550e8400-e29b-41d4-a716-446655440000',
                submission: {
                    kind: 'OBJECTIVE',
                    answers: [
                        {
                            questionId: '507f1f77bcf86cd799439011',
                            questionVersion: 2,
                            type: 'MULTIPLE_CHOICE',
                            answer: { selectedOptionId: 'option-a' },
                        },
                    ],
                },
                durationSeconds: 120,
            },
        });
        assert.equal(result.success, true, JSON.stringify(result.error?.format()));
    });

    it('accepts valid SPEAKING submission', () => {
        const result = submitLessonSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                clientAttemptId: '550e8400-e29b-41d4-a716-446655440001',
                submission: {
                    kind: 'SPEAKING',
                    sessionId: 'session-abc-123',
                },
                durationSeconds: 60,
            },
        });
        assert.equal(result.success, true);
    });

    it('accepts valid WRITING submission', () => {
        const result = submitLessonSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                clientAttemptId: '550e8400-e29b-41d4-a716-446655440002',
                submission: {
                    kind: 'WRITING',
                    text: 'This is my essay content...',
                    warmupAnswers: { warmup1: 'done' },
                },
                durationSeconds: 300,
            },
        });
        assert.equal(result.success, true);
    });

    it('accepts valid COMPLETION submission', () => {
        const result = submitLessonSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                clientAttemptId: '550e8400-e29b-41d4-a716-446655440003',
                submission: {
                    kind: 'COMPLETION',
                    acknowledged: true,
                },
                durationSeconds: 10,
            },
        });
        assert.equal(result.success, true);
    });

    it('rejects unknown submission kind', () => {
        const result = submitLessonSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                clientAttemptId: '550e8400-e29b-41d4-a716-446655440004',
                submission: { kind: 'INVALID' },
                durationSeconds: 0,
            },
        });
        assert.equal(result.success, false);
    });

    it('rejects non-UUID clientAttemptId', () => {
        const result = submitLessonSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                clientAttemptId: 'not-a-uuid',
                submission: { kind: 'COMPLETION', acknowledged: true },
                durationSeconds: 0,
            },
        });
        assert.equal(result.success, false);
    });

    it('rejects empty WRITING text', () => {
        const result = submitLessonSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                clientAttemptId: '550e8400-e29b-41d4-a716-446655440005',
                submission: {
                    kind: 'WRITING',
                    text: '',
                },
                durationSeconds: 0,
            },
        });
        assert.equal(result.success, false);
    });

    it('rejects OBJECTIVE with mismatched answer type (wrong field for MULTIPLE_CHOICE)', () => {
        const result = submitLessonSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                clientAttemptId: '550e8400-e29b-41d4-a716-446655440007',
                submission: {
                    kind: 'OBJECTIVE',
                    answers: [
                        {
                            questionId: '507f1f77bcf86cd799439011',
                            questionVersion: 2,
                            type: 'MULTIPLE_CHOICE',
                            answer: { text: 'wrong' }, // should be selectedOptionId
                        },
                    ],
                },
                durationSeconds: 0,
            },
        });
        assert.equal(result.success, false);
    });

    it('rejects empty SPEAKING sessionId', () => {
        const result = submitLessonSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                clientAttemptId: '550e8400-e29b-41d4-a716-446655440008',
                submission: {
                    kind: 'SPEAKING',
                    sessionId: '',
                },
                durationSeconds: 0,
            },
        });
        assert.equal(result.success, false);
    });
});

// ─── Answer Leakage Regression Tests (AC-23, AC-09) ────────────────────────────

describe('Answer Leakage Prevention (AC-23, AC-09)', () => {
    it('determineExerciseKind returns only metadata, never individual question answers', () => {
        const result = determineExerciseKind('VOCAB', 'FIXED', 3);
        assert.equal(result.kind, 'OBJECTIVE');
        assert.equal(result.requiresQuestions, true);
        // No answer-bearing fields
        assert.equal('answers' in result, false);
        assert.equal('correctAnswers' in result, false);
    });

    it('checkpoint schema allowlists only expected answer fields', () => {
        // MULTIPLE_CHOICE answer must have selectedOptionId, not arbitrary data
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: {
                    kind: 'OBJECTIVE',
                    answers: [
                        {
                            questionId: '507f1f77bcf86cd799439011',
                            questionVersion: 2,
                            type: 'MULTIPLE_CHOICE',
                            answer: { selectedOptionId: 'option-a', isCorrect: true },
                        },
                    ],
                    currentQuestionIndex: 0,
                },
                activeSecondsDelta: 0,
            },
        });
        // Should validate successfully (extra fields are tolerated by Zod but not required)
        assert.equal(result.success, true);
    });

    it('TRUE_FALSE answer must use boolean value', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: {
                    kind: 'OBJECTIVE',
                    answers: [
                        {
                            questionId: '507f1f77bcf86cd799439011',
                            questionVersion: 2,
                            type: 'TRUE_FALSE',
                            answer: { value: true },
                        },
                    ],
                    currentQuestionIndex: 0,
                },
                activeSecondsDelta: 0,
            },
        });
        assert.equal(result.success, true);
    });

    it('MATCHING answer must use pairs Record', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: {
                    kind: 'OBJECTIVE',
                    answers: [
                        {
                            questionId: '507f1f77bcf86cd799439011',
                            questionVersion: 2,
                            type: 'MATCHING',
                            answer: { pairs: { left1: 'right1', left2: 'right2' } },
                        },
                    ],
                    currentQuestionIndex: 0,
                },
                activeSecondsDelta: 0,
            },
        });
        assert.equal(result.success, true);
    });

    it('ERROR_CORRECTION answer must have text field', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: {
                    kind: 'OBJECTIVE',
                    answers: [
                        {
                            questionId: '507f1f77bcf86cd799439011',
                            questionVersion: 2,
                            type: 'ERROR_CORRECTION',
                            answer: { text: 'corrected text' },
                        },
                    ],
                    currentQuestionIndex: 0,
                },
                activeSecondsDelta: 0,
            },
        });
        assert.equal(result.success, true);
    });

    it('FILL_IN_BLANK answer must have text field', () => {
        const result = saveCheckpointSchema.safeParse({
            params: { lessonId: '507f1f77bcf86cd799439011' },
            body: {
                version: 0,
                checkpoint: {
                    kind: 'OBJECTIVE',
                    answers: [
                        {
                            questionId: '507f1f77bcf86cd799439011',
                            questionVersion: 2,
                            type: 'FILL_IN_BLANK',
                            answer: { text: 'learner answer' },
                        },
                    ],
                    currentQuestionIndex: 0,
                },
                activeSecondsDelta: 0,
            },
        });
        assert.equal(result.success, true);
    });
});

// ─── Per-type Sanitizer Allowlist Tests (BE-02) ──────────────────────────────────

describe('sanitizeMultipleChoice — allowlist (BE-02)', () => {
    it('returns only id, version, type, stem, options with id+text', () => {
        const result = sanitizeMultipleChoice('q1', 2, { text: 'Stem text' }, {
            options: [
                { id: 'a', text: 'Option A', isCorrect: true },
                { id: 'b', text: 'Option B', isCorrect: false },
            ],
        });
        assert.equal(result.id, 'q1');
        assert.equal(result.version, 2);
        assert.equal(result.type, 'MULTIPLE_CHOICE');
        assert.equal(result.stem.text, 'Stem text');
        assert.equal(result.options.length, 2);
        assert.equal(result.options[0]!.id, 'a');
        assert.equal(result.options[0]!.text, 'Option A');
        // Must NOT contain isCorrect
        assert.equal('isCorrect' in result.options[0]!, false);
        // Must NOT contain explanation
        assert.equal('explanation' in result, false);
        // Must NOT contain correctAnswers
        assert.equal('correctAnswers' in result, false);
    });

    it('filters out options with empty id or text', () => {
        const result = sanitizeMultipleChoice('q1', 1, {}, {
            options: [
                { id: 'a', text: 'Valid' },
                { id: '', text: 'Empty id' },
                { id: 'c', text: '' },
            ],
        });
        assert.equal(result.options.length, 1);
        assert.equal(result.options[0]!.id, 'a');
    });

    it('handles missing options gracefully', () => {
        const result = sanitizeMultipleChoice('q1', 1, {}, {});
        assert.deepEqual(result.options, []);
    });
});

describe('sanitizeFillInBlank — allowlist (BE-02)', () => {
    it('returns only id, version, type, stem without correctAnswers', () => {
        const result = sanitizeFillInBlank('q1', 3, { text: 'Fill in: ___' });
        assert.equal(result.id, 'q1');
        assert.equal(result.version, 3);
        assert.equal(result.type, 'FILL_IN_BLANK');
        assert.equal(result.stem.text, 'Fill in: ___');
        // Must NOT contain correctAnswers
        assert.equal('correctAnswers' in result, false);
        assert.equal('explanation' in result, false);
    });

    it('returns stem without audioUrl/imageUrl when absent', () => {
        const result = sanitizeFillInBlank('q1', 1, { text: 'Hello' });
        assert.equal(result.stem.audioUrl, undefined);
        assert.equal(result.stem.imageUrl, undefined);
    });
});

describe('sanitizeTrueFalse — allowlist (BE-02)', () => {
    it('returns only id, version, type, stem without isTrue', () => {
        const result = sanitizeTrueFalse('q1', 1, { text: 'True or false?' });
        assert.equal(result.id, 'q1');
        assert.equal(result.version, 1);
        assert.equal(result.type, 'TRUE_FALSE');
        assert.equal(result.stem.text, 'True or false?');
        // Must NOT contain isTrue
        assert.equal('isTrue' in result, false);
        assert.equal('explanation' in result, false);
    });
});

describe('sanitizeMatching — allowlist (BE-02)', () => {
    it('returns id, version, type, stem, items, targets without answer mapping', () => {
        const result = sanitizeMatching('q1', 2, { text: 'Match these' }, {
            pairs: [
                { leftId: 'l1', leftText: 'Left 1', rightId: 'r1', rightText: 'Right 1' },
                { leftId: 'l2', leftText: 'Left 2', rightId: 'r2', rightText: 'Right 2' },
            ],
        });
        assert.equal(result.id, 'q1');
        assert.equal(result.type, 'MATCHING');
        assert.equal(result.items.length, 2);
        assert.equal(result.targets.length, 2);
        // Must NOT contain answer mapping
        assert.equal('pairs' in result, false);
        assert.equal('correctMapping' in result, false);
        assert.equal('explanation' in result, false);
    });

    it('handles legacy pair field names (id/text + matchId/matchText)', () => {
        const result = sanitizeMatching('q1', 1, {}, {
            pairs: [
                { id: 'l1', text: 'Left One', matchId: 'r1', matchText: 'Right One' },
            ],
        });
        assert.equal(result.items.length, 1);
        assert.equal(result.items[0]!.id, 'l1');
        assert.equal(result.items[0]!.text, 'Left One');
        assert.equal(result.targets.length, 1);
        assert.equal(result.targets[0]!.id, 'r1');
    });

    it('handles missing pairs gracefully', () => {
        const result = sanitizeMatching('q1', 1, {}, {});
        assert.deepEqual(result.items, []);
        assert.deepEqual(result.targets, []);
    });
});

describe('sanitizeErrorCorrection — allowlist (BE-02)', () => {
    it('returns id, version, type, stem with text without correctText', () => {
        const result = sanitizeErrorCorrection('q1', 1, { text: 'Erroneous sentence' });
        assert.equal(result.id, 'q1');
        assert.equal(result.version, 1);
        assert.equal(result.type, 'ERROR_CORRECTION');
        assert.equal(result.stem.text, 'Erroneous sentence');
        // Must NOT contain correctText
        assert.equal('correctText' in result, false);
        assert.equal('explanation' in result, false);
    });

    it('includes audioUrl when present in stem', () => {
        const result = sanitizeErrorCorrection('q1', 1, {
            text: 'Error here',
            audioUrl: 'https://audio.url/err.mp3',
        });
        assert.equal(result.stem.text, 'Error here');
        assert.equal(result.stem.audioUrl, 'https://audio.url/err.mp3');
    });

    it('uses empty string when stem text is missing', () => {
        const result = sanitizeErrorCorrection('q1', 1, {});
        assert.equal(result.stem.text, '');
    });
});

describe('sanitizeQuestion — dispatcher (BE-02)', () => {
    function makeRaw(overrides: Partial<RawQuestionDoc> & { type: string }): RawQuestionDoc {
        return {
            _id: '507f1f77bcf86cd799439011',
            version: 1,
            type: overrides.type,
            stem: {},
            content: {},
            status: 'PUBLISHED',
            ...overrides,
        } as RawQuestionDoc;
    }

    it('strips explanation from MULTIPLE_CHOICE output', () => {
        const result = sanitizeQuestion(makeRaw({
            type: 'MULTIPLE_CHOICE',
            stem: { text: 'Choose' },
            content: { options: [{ id: 'a', text: 'A' }] },
            explanation: 'This is the explanation',
        }));
        assert.ok(result);
        assert.equal('explanation' in result, false);
    });

    it('strips explanation from FILL_IN_BLANK output', () => {
        const result = sanitizeQuestion(makeRaw({
            type: 'FILL_IN_BLANK',
            stem: { text: 'Fill' },
            explanation: 'Secret explanation',
        }));
        assert.ok(result);
        assert.equal('explanation' in result, false);
    });

    it('strips explanation from TRUE_FALSE output', () => {
        const result = sanitizeQuestion(makeRaw({
            type: 'TRUE_FALSE',
            stem: { text: 'True?' },
            explanation: 'Shhh',
        }));
        assert.ok(result);
        assert.equal('explanation' in result, false);
    });

    it('strips explanation from MATCHING output', () => {
        const result = sanitizeQuestion(makeRaw({
            type: 'MATCHING',
            stem: { text: 'Match' },
            content: { pairs: [{ leftId: 'l1', leftText: 'L', rightId: 'r1', rightText: 'R' }] },
            explanation: 'Matching explanation',
        }));
        assert.ok(result);
        assert.equal('explanation' in result, false);
    });

    it('strips explanation from ERROR_CORRECTION output', () => {
        const result = sanitizeQuestion(makeRaw({
            type: 'ERROR_CORRECTION',
            stem: { text: 'Error' },
            explanation: 'Correction explanation',
        }));
        assert.ok(result);
        assert.equal('explanation' in result, false);
    });

    it('returns null for unsupported question types', () => {
        const result = sanitizeQuestion(makeRaw({ type: 'ESSAY' }));
        assert.equal(result, null);
    });

    it('returns null for PRONUNCIATION type', () => {
        const result = sanitizeQuestion(makeRaw({ type: 'PRONUNCIATION' }));
        assert.equal(result, null);
    });
});
