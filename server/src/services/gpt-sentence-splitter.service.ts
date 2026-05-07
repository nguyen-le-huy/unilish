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
    translationVi?: string | null;
    vocabulary: VocabularyItem[];
    startMs: number;
    endMs: number;
}

export interface VocabularyItem {
    word: string;
    pos: string;
    translationVi: string;
    ipa: string;
}

export interface CueAnalysis {
    translationVi: string;
    vocabulary: VocabularyItem[];
}

const EMPTY_CUE_ANALYSIS: CueAnalysis = {
    translationVi: '',
    vocabulary: [],
};

const CUE_ANALYSIS_BATCH_SIZE = 8;
const CUE_ANALYSIS_MAX_RETRIES = 2;
const SEGMENT_MIN_PREFERRED_WORDS = 6;
const SEGMENT_MAX_PREFERRED_WORDS = 24;
const GPT_REQUEST_TIMEOUT_MS = 20_000;

const VocabularyItemSchema = z.object({
    word: z.string().trim().min(1),
    pos: z.string().trim().min(1),
    translationVi: z.string().trim().min(1),
    ipa: z.string().trim().min(1),
});

const GptSplitResponseSchema = z.object({
    segments: z.array(z.object({
        text: z.string().trim().min(1),
        translationVi: z.string().trim().min(1),
        vocabulary: z.array(VocabularyItemSchema),
    })).min(1),
});

const GptCueAnalysisResponseSchema = z.object({
    analyses: z.array(z.object({
        translationVi: z.string().trim().min(1),
        vocabulary: z.array(VocabularyItemSchema),
    })).min(1),
});

// ---------------------------------------------------------------------------
// Prompts
// ---------------------------------------------------------------------------

/**
 * Speaker-block system prompt.
 *
 * GPT receives a single-speaker block (contiguous utterances from one speaker)
 * so it can MERGE fragments within that block, SPLIT multi-sentence runs,
 * and translate each sentence to Vietnamese.
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
4. Prefer 8-18 words. You MAY go up to 24 words to preserve a complete thought.
    Never create a dangling fragment that ends with comma, colon, hyphen, or connector words.
5. KEEP the EXACT original words — never correct, paraphrase, or rearrange anything.
6. Preserve the original order. Do not reorder sentences.
7. Filler words ("uh", "um", "you know") stay attached to the sentence they belong to.
8. Translate each sentence to Vietnamese (no English in the translation).
9. For each sentence, list ALL noteworthy vocabulary with:
    - word, pos (part of speech), ipa, translationVi
10. Return ONLY valid JSON — no markdown, no explanation, no trailing commas:
    { "segments": [{"text":"Complete sentence one.","translationVi":"...","vocabulary":[]} ] }

EXAMPLE:
ASR output (broken):
  "This is about to be | the best glam look you've ever seen in your life. Can't even | take myself seriously when I say it. I have my ginger tea with | fresh ginger trunks in it."

Correct output:
    { "segments": [
            {"text":"This is about to be the best glam look you've ever seen in your life.","translationVi":"...","vocabulary":[]},
            {"text":"Can't even take myself seriously when I say it.","translationVi":"...","vocabulary":[]},
            {"text":"I have my ginger tea with fresh ginger trunks in it.","translationVi":"...","vocabulary":[]}
        ] }

ASR output (continuation with extra period):
    "definitely. i want it so bad."

Correct output:
    { "segments": [{"text":"definitely. i want it so bad.","translationVi":"...","vocabulary":[]}] }`;

const buildUserPrompt = (transcript: string): string =>
    `Re-segment this single-speaker ASR transcript into complete, shadowable sentences and translate each to Vietnamese:\n\n"${transcript}"`;

const CUE_ANALYSIS_SYSTEM_PROMPT = `\
You are a linguistic analyst for an English shadowing app.

For each English sentence, provide:
- translationVi: natural Vietnamese translation.
- vocabulary: all noteworthy words with { word, pos, ipa, translationVi }.

Rules:
- Keep exact words and phrases from the sentence.
- Do not add extra commentary.
- Return ONLY valid JSON: { "analyses": [ {"translationVi":"...","vocabulary":[]} ] }`;

const buildCueAnalysisPrompt = (sentences: string[]): string =>
    `Analyze these English sentences in the same order:\n${sentences.map((text, index) => `${index + 1}. ${text}`).join('\n')}`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const toMs = (seconds: number): number => Math.max(0, Math.round(seconds * 1000));

const tryParseJsonObject = (raw: string): unknown | null => {
    const normalized = raw.trim();
    if (!normalized) {
        return null;
    }

    try {
        return JSON.parse(normalized);
    } catch {
        const firstBrace = normalized.indexOf('{');
        const lastBrace = normalized.lastIndexOf('}');
        if (firstBrace < 0 || lastBrace <= firstBrace) {
            return null;
        }

        try {
            return JSON.parse(normalized.slice(firstBrace, lastBrace + 1));
        } catch {
            return null;
        }
    }
};

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> => {
    let timeoutId: NodeJS.Timeout | null = null;

    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new Error(`${label} timeout after ${timeoutMs}ms`));
                }, timeoutMs);
                timeoutId.unref?.();
            }),
        ]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
};

/**
 * Count words after stripping punctuation so the count matches Deepgram's
 * words[] array (which never includes punctuation tokens).
 * e.g. "Hello, world!" → 2 tokens, matching ["Hello", "world"] in Deepgram.
 */
const countWords = (text: string): number => {
    const stripped = text.replace(/[^a-zA-Z0-9'\-\s]/g, ' ').trim();
    return stripped.split(/\s+/).filter(Boolean).length;
};

const buildVocabularyKey = (item: VocabularyItem): string =>
    `${item.word.toLowerCase()}::${item.pos.toLowerCase()}`;

const mergeVocabulary = (left: VocabularyItem[], right: VocabularyItem[]): VocabularyItem[] => {
    const uniqueByKey = new Map<string, VocabularyItem>();

    [...left, ...right].forEach((item) => {
        const key = buildVocabularyKey(item);
        if (!uniqueByKey.has(key)) {
            uniqueByKey.set(key, item);
        }
    });

    return Array.from(uniqueByKey.values());
};

const hasTerminalPunctuation = (text: string): boolean => /[.!?]["')\]]*$/.test(text.trim());
const hasDanglingEnding = (text: string): boolean => /[,;:\-–—]\s*$/.test(text.trim());
const shortStandaloneSentencePattern = /^(yes|no|ok|okay|right|sure|exactly|definitely|absolutely|maybe|perhaps|thanks|thank you)\.?$/i;
const startsWithConnector = (text: string): boolean => {
    const normalized = text.trim().toLowerCase();
    return /^(and|but|so|or|because|if|when|while|that|to|with|for|of|in)\b/.test(normalized);
};

const hasDanglingConnector = (text: string): boolean => {
    const normalized = text.trim().toLowerCase();
    return /\b(and|but|so|or|because|if|when|while|that|to|with|for|of|in)\s*$/.test(normalized);
};

const shouldMergeWithNext = (text: string): boolean => {
    const wordCount = countWords(text);
    if (hasDanglingEnding(text) || hasDanglingConnector(text)) {
        return true;
    }

    if (wordCount < SEGMENT_MIN_PREFERRED_WORDS && !shortStandaloneSentencePattern.test(text.trim())) {
        return true;
    }

    if (!hasTerminalPunctuation(text) && wordCount < 10) {
        return true;
    }

    return false;
};

const normalizeSplitSegments = (
    segments: Array<{ text: string; translationVi: string; vocabulary: VocabularyItem[] }>,
): Array<{ text: string; translationVi: string; vocabulary: VocabularyItem[] }> => {
    if (segments.length <= 1) {
        return segments;
    }

    const normalized: Array<{ text: string; translationVi: string; vocabulary: VocabularyItem[] }> = [];

    let cursor = 0;
    while (cursor < segments.length) {
        const current = segments[cursor]!;
        const currentText = current.text.trim();
        const next = segments[cursor + 1];

        const shouldMerge = next
            && shouldMergeWithNext(currentText)
            && countWords(currentText) + countWords(next.text) <= SEGMENT_MAX_PREFERRED_WORDS;

        if (shouldMerge) {
            normalized.push({
                text: `${currentText} ${next.text.trim()}`.replace(/\s+/g, ' ').trim(),
                translationVi: `${current.translationVi.trim()} ${next.translationVi.trim()}`.replace(/\s+/g, ' ').trim(),
                vocabulary: mergeVocabulary(current.vocabulary, next.vocabulary),
            });
            cursor += 2;
            continue;
        }

        const currentNormalized = {
            ...current,
            text: currentText,
            translationVi: current.translationVi.trim(),
        };

        const prev = normalized[normalized.length - 1];
        if (
            prev
            && startsWithConnector(currentText)
            && countWords(prev.text) + countWords(currentText) <= SEGMENT_MAX_PREFERRED_WORDS
        ) {
            normalized[normalized.length - 1] = {
                text: `${prev.text} ${currentText}`.replace(/\s+/g, ' ').trim(),
                translationVi: `${prev.translationVi} ${currentNormalized.translationVi}`.replace(/\s+/g, ' ').trim(),
                vocabulary: mergeVocabulary(prev.vocabulary, currentNormalized.vocabulary),
            };
            cursor += 1;
            continue;
        }

        normalized.push(currentNormalized);
        cursor += 1;
    }

    return normalized;
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
    segments: Array<{ text: string; translationVi: string; vocabulary: VocabularyItem[] }>,
    allWords: DeepgramUtteranceWord[],
    transcriptStartMs: number,
    transcriptEndMs: number,
): SentenceSegment[] => {
    let wordCursor = 0;

    return segments.map((segment, index) => {
        const isFirst = index === 0;
        const isLast = index === segments.length - 1;

        const tokenCount = Math.max(1, countWords(segment.text));
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
            text: segment.text.trim(),
            translationVi: segment.translationVi.trim(),
            vocabulary: segment.vocabulary,
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
    const completion = await withTimeout(
        openaiClient.chat.completions.create({
            model: env.OPENAI_MODEL,
            response_format: { type: 'json_object' },
            temperature: 0,             // fully deterministic
            max_completion_tokens: 2048, // increased for full-video transcripts
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: buildUserPrompt(transcript) },
            ],
        }),
        GPT_REQUEST_TIMEOUT_MS,
        'Shadowing GPT sentence split',
    );
    return completion.choices[0]?.message?.content ?? null;
};

let sentenceSplitRequester: SentenceSplitRequester = requestFromOpenAi;

export const __setSentenceSplitRequesterForTest = (
    requester: SentenceSplitRequester | null,
): void => {
    sentenceSplitRequester = requester ?? requestFromOpenAi;
};

const analyzeCueBatchWithGpt = async (sentences: string[]): Promise<CueAnalysis[] | null> => {
    if (sentences.length === 0) {
        return [];
    }

    for (let attempt = 1; attempt <= CUE_ANALYSIS_MAX_RETRIES; attempt += 1) {
        try {
            const completion = await withTimeout(
                openaiClient.chat.completions.create({
                    model: env.OPENAI_MODEL,
                    response_format: { type: 'json_object' },
                    temperature: 0,
                    max_completion_tokens: 2048,
                    messages: [
                        { role: 'system', content: CUE_ANALYSIS_SYSTEM_PROMPT },
                        { role: 'user', content: buildCueAnalysisPrompt(sentences) },
                    ],
                }),
                GPT_REQUEST_TIMEOUT_MS,
                'Shadowing GPT cue analysis',
            );

            const raw = completion.choices[0]?.message?.content ?? null;
            if (!raw) {
                logger.warn('GptSentenceSplitter: empty cue analysis response', { attempt });
                continue;
            }

            const parsed = tryParseJsonObject(raw);
            if (!parsed) {
                logger.warn('GptSentenceSplitter: invalid JSON cue analysis response', {
                    attempt,
                    raw: raw.slice(0, 200),
                });
                continue;
            }

            const validated = GptCueAnalysisResponseSchema.safeParse(parsed);
            if (!validated.success) {
                logger.warn('GptSentenceSplitter: cue analysis schema validation failed', {
                    attempt,
                    issues: validated.error.issues,
                });
                continue;
            }

            if (validated.data.analyses.length < sentences.length) {
                logger.warn('GptSentenceSplitter: cue analysis count mismatch', {
                    attempt,
                    expected: sentences.length,
                    received: validated.data.analyses.length,
                });
                continue;
            }

            if (validated.data.analyses.length > sentences.length) {
                logger.warn('GptSentenceSplitter: cue analysis returned extra items, trimming', {
                    attempt,
                    expected: sentences.length,
                    received: validated.data.analyses.length,
                });
            }

            return validated.data.analyses.slice(0, sentences.length).map((analysis) => ({
                translationVi: analysis.translationVi.trim(),
                vocabulary: analysis.vocabulary,
            }));
        } catch (error) {
            logger.error('GptSentenceSplitter: cue analysis request failed', {
                attempt,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    return null;
};

export const analyzeCueTextsWithGpt = async (sentences: string[]): Promise<CueAnalysis[]> => {
    if (sentences.length === 0) {
        return [];
    }

    const results: CueAnalysis[] = Array.from(
        { length: sentences.length },
        () => ({ ...EMPTY_CUE_ANALYSIS }),
    );

    for (let start = 0; start < sentences.length; start += CUE_ANALYSIS_BATCH_SIZE) {
        const chunk = sentences.slice(start, start + CUE_ANALYSIS_BATCH_SIZE);
        const batchResult = await analyzeCueBatchWithGpt(chunk);

        if (batchResult) {
            batchResult.forEach((analysis, index) => {
                results[start + index] = analysis;
            });
        }
    }

    return results;
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
            translationVi: null,
            vocabulary: [],
            startMs: toMs(u.start ?? 0),
            endMs: toMs(Math.max(u.start ?? 0, u.end ?? u.start ?? 0)),
        }))
        .filter((s) => s.text.length > 0);

const toSegmentFallbackWithAnalysis = async (utterances: DeepgramUtterance[]): Promise<SentenceSegment[]> => {
    const fallbackSegments = toSegmentFallback(utterances);
    if (fallbackSegments.length === 0) {
        return fallbackSegments;
    }

    const analyses = await analyzeCueTextsWithGpt(fallbackSegments.map((segment) => segment.text));
    if (analyses.length !== fallbackSegments.length) {
        return fallbackSegments;
    }

    return fallbackSegments.map((segment, index) => {
        const analysis = analyses[index]!;
        return {
            ...segment,
            translationVi: analysis.translationVi.trim() || null,
            vocabulary: analysis.vocabulary,
        };
    });
};

const splitBlockWithGpt = async (utterances: DeepgramUtterance[]): Promise<SentenceSegment[]> => {
    const blockTranscript = buildBlockTranscript(utterances);
    if (blockTranscript.length === 0) return [];

    const allWords: DeepgramUtteranceWord[] = utterances.flatMap((u) => u.words ?? []);
    const blockStartMs = toMs(utterances[0]?.start ?? 0);
    const lastUtterance = utterances[utterances.length - 1];
    const blockEndMs = toMs(Math.max(lastUtterance?.end ?? 0, lastUtterance?.start ?? 0));

    const fallbackPromise = toSegmentFallbackWithAnalysis(utterances);

    try {
        const raw = await sentenceSplitRequester(blockTranscript);
        if (!raw) {
            logger.warn('GptSentenceSplitter: empty GPT response, using utterances as fallback');
            return await fallbackPromise;
        }

        const parsed = tryParseJsonObject(raw);
        if (!parsed) {
            logger.warn('GptSentenceSplitter: invalid JSON from GPT', { raw: raw.slice(0, 200) });
            return await fallbackPromise;
        }

        const validated = GptSplitResponseSchema.safeParse(parsed);
        if (!validated.success) {
            logger.warn('GptSentenceSplitter: schema validation failed', {
                issues: validated.error.issues,
            });
            return await fallbackPromise;
        }

        const segments = normalizeSplitSegments(validated.data.segments);

        if (allWords.length === 0) {
            const durationMs = Math.max(0, blockEndMs - blockStartMs);
            logger.info('GptSentenceSplitter: no word timestamps, using proportional fallback');
            return segments.map((segment, i) => ({
                text: segment.text.trim(),
                translationVi: segment.translationVi.trim(),
                vocabulary: segment.vocabulary,
                startMs: blockStartMs + Math.round((durationMs * i) / segments.length),
                endMs: blockStartMs + Math.round((durationMs * (i + 1)) / segments.length),
            }));
        }

        return alignSentencesToWords(segments, allWords, blockStartMs, blockEndMs);
    } catch (error) {
        logger.error('GptSentenceSplitter: GPT call failed, using utterances as fallback', {
            preview: blockTranscript.slice(0, 80),
            error: error instanceof Error ? error.message : String(error),
        });
        return await fallbackPromise;
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
