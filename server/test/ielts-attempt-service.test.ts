import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gradeObjective } from '../src/services/ielts-grading.service.js';

// ─── Word count logic (testing the inline calculateWordCount indirectly) ─────

describe('Attempt service helpers', () => {
    it('grades Listening form_completion correctly', () => {
        const result = gradeObjective({
            skill: 'listening',
            questionType: 'form_completion',
            contentSnapshot: {
                items: [
                    { id: 'l-1', acceptedAnswers: ['sky'], caseSensitive: false },
                    { id: 'l-2', acceptedAnswers: ['25', 'twenty-five'], caseSensitive: false },
                ],
            },
            draft: {
                answers: { 'l-1': 'sky', 'l-2': '25' },
            },
        });

        assert.equal(result?.correct, 2);
        assert.equal(result?.total, 2);
        assert.equal(result?.normalizedScore, 1);
    });

    it('grades Reading TFNG correctly', () => {
        const result = gradeObjective({
            skill: 'reading',
            questionType: 'true_false_not_given',
            contentSnapshot: {
                statements: [
                    { id: 'r-1', correctAnswer: 'TRUE' },
                    { id: 'r-2', correctAnswer: 'FALSE' },
                ],
            },
            draft: {
                answers: { 'r-1': 'TRUE', 'r-2': 'TRUE' },
            },
        });

        assert.equal(result?.correct, 1);
        assert.equal(result?.total, 2);
    });

    it('returns null for Writing (async grading)', () => {
        const result = gradeObjective({
            skill: 'writing',
            questionType: 'academic_task_1_chart',
            contentSnapshot: {},
            draft: { essay: 'test' },
        });

        assert.equal(result, null);
    });

    it('returns null for Speaking (async grading)', () => {
        const result = gradeObjective({
            skill: 'speaking',
            questionType: 'ai_conversation',
            contentSnapshot: {},
            draft: {},
        });

        assert.equal(result, null);
    });

    it('grades empty draft as all incorrect', () => {
        const result = gradeObjective({
            skill: 'listening',
            questionType: 'form_completion',
            contentSnapshot: {
                items: [
                    { id: 'l-1', acceptedAnswers: ['sky'], caseSensitive: false },
                ],
            },
            draft: { answers: {} },
        });

        assert.equal(result?.correct, 0);
        assert.equal(result?.total, 1);
    });
});
