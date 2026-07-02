import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeLessonContent, validateLessonContent } from '../src/services/lesson-sanitizer.service.js';

// ─── Sanitizer Tests ──────────────────────────────────────────────────────────

describe('LessonSanitizer', () => {
    describe('VOCAB content', () => {
        it('strips generationStatus but keeps items', () => {
            const content = {
                type: 'VOCAB',
                scenario: 'At the airport',
                generationStatus: 'GENERATING',
                items: [
                    { id: '1', word: 'luggage', definitionNative: 'hành lý' },
                ],
            };

            const result = sanitizeLessonContent('VOCAB', content);
            assert.equal((result as any).scenario, 'At the airport');
            assert.equal((result as any).generationStatus, undefined);
            assert.equal((result as any).items.length, 1);
        });
    });

    describe('GRAMMAR content', () => {
        it('strips correct, acceptedAnswers, explanation from inline quiz questions', () => {
            const content = {
                type: 'GRAMMAR',
                blocks: [
                    { type: 'EXPLANATION', heading: 'Rule', body: 'Explanation' },
                    {
                        type: 'INLINE_QUIZ',
                        instruction: 'Choose the correct answer',
                        questions: [
                            {
                                id: 'q1',
                                stem: 'She ___ to school',
                                type: 'MULTIPLE_CHOICE',
                                options: ['go', 'goes'],
                                correct: 'goes',
                                acceptedAnswers: ['goes'],
                                explanation: 'Use goes for third person',
                            },
                        ],
                    },
                ],
            };

            const result = sanitizeLessonContent('GRAMMAR', content);
            const quizBlock = (result as any).blocks[1];
            const question = quizBlock.questions[0];

            assert.equal(question.stem, 'She ___ to school');
            assert.equal(question.correct, undefined);
            assert.equal(question.acceptedAnswers, undefined);
            assert.equal(question.explanation, undefined);
            assert.deepEqual(question.options, ['go', 'goes']);
        });

        it('leaves non-quiz blocks unchanged', () => {
            const content = {
                type: 'GRAMMAR',
                blocks: [
                    { type: 'EXPLANATION', heading: 'Rule', body: 'Body text' },
                    { type: 'CALLOUT', variant: 'TIP', text: 'Remember this' },
                ],
            };

            const result = sanitizeLessonContent('GRAMMAR', content);
            assert.equal((result as any).blocks.length, 2);
            assert.equal((result as any).blocks[0].heading, 'Rule');
        });
    });

    describe('READING content', () => {
        it('strips generationStatus but keeps text and glossary', () => {
            const content = {
                type: 'READING',
                text: '<p>Hello world</p>',
                translation: 'Xin chào',
                generationStatus: 'DONE',
                glossary: { word1: { word: 'hello', definition: 'xin chào' } },
                media: { audioUrl: null, durationSec: 0, speed: 1 },
            };

            const result = sanitizeLessonContent('READING', content);
            assert.equal((result as any).text, '<p>Hello world</p>');
            assert.equal((result as any).generationStatus, undefined);
            assert.ok((result as any).glossary);
        });
    });

    describe('LISTENING content', () => {
        it('strips generationStatus but keeps media and transcript', () => {
            const content = {
                type: 'LISTENING',
                media: { audioUrl: 'https://example.com/audio.mp3', duration: 120 },
                transcript: [],
                generationStatus: 'DONE',
                interactiveConfig: { mode: 'GAP_FILL', hidePercentage: 30 },
            };

            const result = sanitizeLessonContent('LISTENING', content);
            assert.equal((result as any).generationStatus, undefined);
            assert.equal((result as any).media.audioUrl, 'https://example.com/audio.mp3');
        });
    });

    describe('WRITING content', () => {
        it('strips correct from warmup tasks', () => {
            const content = {
                type: 'WRITING',
                prompt: 'Write an email',
                promptTranslation: 'Viết email',
                config: { minWords: 50, maxWords: 200, format: 'EMAIL', tone: 'FORMAL' },
                warmupTasks: [
                    { id: 'w1', type: 'UNSCRAMBLE', words: ['I', 'am', 'ready'], correct: 'I am ready' },
                ],
            };

            const result = sanitizeLessonContent('WRITING', content);
            const task = (result as any).warmupTasks[0];
            assert.equal(task.correct, undefined);
            assert.equal(task.words.join(' '), 'I am ready');
        });
    });

    describe('SPEAKING content', () => {
        it('passes through without modification', () => {
            const content = {
                type: 'SPEAKING',
                prompt: 'Describe your favorite food',
                promptTranslation: 'Mô tả món ăn yêu thích',
            };

            const result = sanitizeLessonContent('SPEAKING', content);
            assert.equal((result as any).prompt, 'Describe your favorite food');
        });
    });

    describe('UNIT_TEST content', () => {
        it('strips answer fields from quiz blocks', () => {
            const content = {
                type: 'UNIT_TEST',
                blocks: [
                    {
                        type: 'QUIZ',
                        questions: [
                            { id: 'q1', stem: 'Test Q', correct: 'A', explanation: 'Because...' },
                        ],
                    },
                ],
            };

            const result = sanitizeLessonContent('UNIT_TEST', content);
            const question = (result as any).blocks[0].questions[0];
            assert.equal(question.correct, undefined);
            assert.equal(question.explanation, undefined);
        });
    });

    describe('Malformed content (AC-19)', () => {
        it('returns empty object for null content', () => {
            const result = sanitizeLessonContent('VOCAB', null);
            assert.deepEqual(result, {});
        });

        it('returns empty object for non-object content', () => {
            const result = sanitizeLessonContent('VOCAB', 'string');
            assert.deepEqual(result, {});
        });
    });
});

// ─── Validation Tests ─────────────────────────────────────────────────────────

describe('validateLessonContent', () => {
    it('returns null for valid VOCAB content', () => {
        const result = validateLessonContent('VOCAB', {
            items: [{ id: '1', word: 'hello' }],
        });
        assert.equal(result, null);
    });

    it('returns error for VOCAB with empty items', () => {
        const result = validateLessonContent('VOCAB', { items: [] });
        assert.ok(result);
        assert.match(result!, /cập nhật/);
    });

    it('returns error for null content', () => {
        const result = validateLessonContent('VOCAB', null);
        assert.ok(result);
    });

    it('returns null for valid GRAMMAR content', () => {
        const result = validateLessonContent('GRAMMAR', {
            blocks: [{ type: 'EXPLANATION', heading: 'Rule', body: 'Text' }],
        });
        assert.equal(result, null);
    });

    it('returns error for READING without text', () => {
        const result = validateLessonContent('READING', { media: {} });
        assert.ok(result);
    });

    it('returns null for valid READING content', () => {
        const result = validateLessonContent('READING', {
            text: '<p>Content</p>',
        });
        assert.equal(result, null);
    });

    it('returns null for valid LISTENING with media', () => {
        const result = validateLessonContent('LISTENING', {
            media: { audioUrl: 'url' },
        });
        assert.equal(result, null);
    });

    it('returns error for LISTENING without audioUrl', () => {
        const result = validateLessonContent('LISTENING', { media: {} });
        assert.ok(result);
    });

    it('returns error for SPEAKING without prompt', () => {
        const result = validateLessonContent('SPEAKING', {});
        assert.ok(result);
    });

    it('returns null for valid WRITING with prompt', () => {
        const result = validateLessonContent('WRITING', { prompt: 'Write' });
        assert.equal(result, null);
    });
});
