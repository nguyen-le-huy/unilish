import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { resolveEffectivePracticeConfig } from '../src/utils/lesson-practice-config.js';

describe('resolveEffectivePracticeConfig', () => {
    it('falls back to content.practiceConfig when top-level practiceConfig is missing', () => {
        const questionId = new mongoose.Types.ObjectId().toString();

        const result = resolveEffectivePracticeConfig({
            content: {
                practiceConfig: {
                    mode: 'FIXED',
                    questionIds: [questionId],
                    passingScore: 75,
                },
            },
        });

        assert.equal(result.mode, 'FIXED');
        assert.equal(result.passingScore, 75);
        assert.deepEqual(result.questionIds.map(String), [questionId]);
    });

    it('uses nested questionIds when top-level exists but is empty', () => {
        const nestedQuestionId = new mongoose.Types.ObjectId().toString();

        const result = resolveEffectivePracticeConfig({
            practiceConfig: {
                mode: 'FIXED',
                questionIds: [],
                passingScore: 80,
            },
            content: {
                practiceConfig: {
                    mode: 'FIXED',
                    questionIds: [nestedQuestionId],
                    passingScore: 70,
                },
            },
        });

        assert.equal(result.mode, 'FIXED');
        assert.equal(result.passingScore, 70);
        assert.deepEqual(result.questionIds.map(String), [nestedQuestionId]);
    });

    it('uses the full nested config when top-level is stale dynamic metadata without questionIds', () => {
        const nestedQuestionId = new mongoose.Types.ObjectId().toString();

        const result = resolveEffectivePracticeConfig({
            practiceConfig: {
                mode: 'DYNAMIC',
                passingScore: 80,
            },
            content: {
                practiceConfig: {
                    mode: 'FIXED',
                    questionIds: [nestedQuestionId],
                    passingScore: 70,
                },
            },
        });

        assert.equal(result.mode, 'FIXED');
        assert.equal(result.passingScore, 70);
        assert.deepEqual(result.questionIds.map(String), [nestedQuestionId]);
    });

    it('prefers top-level questionIds when both sources are present', () => {
        const topLevelQuestionId = new mongoose.Types.ObjectId().toString();
        const nestedQuestionId = new mongoose.Types.ObjectId().toString();

        const result = resolveEffectivePracticeConfig({
            practiceConfig: {
                mode: 'FIXED',
                questionIds: [topLevelQuestionId],
                passingScore: 85,
            },
            content: {
                practiceConfig: {
                    mode: 'FIXED',
                    questionIds: [nestedQuestionId],
                    passingScore: 70,
                },
            },
        });

        assert.equal(result.passingScore, 85);
        assert.deepEqual(result.questionIds.map(String), [topLevelQuestionId]);
    });
});
