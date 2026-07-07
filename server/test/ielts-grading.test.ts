import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gradeObjective } from '../src/services/ielts-grading.service.js';

// ─── Listening Form Completion ───────────────────────────────────────────────

describe('gradeObjective — form_completion (Listening)', () => {
    const contentSnapshot = {
        questionType: 'form_completion',
        items: [
            { id: 'l-1', acceptedAnswers: ['sky'], caseSensitive: false },
            { id: 'l-2', acceptedAnswers: ['25', 'twenty-five'], caseSensitive: false },
            { id: 'l-3', acceptedAnswers: ['Modern Art Museum'], caseSensitive: true },
            { id: 'l-4', acceptedAnswers: ['7:30', '07:30'], caseSensitive: false },
        ],
    };

    it('scores all correct answers', () => {
        const result = gradeObjective({
            skill: 'listening',
            questionType: 'form_completion',
            contentSnapshot,
            draft: {
                answers: {
                    'l-1': 'sky',
                    'l-2': 'twenty-five',
                    'l-3': 'Modern Art Museum',
                    'l-4': '7:30',
                },
            },
        });

        assert.equal(result?.correct, 4);
        assert.equal(result?.total, 4);
        assert.equal(result?.normalizedScore, 1);
    });

    it('handles case sensitivity correctly', () => {
        const result = gradeObjective({
            skill: 'listening',
            questionType: 'form_completion',
            contentSnapshot,
            draft: {
                answers: {
                    'l-3': 'modern art museum', // case sensitive, should fail
                },
            },
        });

        const itemResult = result?.itemResults.find((r) => r.itemId === 'l-3');
        assert.equal(itemResult?.correct, false);
    });

    it('scores partially correct answers', () => {
        const result = gradeObjective({
            skill: 'listening',
            questionType: 'form_completion',
            contentSnapshot,
            draft: {
                answers: {
                    'l-1': 'sky',
                    'l-2': 'wrong',
                    'l-3': 'Modern Art Museum',
                    'l-4': '',
                },
            },
        });

        assert.equal(result?.correct, 2);
        assert.equal(result?.total, 4);
        assert.equal(result?.normalizedScore, 0.5);
    });

    it('handles case-insensitive match with different casing', () => {
        const result = gradeObjective({
            skill: 'listening',
            questionType: 'form_completion',
            contentSnapshot,
            draft: {
                answers: {
                    'l-1': 'Sky', // uppercase, but caseSensitive=false
                },
            },
        });

        const itemResult = result?.itemResults.find((r) => r.itemId === 'l-1');
        assert.equal(itemResult?.correct, true);
    });

    it('returns null for writing skill', () => {
        const result = gradeObjective({
            skill: 'writing',
            questionType: 'academic_task_1_chart',
            contentSnapshot: {},
            draft: { essay: 'test' },
        });

        assert.equal(result, null);
    });

    it('returns null for speaking skill', () => {
        const result = gradeObjective({
            skill: 'speaking',
            questionType: 'ai_conversation',
            contentSnapshot: {},
            draft: {},
        });

        assert.equal(result, null);
    });
});

// ─── Reading True/False/Not Given ────────────────────────────────────────────

describe('gradeObjective — true_false_not_given (Reading)', () => {
    const contentSnapshot = {
        questionType: 'true_false_not_given',
        statements: [
            { id: 'r-1', correctAnswer: 'TRUE' },
            { id: 'r-2', correctAnswer: 'FALSE' },
            { id: 'r-3', correctAnswer: 'NOT_GIVEN' },
            { id: 'r-4', correctAnswer: 'TRUE' },
        ],
    };

    it('scores all correct answers', () => {
        const result = gradeObjective({
            skill: 'reading',
            questionType: 'true_false_not_given',
            contentSnapshot,
            draft: {
                answers: {
                    'r-1': 'TRUE',
                    'r-2': 'FALSE',
                    'r-3': 'NOT_GIVEN',
                    'r-4': 'TRUE',
                },
            },
        });

        assert.equal(result?.correct, 4);
        assert.equal(result?.total, 4);
    });

    it('handles lowercase input', () => {
        const result = gradeObjective({
            skill: 'reading',
            questionType: 'true_false_not_given',
            contentSnapshot,
            draft: {
                answers: {
                    'r-1': 'true', // lowercase should match after normalize
                    'r-2': 'false',
                    'r-3': 'not_given',
                },
            },
        });

        assert.equal(result?.correct, 3);
    });

    it('marks unanswered as incorrect', () => {
        const result = gradeObjective({
            skill: 'reading',
            questionType: 'true_false_not_given',
            contentSnapshot,
            draft: {
                answers: {},
            },
        });

        assert.equal(result?.correct, 0);
        assert.equal(result?.total, 4);
    });

    it('returns correct itemResults with per-item correctness', () => {
        const result = gradeObjective({
            skill: 'reading',
            questionType: 'true_false_not_given',
            contentSnapshot,
            draft: {
                answers: {
                    'r-1': 'TRUE',
                    'r-2': 'TRUE', // wrong
                    'r-3': 'NOT_GIVEN',
                    'r-4': 'FALSE', // wrong
                },
            },
        });

        assert.equal(result?.correct, 2);
        assert.equal(result?.itemResults.length, 4);
        assert.equal(result?.itemResults[0]?.correct, true);
        assert.equal(result?.itemResults[1]?.correct, false);
        assert.equal(result?.itemResults[2]?.correct, true);
        assert.equal(result?.itemResults[3]?.correct, false);
    });
});

// ─── Edge cases ──────────────────────────────────────────────────────────────

describe('gradeObjective — edge cases', () => {
    it('handles empty items gracefully', () => {
        const result = gradeObjective({
            skill: 'listening',
            questionType: 'form_completion',
            contentSnapshot: { items: [] },
            draft: { answers: {} },
        });

        assert.equal(result?.correct, 0);
        assert.equal(result?.total, 0);
        assert.equal(result?.normalizedScore, 0);
    });

    it('handles empty answers gracefully', () => {
        const result = gradeObjective({
            skill: 'listening',
            questionType: 'form_completion',
            contentSnapshot: {
                items: [
                    { id: 'l-1', acceptedAnswers: ['test'], caseSensitive: false },
                ],
            },
            draft: { answers: {} },
        });

        assert.equal(result?.correct, 0);
        assert.equal(result?.total, 1);
    });

    it('handles nullish items', () => {
        const result = gradeObjective({
            skill: 'listening',
            questionType: 'form_completion',
            contentSnapshot: {},
            draft: { answers: {} },
        });

        assert.equal(result?.correct, 0);
        assert.equal(result?.total, 0);
    });
});
