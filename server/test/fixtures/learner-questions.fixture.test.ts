/**
 * BE-05: Test fixtures — verify learner-safe contract and URL safety.
 *
 * Every exported fixture must:
 * 1. Be learner-safe: no isCorrect, correctAnswers, isTrue,
 *    matching answer map, correctText, or explanation.
 * 2. Use safe media URLs without provider credentials.
 * 3. Pass Zod validation when submitted as checkpoint/submission answers.
 *
 * FE can use these fixtures with confidence that they match the API contract.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    saveCheckpointSchema,
    submitLessonSchema,
} from '../../src/validations/learning.validation.js';

import {
    mcQuestion,
    mcQuestionWithAudio,
    mcQuestionWithImage,
    fibQuestion,
    fibQuestionWithAudio,
    tfQuestion,
    tfQuestionWithAudio,
    matchQuestion,
    matchQuestionWithImage,
    ecQuestion,
    ecQuestionWithAudio,
    fullObjectiveExercise,
    mediaRichExercise,
    safeAudioUrl,
    safeImageUrl,
    type MCQFixture,
    type FIBFixture,
    type TFFixture,
    type MatchingFixture,
    type ECFixture,
    type AnyLearnerQuestionFixture,
    type ObjectiveExerciseFixture,
} from './learner-questions.fixture.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Deep-check that an object does NOT contain any forbidden answer-bearing fields.
 */
function assertNoAnswerLeakage(obj: Record<string, unknown>, path: string = ''): void {
    for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;

        // Forbidden answer-bearing field names
        if (
            key === 'isCorrect' ||
            key === 'correctAnswers' ||
            key === 'isTrue' ||
            key === 'correctText' ||
            key === 'explanation' ||
            key === 'correctMapping' ||
            key === 'pairs'
        ) {
            assert.fail(`Answer leakage detected at "${fullPath}": field "${key}" should not be present`);
        }

        // Recurse into nested objects and arrays
        if (value !== null && typeof value === 'object') {
            if (Array.isArray(value)) {
                for (let i = 0; i < value.length; i++) {
                    const item = value[i];
                    if (item !== null && typeof item === 'object') {
                        assertNoAnswerLeakage(item as Record<string, unknown>, `${fullPath}[${i}]`);
                    }
                }
            } else {
                assertNoAnswerLeakage(value as Record<string, unknown>, fullPath);
            }
        }
    }
}

/**
 * Check that a URL does not contain provider credentials.
 * Allowed: standard HTTP/HTTPS URLs without query params containing secrets.
 */
function assertUrlSafe(url: string, label: string): void {
    // Must be a valid URL
    const parsed = new URL(url);

    // Must not contain SAS tokens or provider credentials in query
    const queryParams = parsed.searchParams;
    const credentialKeys = ['sig', 'se', 'sv', 'st', 'spr', 'token', 'access_token', 'api_key', 'key', 'secret'];
    for (const key of credentialKeys) {
        if (queryParams.has(key)) {
            assert.fail(`URL credential leak at "${label}": query parameter "${key}" should not be present in URL: ${url}`);
        }
    }

    // Must not contain credentials in path segments
    const pathLower = parsed.pathname.toLowerCase();
    const suspiciousPatterns = ['sas', 'token=', 'key=', 'secret='];
    for (const pat of suspiciousPatterns) {
        if (pathLower.includes(pat)) {
            assert.fail(`URL suspicious pattern at "${label}": path contains "${pat}" in: ${url}`);
        }
    }
}

/**
 * Collect all string values from an object recursively to find URLs.
 */
function collectStrings(obj: unknown, result: string[] = []): string[] {
    if (typeof obj === 'string') {
        result.push(obj);
    } else if (obj !== null && typeof obj === 'object') {
        if (Array.isArray(obj)) {
            for (const item of obj) {
                collectStrings(item, result);
            }
        } else {
            for (const value of Object.values(obj as Record<string, unknown>)) {
                collectStrings(value, result);
            }
        }
    }
    return result;
}

/**
 * Extract and check all URLs in a fixture for credential safety.
 */
function assertAllUrlsSafe(fixture: Record<string, unknown>, label: string): void {
    const allStrings = collectStrings(fixture);
    const urlStrings = allStrings.filter((s) =>
        typeof s === 'string' && (s.startsWith('http://') || s.startsWith('https://')),
    );

    for (const url of urlStrings) {
        try {
            assertUrlSafe(url, `${label}: ${url.slice(0, 80)}`);
        } catch (e) {
            if (e instanceof assert.AssertionError) throw e;
            // Ignore non-URLs (shouldn't happen since we filter)
        }
    }
}

// ─── Question registry for iteration ────────────────────────────────────────

const allQuestions: Array<{ fixture: AnyLearnerQuestionFixture; name: string }> = [
    { fixture: mcQuestion, name: 'mcQuestion' },
    { fixture: mcQuestionWithAudio, name: 'mcQuestionWithAudio' },
    { fixture: mcQuestionWithImage, name: 'mcQuestionWithImage' },
    { fixture: fibQuestion, name: 'fibQuestion' },
    { fixture: fibQuestionWithAudio, name: 'fibQuestionWithAudio' },
    { fixture: tfQuestion, name: 'tfQuestion' },
    { fixture: tfQuestionWithAudio, name: 'tfQuestionWithAudio' },
    { fixture: matchQuestion, name: 'matchQuestion' },
    { fixture: matchQuestionWithImage, name: 'matchQuestionWithImage' },
    { fixture: ecQuestion, name: 'ecQuestion' },
    { fixture: ecQuestionWithAudio, name: 'ecQuestionWithAudio' },
];

const allExercises: Array<{ fixture: ObjectiveExerciseFixture; name: string }> = [
    { fixture: fullObjectiveExercise, name: 'fullObjectiveExercise' },
    { fixture: mediaRichExercise, name: 'mediaRichExercise' },
];

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('BE-05: Fixture — No Answer Leakage', () => {
    for (const { fixture, name } of allQuestions) {
        it(`${name} has no answer-bearing fields`, () => {
            assertNoAnswerLeakage(fixture as unknown as Record<string, unknown>);
        });
    }

    for (const { fixture, name } of allExercises) {
        it(`${name} has no answer-bearing fields`, () => {
            assertNoAnswerLeakage(fixture as unknown as Record<string, unknown>);
        });
    }
});

describe('BE-05: Fixture — Safe Media URLs', () => {
    for (const { fixture, name } of allQuestions) {
        it(`${name} has safe media URLs`, () => {
            assertAllUrlsSafe(fixture as unknown as Record<string, unknown>, name);
        });
    }

    for (const { fixture, name } of allExercises) {
        it(`${name} has safe media URLs`, () => {
            assertAllUrlsSafe(fixture as unknown as Record<string, unknown>, name);
        });
    }

    it('safeAudioUrl produces credential-free URL', () => {
        const url = safeAudioUrl('test/file.mp3');
        assert.ok(url.startsWith('https://media.unilish.app/audio/'));
        assert.equal(new URL(url).searchParams.toString(), '');
    });

    it('safeImageUrl produces credential-free URL', () => {
        const url = safeImageUrl('test/img.jpg');
        assert.ok(url.startsWith('https://media.unilish.app/images/'));
        assert.equal(new URL(url).searchParams.toString(), '');
    });

    it('assertUrlSafe catches SAS token in URL', () => {
        const badUrl = 'https://storage.blob.core.windows.net/audio.mp3?sig=abc123&se=2026-01-01&sv=2020';
        assert.throws(() => assertUrlSafe(badUrl, 'test'));
    });

    it('assertUrlSafe passes clean URL', () => {
        assertUrlSafe('https://media.unilish.app/audio/test.mp3', 'test');
    });
});

describe('BE-05: Fixture — Correct Type Shapes', () => {
    it('mcQuestion has correct type and options shape', () => {
        assert.equal(mcQuestion.type, 'MULTIPLE_CHOICE');
        assert.ok(Array.isArray(mcQuestion.options));
        assert.equal(mcQuestion.options.length, 4);
        for (const opt of mcQuestion.options) {
            assert.equal(typeof opt.id, 'string');
            assert.equal(typeof opt.text, 'string');
            assert.equal('isCorrect' in opt, false);
        }
    });

    it('fibQuestion has correct type and no options', () => {
        assert.equal(fibQuestion.type, 'FILL_IN_BLANK');
        assert.equal('options' in fibQuestion, false);
        assert.equal('items' in fibQuestion, false);
        assert.equal('targets' in fibQuestion, false);
    });

    it('tfQuestion has correct type', () => {
        assert.equal(tfQuestion.type, 'TRUE_FALSE');
        assert.equal('options' in tfQuestion, false);
    });

    it('matchQuestion has correct type, items, and targets', () => {
        assert.equal(matchQuestion.type, 'MATCHING');
        assert.ok(Array.isArray(matchQuestion.items));
        assert.ok(Array.isArray(matchQuestion.targets));
        assert.equal(matchQuestion.items.length, 3);
        assert.equal(matchQuestion.targets.length, 3);
        // No answer mapping between items and targets
        assert.equal('pairs' in matchQuestion, false);
        assert.equal('correctMapping' in matchQuestion, false);
    });

    it('ecQuestion has correct type and stem.text', () => {
        assert.equal(ecQuestion.type, 'ERROR_CORRECTION');
        assert.equal(typeof ecQuestion.stem.text, 'string');
        assert.ok(ecQuestion.stem.text.length > 0);
        // Must NOT contain correctText
        assert.equal('correctText' in ecQuestion, false);
    });
});

describe('BE-05: Fixture — Objective Exercise Shape', () => {
    it('fullObjectiveExercise has correct kind, mode, passingScore, 5 questions', () => {
        assert.equal(fullObjectiveExercise.kind, 'OBJECTIVE');
        assert.equal(fullObjectiveExercise.mode, 'FIXED');
        assert.equal(fullObjectiveExercise.passingScore, 80);
        assert.equal(fullObjectiveExercise.questions.length, 5);
    });

    it('fullObjectiveExercise contains one question of each type', () => {
        const types = fullObjectiveExercise.questions.map((q) => q.type);
        assert.ok(types.includes('MULTIPLE_CHOICE'));
        assert.ok(types.includes('FILL_IN_BLANK'));
        assert.ok(types.includes('TRUE_FALSE'));
        assert.ok(types.includes('MATCHING'));
        assert.ok(types.includes('ERROR_CORRECTION'));
    });

    it('mediaRichExercise contains media URLs in every question', () => {
        for (const q of mediaRichExercise.questions) {
            if (q.type === 'ERROR_CORRECTION') {
                // EC has stem with text, may have audio
                assert.ok(q.stem.audioUrl || q.stem.imageUrl);
            } else {
                assert.ok(q.stem.audioUrl || q.stem.imageUrl, `${q.type} question should have media`);
            }
        }
    });
});

describe('BE-05: Fixture — Zod Schema Validation', () => {
    const lessonId = '507f1f77bcf86cd799439011';

    it('each question is valid as a checkpoint answer', () => {
        for (const { fixture, name } of allQuestions) {
            const answer = buildCheckpointAnswer(fixture);
            const result = saveCheckpointSchema.safeParse({
                params: { lessonId },
                body: {
                    version: 0,
                    checkpoint: {
                        kind: 'OBJECTIVE',
                        answers: [answer],
                        currentQuestionIndex: 0,
                    },
                    activeSecondsDelta: 0,
                },
            });
            assert.equal(
                result.success,
                true,
                `${name} failed checkpoint validation: ${JSON.stringify(result.error?.format())}`,
            );
        }
    });

    it('each question is valid as a submission answer', () => {
        for (const { fixture, name } of allQuestions) {
            const answer = buildCheckpointAnswer(fixture);
            const result = submitLessonSchema.safeParse({
                params: { lessonId },
                body: {
                    clientAttemptId: '550e8400-e29b-41d4-a716-446655440000',
                    submission: {
                        kind: 'OBJECTIVE',
                        answers: [answer],
                    },
                    durationSeconds: 60,
                },
            });
            assert.equal(
                result.success,
                true,
                `${name} failed submit validation: ${JSON.stringify(result.error?.format())}`,
            );
        }
    });

    it('full exercise with all question types is valid submission', () => {
        const answers = fullObjectiveExercise.questions.map((q) => buildCheckpointAnswer(q));
        const result = submitLessonSchema.safeParse({
            params: { lessonId },
            body: {
                clientAttemptId: '550e8400-e29b-41d4-a716-446655440001',
                submission: {
                    kind: 'OBJECTIVE',
                    answers,
                },
                durationSeconds: 180,
            },
        });
        assert.equal(result.success, true, JSON.stringify(result.error?.format()));
    });
});

// ─── Helper: convert fixture to checkpoint/submission answer ──────────────────

function buildCheckpointAnswer(q: AnyLearnerQuestionFixture): Record<string, unknown> {
    const base = {
        questionId: q.id,
        questionVersion: q.version,
        type: q.type,
    };

    switch (q.type) {
        case 'MULTIPLE_CHOICE':
            return { ...base, answer: { selectedOptionId: q.options[0]?.id ?? '' } };
        case 'FILL_IN_BLANK':
            return { ...base, answer: { text: 'learner answer' } };
        case 'TRUE_FALSE':
            return { ...base, answer: { value: true } };
        case 'MATCHING': {
            const pairs: Record<string, string> = {};
            for (let i = 0; i < q.items.length && i < q.targets.length; i++) {
                pairs[q.items[i]!.id] = q.targets[i]!.id;
            }
            return { ...base, answer: { pairs } };
        }
        case 'ERROR_CORRECTION':
            return { ...base, answer: { text: 'corrected sentence' } };
        default:
            throw new Error(`Unknown type: ${(q as AnyLearnerQuestionFixture).type}`);
    }
}
