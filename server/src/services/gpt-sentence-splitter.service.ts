import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { DeepgramUtterance, DeepgramUtteranceWord } from './deepgram-sentence-splitter.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SentenceSegment {
    text: string;
    startMs: number;
    endMs: number;
}

const GptSplitResponseSchema = z.object({
    sentences: z.array(z.string().trim().min(1)).min(1),
});

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

/**
 * Speaker-block system prompt.
 *
 * GPT receives a single-speaker block (contiguous utterances from one speaker)
 * so it can MERGE fragments within that block and SPLIT multi-sentence runs.
 */
const SYSTEM_PROMPT = `\
You are a linguistic segmentation expert for an English language shadowing app.

You will receive a transcript produced by ASR (automatic speech recognition)
for a single speaker turn block.
ASR often splits speech at wrong boundaries — mid-sentence fragments and multi-sentence run-ons.

YOUR TASK: Re-segment the entire transcript into natural, complete, breath-sized sentences
that a language learner can shadow one at a time.

STRICT RULES — follow every rule exactly:
1. MERGE fragments that belong to the same sentence.
    e.g. "This is about to be" + "the best glam look you've ever seen in your life."
    → "This is about to be the best glam look you've ever seen in your life."
2. EACH output item must be exactly one complete sentence from this single speaker.
   If there are multiple complete sentences, output each as its own item.
3. SPLIT only when each side is a complete thought.
    Punctuation alone is NOT enough. If the second fragment depends on the first,
    keep them together even if there is a period.
4. Each output sentence MUST be ≤ 20 words. If longer, split at the nearest natural clause
    boundary — after: and, but, so, yet, or, because, although, when, while, if, since, until.
5. KEEP the EXACT original words — never correct, paraphrase, or rearrange anything.
6. Preserve the original order. Do not reorder sentences.
7. Filler words ("uh", "um", "you know") stay attached to the sentence they belong to.
8. Return ONLY valid JSON — no markdown, no explanation, no trailing commas:
   { "sentences": ["Complete sentence one.", "Complete sentence two."] }

EXAMPLE:
ASR output (broken):
  "This is about to be | the best glam look you've ever seen in your life. Can't even | take myself seriously when I say it. I have my ginger tea with | fresh ginger trunks in it."

Correct output:
  { "sentences": [
      "This is about to be the best glam look you've ever seen in your life.",
      "Can't even take myself seriously when I say it.",
      "I have my ginger tea with fresh ginger trunks in it."
    ] }

ASR output (continuation with extra period):
    "definitely. i want it so bad."

Correct output:
    { "sentences": ["definitely. i want it so bad."] }`;

const buildUserPrompt = (transcript: string): string =>
    `Re-segment this single-speaker ASR transcript into complete, shadowable sentences:\n\n"${transcript}"`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toMs = (seconds: number): number => Math.max(0, Math.round(seconds * 1000));

/**
 * Count words after stripping punctuation so the count matches Deepgram's
 * words[] array (which never includes punctuation tokens).
 * e.g. "Hello, world!" → 2 tokens, matching ["Hello", "world"] in Deepgram.
 */
const countWords = (text: string): number => {
    const stripped = text.replace(/[^a-zA-Z0-9'\-\s]/g, ' ').trim();
    return stripped.split(/\s+/).filter(Boolean).length;
};

/**
 * Align GPT-produced sentences to a flat word array from ALL utterances.
 *
 * Algorithm:
 *   For each sentence, count its words (punctuation-stripped).
 *   Advance a cursor through allWords[] by that count.
 *   startMs = first word's start timestamp.
 *   endMs   = last word's end timestamp.
 *   First sentence anchors to transcriptStartMs.
 *   Last sentence anchors to transcriptEndMs.
 *   → guarantees full coverage, no gaps between cues.
 */
export const alignSentencesToWords = (
    sentences: string[],
    allWords: DeepgramUtteranceWord[],
    transcriptStartMs: number,
    transcriptEndMs: number,
): SentenceSegment[] => {
    let wordCursor = 0;

    return sentences.map((sentence, index) => {
        const isFirst = index === 0;
        const isLast = index === sentences.length - 1;

        const tokenCount = Math.max(1, countWords(sentence));
        const firstWordIndex = Math.min(wordCursor, allWords.length - 1);
        const lastWordIndex = Math.min(wordCursor + tokenCount - 1, allWords.length - 1);

        const firstWord = allWords[firstWordIndex];
        const lastWord = allWords[lastWordIndex];

        wordCursor = lastWordIndex + 1;

        const startMs = isFirst
            ? transcriptStartMs
            : toMs(firstWord?.start ?? transcriptStartMs / 1000);
        const endMs = isLast
            ? transcriptEndMs
            : toMs(lastWord?.end ?? transcriptEndMs / 1000);

        return {
            text: sentence.trim(),
            startMs,
            endMs: Math.max(startMs + 1, endMs), // endMs always strictly > startMs
        };
    });
};

// ---------------------------------------------------------------------------
// Test injection hook
// ---------------------------------------------------------------------------

type SentenceSplitRequester = (transcript: string) => Promise<string | null>;

const requestFromOpenAi: SentenceSplitRequester = async (transcript) => {
    const completion = await openaiClient.chat.completions.create({
        model: env.OPENAI_MODEL,
        response_format: { type: 'json_object' },
        temperature: 0,             // fully deterministic
        max_completion_tokens: 2048, // increased for full-video transcripts
        messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(transcript) },
        ],
    });
    return completion.choices[0]?.message?.content ?? null;
};

let sentenceSplitRequester: SentenceSplitRequester = requestFromOpenAi;

export const __setSentenceSplitRequesterForTest = (
    requester: SentenceSplitRequester | null,
): void => {
    sentenceSplitRequester = requester ?? requestFromOpenAi;
};

// ---------------------------------------------------------------------------
// Helpers: speaker blocks + concurrency
// ---------------------------------------------------------------------------

interface SpeakerBlock {
    utterances: DeepgramUtterance[];
}

const buildSpeakerBlocks = (utterances: DeepgramUtterance[]): SpeakerBlock[] => {
    if (utterances.length === 0) return [];

    const hasSpeakerLabels = utterances.some((u) => u.speaker !== undefined && u.speaker !== null);
    if (!hasSpeakerLabels) {
        return [{ utterances }];
    }

    const blocks: SpeakerBlock[] = [];
    let current: SpeakerBlock | null = null;
    let currentSpeaker: number | null = null;

    utterances.forEach((utterance) => {
        const speaker = utterance.speaker ?? null;

        if (!current || speaker !== currentSpeaker) {
            current = { utterances: [utterance] };
            blocks.push(current);
            currentSpeaker = speaker;
            return;
        }

        current.utterances.push(utterance);
    });

    return blocks;
};

async function mapConcurrent<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    concurrency: number,
): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let cursor = 0;

    const worker = async (): Promise<void> => {
        while (cursor < items.length) {
            const index = cursor++;
            results[index] = await fn(items[index]!);
        }
    };

    await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
    return results;
}

const buildBlockTranscript = (utterances: DeepgramUtterance[]): string =>
    utterances
        .map((u) => u.transcript?.trim() ?? '')
        .filter(Boolean)
        .join(' ');

const toSegmentFallback = (utterances: DeepgramUtterance[]): SentenceSegment[] =>
    utterances
        .map((u) => ({
            text: u.transcript?.trim() ?? '',
            startMs: toMs(u.start ?? 0),
            endMs: toMs(Math.max(u.start ?? 0, u.end ?? u.start ?? 0)),
        }))
        .filter((s) => s.text.length > 0);

const splitBlockWithGpt = async (utterances: DeepgramUtterance[]): Promise<SentenceSegment[]> => {
    const blockTranscript = buildBlockTranscript(utterances);
    if (blockTranscript.length === 0) return [];

    const allWords: DeepgramUtteranceWord[] = utterances.flatMap((u) => u.words ?? []);
    const blockStartMs = toMs(utterances[0]?.start ?? 0);
    const lastUtterance = utterances[utterances.length - 1];
    const blockEndMs = toMs(Math.max(lastUtterance?.end ?? 0, lastUtterance?.start ?? 0));

    const fallback = toSegmentFallback(utterances);

    try {
        const raw = await sentenceSplitRequester(blockTranscript);
        if (!raw) {
            logger.warn('GptSentenceSplitter: empty GPT response, using utterances as fallback');
            return fallback;
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            logger.warn('GptSentenceSplitter: invalid JSON from GPT', { raw: raw.slice(0, 200) });
            return fallback;
        }

        const validated = GptSplitResponseSchema.safeParse(parsed);
        if (!validated.success) {
            logger.warn('GptSentenceSplitter: schema validation failed', {
                issues: validated.error.issues,
            });
            return fallback;
        }

        const { sentences } = validated.data;

        if (allWords.length === 0) {
            const durationMs = Math.max(0, blockEndMs - blockStartMs);
            logger.info('GptSentenceSplitter: no word timestamps, using proportional fallback');
            return sentences.map((text, i) => ({
                text: text.trim(),
                startMs: blockStartMs + Math.round((durationMs * i) / sentences.length),
                endMs: blockStartMs + Math.round((durationMs * (i + 1)) / sentences.length),
            }));
        }

        return alignSentencesToWords(sentences, allWords, blockStartMs, blockEndMs);
    } catch (error) {
        logger.error('GptSentenceSplitter: GPT call failed, using utterances as fallback', {
            preview: blockTranscript.slice(0, 80),
            error: error instanceof Error ? error.message : String(error),
        });
        return fallback;
    }
};

/**
 * Splits contiguous speaker blocks so each cue is exactly one sentence
 * from a single speaker. Uses GPT per speaker block.
 */
export const splitTranscriptWithGpt = async (
    utterances: DeepgramUtterance[],
): Promise<SentenceSegment[]> => {
    if (utterances.length === 0) return [];

    const blocks = buildSpeakerBlocks(utterances);
    if (blocks.length === 0) return [];

    const segmentGroups = await mapConcurrent(
        blocks,
        async (block) => splitBlockWithGpt(block.utterances),
        env.AI_ANALYSIS_CONCURRENCY,
    );

    const segments = segmentGroups.flat();

    logger.info('GptSentenceSplitter: speaker blocks re-segmented', {
        utteranceCount: utterances.length,
        blockCount: blocks.length,
        cueCount: segments.length,
    });

    return segments;
};
