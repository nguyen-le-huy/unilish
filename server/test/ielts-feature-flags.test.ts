import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isSkillEnabled, isSkillAvailable } from '../src/utils/feature-flags.js';

describe('isSkillEnabled', () => {
    it('returns true when env var is not set (default enabled)', () => {
        // The function reads process.env at call time, so we can test
        // by setting the env var before calling
        delete process.env.IELTS_PRACTICE_LISTENING_ENABLED;
        assert.equal(isSkillEnabled('listening'), true);
    });

    it('returns false when env var is set to false', () => {
        process.env.IELTS_PRACTICE_LISTENING_ENABLED = 'false';
        assert.equal(isSkillEnabled('listening'), false);
    });

    it('returns true when env var is set to true', () => {
        process.env.IELTS_PRACTICE_LISTENING_ENABLED = 'true';
        assert.equal(isSkillEnabled('listening'), true);
    });

    it('returns true when env var is set to 1', () => {
        process.env.IELTS_PRACTICE_LISTENING_ENABLED = '1';
        assert.equal(isSkillEnabled('listening'), true);
    });

    it('returns false for unknown skill', () => {
        assert.equal(isSkillAvailable('invalid'), false);
    });

    it('returns true for valid enabled skill', () => {
        process.env.IELTS_PRACTICE_LISTENING_ENABLED = 'true';
        assert.equal(isSkillAvailable('listening'), true);
    });
});
