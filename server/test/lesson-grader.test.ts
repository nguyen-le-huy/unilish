import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAnswer } from '../src/services/lesson-grader.service.js';

// Unit tests for the grading logic (pure functions, no DB needed).
// Full integration tests with DB are in learning-submission.test.ts.

describe('normalizeAnswer', () => {
    it('trims whitespace and lowercases', () => {
        assert.equal(normalizeAnswer('  Hello World  '), 'hello world');
    });

    it('collapses multiple spaces', () => {
        assert.equal(normalizeAnswer('went   to   school'), 'went to school');
    });

    it('removes trailing punctuation', () => {
        assert.equal(normalizeAnswer('went.'), 'went');
        assert.equal(normalizeAnswer('Hello!'), 'hello');
        assert.equal(normalizeAnswer('Yes?'), 'yes');
    });

    it('handles empty string', () => {
        assert.equal(normalizeAnswer(''), '');
    });
});
