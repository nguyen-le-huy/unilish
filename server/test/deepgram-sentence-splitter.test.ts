import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { splitUtteranceIntoSentences } from '../src/services/deepgram-sentence-splitter.js';

describe('splitUtteranceIntoSentences', () => {
    it('returns a single segment for a one-sentence utterance', () => {
        const segments = splitUtteranceIntoSentences({
            transcript: 'She opened the door.',
            start: 1.2,
            end: 2.8,
        });

        assert.deepEqual(segments, [
            {
                text: 'She opened the door.',
                startMs: 1200,
                endMs: 2800,
            },
        ]);
    });

    it('splits a two-sentence utterance with word timestamp alignment', () => {
        const segments = splitUtteranceIntoSentences({
            transcript: 'She opened the door. The room was completely dark.',
            start: 0,
            end: 3.2,
            words: [
                { word: 'She', start: 0.0, end: 0.3 },
                { word: 'opened', start: 0.3, end: 0.7 },
                { word: 'the', start: 0.7, end: 0.9 },
                { word: 'door.', start: 0.9, end: 1.2 },
                { word: 'The', start: 1.4, end: 1.6 },
                { word: 'room', start: 1.6, end: 1.9 },
                { word: 'was', start: 1.9, end: 2.1 },
                { word: 'completely', start: 2.1, end: 2.6 },
                { word: 'dark.', start: 2.6, end: 3.0 },
            ],
        });

        assert.deepEqual(segments, [
            {
                text: 'She opened the door.',
                startMs: 0,
                endMs: 1200,
            },
            {
                text: 'The room was completely dark.',
                startMs: 1400,
                endMs: 3000,
            },
        ]);
    });

    it('falls back to proportional timestamps when words are missing', () => {
        const segments = splitUtteranceIntoSentences({
            transcript: 'First sentence. Second sentence.',
            start: 2,
            end: 6,
            words: [],
        });

        assert.deepEqual(segments, [
            {
                text: 'First sentence.',
                startMs: 2000,
                endMs: 4000,
            },
            {
                text: 'Second sentence.',
                startMs: 4000,
                endMs: 6000,
            },
        ]);
    });
});
