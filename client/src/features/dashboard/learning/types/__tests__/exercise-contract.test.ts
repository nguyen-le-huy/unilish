// @vitest-environment node
//
// Phase 4A - FE-07: Contract fixture tests
// Validates that all exercise DTO types and the adapter handle:
// - All exercise kinds (OBJECTIVE, SPEAKING, WRITING, COMPLETION)
// - All five objective question types
// - No answer-bearing fields in pre-submit DTOs (NFR-04)
// - Unavailable/unsupported exercise states

import { describe, expect, it } from 'vitest';
import type {
    LearnerLessonDto,
    LearnerExerciseDto,
    LearnerPracticeQuestionDto,
    ObjectiveAnswer,
    LessonSubmissionKind,
} from '../learning.types';
import { adaptLessonToProps } from '../../components/renderers/renderer.types';

// ─── Fixture builders ─────────────────────────────────────────────────────────

function makeLesson(overrides?: Partial<LearnerLessonDto['lesson']>): LearnerLessonDto {
    return {
        course: { id: 'course-1', slug: 'test-course', name: 'Test Course' },
        unit: { id: 'unit-1', title: 'Unit 1', orderIndex: 1 },
        lesson: {
            id: 'lesson-1',
            title: 'Test Lesson',
            type: 'GRAMMAR',
            orderIndex: 1,
            content: { type: 'GRAMMAR' as const, conceptName: 'Test', hero: { hook: '', contextSentences: [] }, blocks: [], summaryTable: { columns: ['a', 'b', 'c'], rows: [] }, taughtConcepts: [] },
            passingScore: null,
            exercise: { kind: 'COMPLETION' },
            ...overrides,
        },
        progress: { status: 'NOT_STARTED', checkpoint: null, checkpointVersion: 0, bestScore: null },
        navigation: { previousLessonId: null, nextLessonId: null },
    };
}

function makeMCQuestion(overrides?: Partial<LearnerPracticeQuestionDto & { id: string; version: number }>): LearnerPracticeQuestionDto {
    return {
        id: 'q-mc-1',
        version: 1,
        type: 'MULTIPLE_CHOICE',
        stem: { text: 'Choose the correct answer' },
        options: [
            { id: 'opt-a', text: 'Option A' },
            { id: 'opt-b', text: 'Option B' },
        ],
        ...overrides,
    } as LearnerPracticeQuestionDto;
}

function makeFillQuestion(overrides?: Partial<LearnerPracticeQuestionDto & { id: string; version: number }>): LearnerPracticeQuestionDto {
    return {
        id: 'q-fill-1',
        version: 2,
        type: 'FILL_IN_BLANK',
        stem: { text: 'Fill in: ___' },
        ...overrides,
    } as LearnerPracticeQuestionDto;
}

function makeTFQuestion(overrides?: Partial<LearnerPracticeQuestionDto & { id: string; version: number }>): LearnerPracticeQuestionDto {
    return {
        id: 'q-tf-1',
        version: 1,
        type: 'TRUE_FALSE',
        stem: { text: 'The sun rises in the east.' },
        ...overrides,
    } as LearnerPracticeQuestionDto;
}

function makeMatchingQuestion(overrides?: Partial<LearnerPracticeQuestionDto & { id: string; version: number }>): LearnerPracticeQuestionDto {
    return {
        id: 'q-match-1',
        version: 3,
        type: 'MATCHING',
        stem: { text: 'Match the pairs' },
        items: [
            { id: 'left-1', text: 'Hello' },
            { id: 'left-2', text: 'Goodbye' },
        ],
        targets: [
            { id: 'right-1', text: 'Xin chào' },
            { id: 'right-2', text: 'Tạm biệt' },
        ],
        ...overrides,
    } as LearnerPracticeQuestionDto;
}

function makeECQuestion(overrides?: Partial<LearnerPracticeQuestionDto & { id: string; version: number }>): LearnerPracticeQuestionDto {
    return {
        id: 'q-ec-1',
        version: 1,
        type: 'ERROR_CORRECTION',
        stem: { text: 'He go to school yesterday.' },
        ...overrides,
    } as LearnerPracticeQuestionDto;
}

// ─── Exercise Kind Tests ─────────────────────────────────────────────────────

describe('LearnerExerciseDto discriminated union', () => {
    describe('OBJECTIVE kind', () => {
        const exercise: LearnerExerciseDto = {
            kind: 'OBJECTIVE',
            mode: 'FIXED',
            passingScore: 80,
            questions: [makeMCQuestion()],
        };

        it('discriminates as OBJECTIVE', () => {
            expect(exercise.kind).toBe('OBJECTIVE');
        });

        it('has FIXED mode', () => {
            if (exercise.kind === 'OBJECTIVE') {
                expect(exercise.mode).toBe('FIXED');
            }
        });

        it('carries passingScore and questions', () => {
            if (exercise.kind === 'OBJECTIVE') {
                expect(exercise.passingScore).toBe(80);
                expect(exercise.questions).toHaveLength(1);
            }
        });

        it('has no answer-bearing fields pre-submit (NFR-04)', () => {
            if (exercise.kind === 'OBJECTIVE') {
                for (const q of exercise.questions) {
                    expect(q).not.toHaveProperty('explanation');
                    expect(q).not.toHaveProperty('isCorrect');
                    expect(q).not.toHaveProperty('correctAnswers');
                    expect(q).not.toHaveProperty('correctText');
                }
            }
        });
    });

    describe('SPEAKING kind', () => {
        const exercise: LearnerExerciseDto = {
            kind: 'SPEAKING',
            sessionRequired: true,
        };

        it('discriminates as SPEAKING', () => {
            expect(exercise.kind).toBe('SPEAKING');
        });

        it('has sessionRequired', () => {
            if (exercise.kind === 'SPEAKING') {
                expect(exercise.sessionRequired).toBe(true);
            }
        });
    });

    describe('WRITING kind', () => {
        const exercise: LearnerExerciseDto = {
            kind: 'WRITING',
            minWords: 50,
            maxWords: 200,
        };

        it('discriminates as WRITING', () => {
            expect(exercise.kind).toBe('WRITING');
        });

        it('carries word count boundaries', () => {
            if (exercise.kind === 'WRITING') {
                expect(exercise.minWords).toBe(50);
                expect(exercise.maxWords).toBe(200);
            }
        });
    });

    describe('COMPLETION kind', () => {
        const exercise: LearnerExerciseDto = { kind: 'COMPLETION' };

        it('discriminates as COMPLETION', () => {
            expect(exercise.kind).toBe('COMPLETION');
        });
    });
});

// ─── Objective Question Type Tests ───────────────────────────────────────────

describe('LearnerPracticeQuestionDto question types', () => {
    it('MULTIPLE_CHOICE has id, version, stem, and options', () => {
        const q = makeMCQuestion();
        expect(q.type).toBe('MULTIPLE_CHOICE');
        if (q.type === 'MULTIPLE_CHOICE') {
            expect(q.id).toBe('q-mc-1');
            expect(q.version).toBe(1);
            expect(q.stem.text).toBe('Choose the correct answer');
            expect(q.options).toHaveLength(2);
            expect(q.options[0]).toHaveProperty('id');
            expect(q.options[0]).toHaveProperty('text');
        }
    });

    it('MULTIPLE_CHOICE has no answer-bearing fields', () => {
        const q = makeMCQuestion();
        expect(q).not.toHaveProperty('isCorrect');
        expect(q).not.toHaveProperty('explanation');
    });

    it('FILL_IN_BLANK has id, version, and stem', () => {
        const q = makeFillQuestion();
        expect(q.type).toBe('FILL_IN_BLANK');
        if (q.type === 'FILL_IN_BLANK') {
            expect(q.id).toBe('q-fill-1');
            expect(q.version).toBe(2);
            expect(q.stem.text).toBe('Fill in: ___');
        }
    });

    it('FILL_IN_BLANK has no answer-bearing fields', () => {
        const q = makeFillQuestion();
        expect(q).not.toHaveProperty('correctAnswers');
        expect(q).not.toHaveProperty('explanation');
    });

    it('TRUE_FALSE has id, version, and stem', () => {
        const q = makeTFQuestion();
        expect(q.type).toBe('TRUE_FALSE');
        if (q.type === 'TRUE_FALSE') {
            expect(q.id).toBe('q-tf-1');
            expect(q.version).toBe(1);
            expect(q.stem.text).toBe('The sun rises in the east.');
        }
    });

    it('TRUE_FALSE has no answer-bearing fields', () => {
        const q = makeTFQuestion();
        expect(q).not.toHaveProperty('isTrue');
        expect(q).not.toHaveProperty('correctAnswer');
        expect(q).not.toHaveProperty('explanation');
    });

    it('MATCHING has id, version, stem, items, and targets', () => {
        const q = makeMatchingQuestion();
        expect(q.type).toBe('MATCHING');
        if (q.type === 'MATCHING') {
            expect(q.id).toBe('q-match-1');
            expect(q.version).toBe(3);
            expect(q.items).toHaveLength(2);
            expect(q.targets).toHaveLength(2);
        }
    });

    it('MATCHING has no answer-bearing fields', () => {
        const q = makeMatchingQuestion();
        expect(q).not.toHaveProperty('correctMapping');
        expect(q).not.toHaveProperty('explanation');
    });

    it('ERROR_CORRECTION has id, version, and stem with text', () => {
        const q = makeECQuestion();
        expect(q.type).toBe('ERROR_CORRECTION');
        if (q.type === 'ERROR_CORRECTION') {
            expect(q.id).toBe('q-ec-1');
            expect(q.version).toBe(1);
            expect(q.stem.text).toBe('He go to school yesterday.');
        }
    });

    it('ERROR_CORRECTION has no answer-bearing fields', () => {
        const q = makeECQuestion();
        expect(q).not.toHaveProperty('correctText');
        expect(q).not.toHaveProperty('explanation');
    });
});

// ─── Adapter Tests ───────────────────────────────────────────────────────────

describe('adaptLessonToProps', () => {
    it('returns AVAILABLE exercise for OBJECTIVE with valid questions', () => {
        const lesson = makeLesson({
            passingScore: 80,
            exercise: {
                kind: 'OBJECTIVE',
                mode: 'FIXED',
                passingScore: 80,
                questions: [makeMCQuestion(), makeFillQuestion()],
            },
        });

        const { content, exercise } = adaptLessonToProps(lesson);
        expect(content).not.toBeNull();
        expect(exercise).not.toBeNull();
        expect(exercise?.state).toBe('AVAILABLE');
        expect(exercise?.kind).toBe('OBJECTIVE');
        expect(exercise?.questions).toHaveLength(2);
        expect(exercise?.passingScore).toBe(80);
    });

    it('returns null exercise for COMPLETION kind', () => {
        const lesson = makeLesson({
            exercise: { kind: 'COMPLETION' },
        });

        const { content, exercise } = adaptLessonToProps(lesson);
        expect(content).not.toBeNull();
        expect(exercise).toBeNull();
    });

    it('returns UNAVAILABLE for UNIT_TEST with no valid questions', () => {
        const lesson = makeLesson({
            type: 'UNIT_TEST',
            content: { type: 'UNIT_TEST', questions: [] },
            exercise: {
                kind: 'OBJECTIVE',
                mode: 'FIXED',
                passingScore: 60,
                questions: [],
            },
        });

        const { content, exercise } = adaptLessonToProps(lesson);
        expect(content).not.toBeNull();
        expect(exercise).not.toBeNull();
        expect(exercise?.state).toBe('UNAVAILABLE');
    });

    it('returns null exercise for content Lesson with no valid questions', () => {
        const lesson = makeLesson({
            type: 'VOCAB',
            content: {
                type: 'VOCAB' as const,
                scenario: 'Test',
                items: [],
            },
            exercise: {
                kind: 'OBJECTIVE',
                mode: 'FIXED',
                passingScore: 60,
                questions: [],
            },
        });

        const { content, exercise } = adaptLessonToProps(lesson);
        expect(content).not.toBeNull();
        // Content lesson with no questions → no exercise section needed
        expect(exercise).toBeNull();
    });

    it('returns UNSUPPORTED for non-FIXED mode', () => {
        const lesson = makeLesson({
            exercise: {
                kind: 'OBJECTIVE',
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                mode: 'DYNAMIC' as any,
                passingScore: 60,
                questions: [],
            } as LearnerExerciseDto,
        });

        const { content, exercise } = adaptLessonToProps(lesson);
        expect(content).not.toBeNull();
        expect(exercise).not.toBeNull();
        expect(exercise?.state).toBe('UNSUPPORTED');
    });

    it('returns AVAILABLE for SPEAKING exercise', () => {
        const lesson = makeLesson({
            exercise: { kind: 'SPEAKING', sessionRequired: true },
        });

        const { content, exercise } = adaptLessonToProps(lesson);
        expect(content).not.toBeNull();
        expect(exercise).not.toBeNull();
        expect(exercise?.state).toBe('AVAILABLE');
        expect(exercise?.kind).toBe('SPEAKING');
    });

    it('returns AVAILABLE for WRITING exercise with word counts', () => {
        const lesson = makeLesson({
            exercise: { kind: 'WRITING', minWords: 50, maxWords: 200 },
        });

        const { content, exercise } = adaptLessonToProps(lesson);
        expect(content).not.toBeNull();
        expect(exercise).not.toBeNull();
        expect(exercise?.state).toBe('AVAILABLE');
        expect(exercise?.kind).toBe('WRITING');
        expect(exercise?.minWords).toBe(50);
        expect(exercise?.maxWords).toBe(200);
    });

    it('handles null content gracefully', () => {
        const lesson = makeLesson({
            content: undefined as unknown as Record<string, unknown>,
            exercise: { kind: 'COMPLETION' },
        });

        const { content, exercise } = adaptLessonToProps(lesson);
        // Content-less Lesson with completion exercise: no content, no practice needed
        if (content !== undefined) {
            expect(content).toBeNull();
        }
        expect(exercise).toBeNull();
    });

    it('preserves content when exercise is unavailable', () => {
        const lesson = makeLesson({
            type: 'UNIT_TEST',
            content: { type: 'UNIT_TEST', questions: [] },
            exercise: {
                kind: 'OBJECTIVE',
                mode: 'FIXED',
                passingScore: 60,
                questions: [],
            },
        });

        const { content } = adaptLessonToProps(lesson);
        expect(content).not.toBeNull();
        expect(content?.type).toBe('UNIT_TEST');
    });
});

// ─── Submission Type Tests ───────────────────────────────────────────────────

describe('LessonSubmissionKind discriminated union', () => {
    it('accepts OBJECTIVE with answers', () => {
        const submission: LessonSubmissionKind = {
            kind: 'OBJECTIVE',
            answers: [
                {
                    questionId: 'q-mc-1',
                    questionVersion: 1,
                    type: 'MULTIPLE_CHOICE',
                    answer: { selectedOptionId: 'opt-a' },
                },
            ],
        };
        expect(submission.kind).toBe('OBJECTIVE');
        if (submission.kind === 'OBJECTIVE') {
            expect(submission.answers).toHaveLength(1);
            expect(submission.answers[0].answer).toHaveProperty('selectedOptionId');
        }
    });

    it('accepts COMPLETION with acknowledged', () => {
        const submission: LessonSubmissionKind = {
            kind: 'COMPLETION',
            acknowledged: true,
        };
        expect(submission.kind).toBe('COMPLETION');
    });

    it('accepts SPEAKING with sessionId', () => {
        const submission: LessonSubmissionKind = {
            kind: 'SPEAKING',
            sessionId: 'session-123',
        };
        expect(submission.kind).toBe('SPEAKING');
    });

    it('accepts WRITING with text', () => {
        const submission: LessonSubmissionKind = {
            kind: 'WRITING',
            text: 'My essay content...',
        };
        expect(submission.kind).toBe('WRITING');
    });
});

// ─── ObjectiveAnswer Type Tests ──────────────────────────────────────────────

describe('ObjectiveAnswer discriminated union', () => {
    it('MULTIPLE_CHOICE answer has selectedOptionId', () => {
        const answer: ObjectiveAnswer = {
            questionId: 'q-mc-1',
            questionVersion: 1,
            type: 'MULTIPLE_CHOICE',
            answer: { selectedOptionId: 'opt-a' },
        };
        if (answer.type === 'MULTIPLE_CHOICE') {
            expect(answer.answer.selectedOptionId).toBe('opt-a');
        }
    });

    it('FILL_IN_BLANK answer has text', () => {
        const answer: ObjectiveAnswer = {
            questionId: 'q-fill-1',
            questionVersion: 2,
            type: 'FILL_IN_BLANK',
            answer: { text: 'hello' },
        };
        if (answer.type === 'FILL_IN_BLANK') {
            expect(answer.answer.text).toBe('hello');
        }
    });

    it('TRUE_FALSE answer has value', () => {
        const answer: ObjectiveAnswer = {
            questionId: 'q-tf-1',
            questionVersion: 1,
            type: 'TRUE_FALSE',
            answer: { value: true },
        };
        if (answer.type === 'TRUE_FALSE') {
            expect(answer.answer.value).toBe(true);
        }
    });

    it('MATCHING answer has pairs', () => {
        const answer: ObjectiveAnswer = {
            questionId: 'q-match-1',
            questionVersion: 3,
            type: 'MATCHING',
            answer: { pairs: { 'left-1': 'right-1', 'left-2': 'right-2' } },
        };
        if (answer.type === 'MATCHING') {
            expect(answer.answer.pairs['left-1']).toBe('right-1');
        }
    });

    it('ERROR_CORRECTION answer has text', () => {
        const answer: ObjectiveAnswer = {
            questionId: 'q-ec-1',
            questionVersion: 1,
            type: 'ERROR_CORRECTION',
            answer: { text: 'He went to school yesterday.' },
        };
        if (answer.type === 'ERROR_CORRECTION') {
            expect(answer.answer.text).toBe('He went to school yesterday.');
        }
    });
});

// ─── No Answer Leakage (NFR-04) ──────────────────────────────────────────────

describe('NFR-04 - No pre-submit answer exposure', () => {
    it('LearnerPracticeQuestionDto has no explanation or answer fields', () => {
        const questions: LearnerPracticeQuestionDto[] = [
            makeMCQuestion(),
            makeFillQuestion(),
            makeTFQuestion(),
            makeMatchingQuestion(),
            makeECQuestion(),
        ];

        for (const q of questions) {
            // These fields must never appear pre-submit
            expect(q).not.toHaveProperty('explanation');
            expect(q).not.toHaveProperty('isCorrect');
            expect(q).not.toHaveProperty('correctAnswer');
            expect(q).not.toHaveProperty('correctAnswers');
            expect(q).not.toHaveProperty('correctText');
            expect(q).not.toHaveProperty('isTrue');
            expect(q).not.toHaveProperty('correctMapping');

            // Must have learner-safe identifiers
            expect(q).toHaveProperty('id');
            expect(q).toHaveProperty('version');
            expect(q).toHaveProperty('type');
            expect(q).toHaveProperty('stem');

            // Version must be a positive number
            expect(q.version).toBeGreaterThan(0);
        }
    });
});
