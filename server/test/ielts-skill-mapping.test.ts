import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SKILL_QUESTION_TYPE_MAP, IeltsSkill, IeltsQuestionType } from '../src/types/ielts-practice.types.js';

describe('SKILL_QUESTION_TYPE_MAP', () => {
    it('maps listening → form_completion', () => {
        assert.equal(SKILL_QUESTION_TYPE_MAP[IeltsSkill.LISTENING], IeltsQuestionType.FORM_COMPLETION);
    });

    it('maps reading → true_false_not_given', () => {
        assert.equal(SKILL_QUESTION_TYPE_MAP[IeltsSkill.READING], IeltsQuestionType.TRUE_FALSE_NOT_GIVEN);
    });

    it('maps writing → academic_task_1_chart', () => {
        assert.equal(SKILL_QUESTION_TYPE_MAP[IeltsSkill.WRITING], IeltsQuestionType.ACADEMIC_TASK_1_CHART);
    });

    it('maps speaking → ai_conversation', () => {
        assert.equal(SKILL_QUESTION_TYPE_MAP[IeltsSkill.SPEAKING], IeltsQuestionType.AI_CONVERSATION);
    });

    it('covers all four skills', () => {
        const skills = Object.keys(SKILL_QUESTION_TYPE_MAP);
        assert.equal(skills.length, 4);
        assert.deepEqual(skills.sort(), ['listening', 'reading', 'speaking', 'writing']);
    });
});
