import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    __setSentenceSplitRequesterForTest,
    alignSentencesToWords,
    splitTranscriptWithGpt,
} from '../src/services/gpt-sentence-splitter.service.js';

describe('alignSentencesToWords', () => {
    it('aligns two sentences to word boundaries', () => {
        const segments = alignSentencesToWords(
            ['She opened the door.', 'The room was dark.'],
            [
                { word: 'She', start: 0.0, end: 0.2 },
                { word: 'opened', start: 0.2, end: 0.5 },
                { word: 'the', start: 0.5, end: 0.6 },
                { word: 'door.', start: 0.6, end: 0.9 },
                { word: 'The', start: 1.1, end: 1.3 },
                { word: 'room', start: 1.3, end: 1.5 },
                { word: 'was', start: 1.5, end: 1.7 },
                { word: 'dark.', start: 1.7, end: 2.0 },
            ],
            0,
            2200,
        );

        assert.deepEqual(segments, [
            { text: 'She opened the door.', startMs: 0, endMs: 900 },
            { text: 'The room was dark.', startMs: 1100, endMs: 2200 },
        ]);
    });

    it('aligns three sentences in sequence', () => {
        const segments = alignSentencesToWords(
            ['I woke up.', 'I made coffee.', 'Then I started work.'],
            [
                { word: 'I', start: 2.0, end: 2.1 },
                { word: 'woke', start: 2.1, end: 2.3 },
                { word: 'up.', start: 2.3, end: 2.5 },
                { word: 'I', start: 2.7, end: 2.8 },
                { word: 'made', start: 2.8, end: 3.1 },
                { word: 'coffee.', start: 3.1, end: 3.4 },
                { word: 'Then', start: 3.6, end: 3.8 },
                { word: 'I', start: 3.8, end: 3.9 },
                { word: 'started', start: 3.9, end: 4.2 },
                { word: 'work.', start: 4.2, end: 4.5 },
            ],
            2000,
            4700,
        );

        assert.deepEqual(segments, [
            { text: 'I woke up.', startMs: 2000, endMs: 2500 },
            { text: 'I made coffee.', startMs: 2700, endMs: 3400 },
            { text: 'Then I started work.', startMs: 3600, endMs: 4700 },
        ]);
    });
});

describe('splitWithGpt fallbacks', () => {
    afterEach(() => {
        __setSentenceSplitRequesterForTest(null);
    });

    it('falls back to proportional timing when GPT splits but Deepgram words are missing', async () => {
        __setSentenceSplitRequesterForTest(async () => '{"sentences":["First sentence.","Second sentence."]}');

        const segments = await splitTranscriptWithGpt([
            {
                transcript: 'First sentence. Second sentence.',
                start: 2,
                end: 6,
                words: [],
            },
        ]);

        assert.deepEqual(segments, [
            { text: 'First sentence.', startMs: 2000, endMs: 4000 },
            { text: 'Second sentence.', startMs: 4000, endMs: 6000 },
        ]);
    });

    it('falls back to raw utterance when GPT returns invalid JSON', async () => {
        __setSentenceSplitRequesterForTest(async () => 'not-json');

        const segments = await splitTranscriptWithGpt([
            {
                transcript: 'Please keep this as one fallback cue.',
                start: 1.5,
                end: 3,
                words: [{ word: 'Please', start: 1.5, end: 1.7 }],
            },
        ]);

        assert.deepEqual(segments, [
            { text: 'Please keep this as one fallback cue.', startMs: 1500, endMs: 3000 },
        ]);
    });

    it('falls back to raw utterance when GPT request fails', async () => {
        __setSentenceSplitRequesterForTest(async () => {
            throw new Error('OpenAI timeout');
        });

        const segments = await splitTranscriptWithGpt([
            {
                transcript: 'Network failure should not break transcription.',
                start: 0.2,
                end: 1.8,
                words: [{ word: 'Network', start: 0.2, end: 0.4 }],
            },
        ]);

        assert.deepEqual(segments, [
            { text: 'Network failure should not break transcription.', startMs: 200, endMs: 1800 },
        ]);
    });
});
