# Improvement Plan — Cue Card Splitting (v2)

> **Status:** Replaces the previous regex-only Layer 2 approach.
> **Root problem:** Deepgram's `utterances` mode groups sentences by speaker pause, not by linguistic sentence boundary. The regex splitter (`(?<=[.!?])\s+(?=[A-Z"])`) fails on:
> - Ellipsis / informal speech (`"Hmm... okay."`)
> - Abbreviations that weren't caught (`"St. Paul is..."`)
> - Quoted dialogue (`"'No,' she said. 'Not today.'"`)
> - Run-on sentences without clear punctuation

---

## New Strategy: Deepgram → GPT-5.4-mini Hybrid Pipeline

### Why GPT-5.4-mini?

| Approach | Accuracy | Speed | Cost |
|---|---|---|---|
| Regex split (current) | ~65% | Instant | Free |
| `smart_format + paragraphs` only | ~75% | Instant | Free |
| **GPT-5.4-mini post-pass** | **~97%** | ~300ms/utterance | ~$0.0001/video |

The OpenAI API key and model (`gpt-5.4-mini-2026-03-17`) are **already configured** in `server/.env` via `OPENAI_MODEL`. No new secrets needed.

---

## Architecture

```
YouTube URL
    │
    ▼
YtDlpService.extractAudio()          — download audio
    │
    ▼
Deepgram Nova-2                      — word-level timestamps
  ┌─────────────────────────────┐
  │ utterances[]                │
  │  { transcript, start, end,  │
  │    words[{ word, start, end}]}│
  └─────────────────────────────┘
    │
    ▼
GptSentenceSplitterService           — NEW: one call per utterance
  ┌────────────────────────────────────────────────────────────┐
  │ Input:  utterance.transcript + utterance.words[]           │
  │ Output: [{ sentence, startMs, endMs }]                     │
  │ Model:  env.OPENAI_MODEL (gpt-5.4-mini-2026-03-17)        │
  │ Format: response_format: { type: 'json_object' }           │
  └────────────────────────────────────────────────────────────┘
    │
    ▼
IShadowingCue[]  { id, text, startMs, endMs }
    │
    ▼
MongoDB (shadowingVideoRepo.markAsReady)
```

---

## Implementation

### Step 1 — Create `gpt-sentence-splitter.service.ts`

**File:** `server/src/services/gpt-sentence-splitter.service.ts`

This service takes a single Deepgram utterance and asks GPT to split it into
natural, shadowable sentences, then maps each sentence back to word-level timestamps.

```typescript
import OpenAI from 'openai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { DeepgramUtterance } from './deepgram-sentence-splitter.js';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const GptSplitResponseSchema = z.object({
    sentences: z.array(z.string().min(1)).min(1),
});

type GptSplitResponse = z.infer<typeof GptSplitResponseSchema>;

export interface SentenceSegment {
    text: string;
    startMs: number;
    endMs: number;
}

const SYSTEM_PROMPT = `You are a linguistic segmentation assistant for an English shadowing app.
Given a transcript from automatic speech recognition (ASR), split it into natural,
breath-sized sentences that a language learner can shadow one at a time.

Rules:
- Each sentence should be 1 complete thought (subject + predicate).
- Maximum ~20 words per sentence. If a sentence is longer, split at a natural clause boundary.
- Do NOT merge sentences. Do NOT paraphrase — keep the exact original words.
- Return ONLY valid JSON: { "sentences": ["sentence 1", "sentence 2", ...] }
- If the transcript is already a single sentence, return it as-is in the array.`;

const buildUserPrompt = (transcript: string): string =>
    `Split this transcript into shadowable sentences:\n\n"${transcript}"`;

const toMs = (seconds: number): number => Math.max(0, Math.round(seconds * 1000));

/**
 * Maps GPT-produced sentence strings back to Deepgram word-level timestamps.
 * Consumes words from the array in order, one sentence at a time.
 */
const alignSentencesToWords = (
    sentences: string[],
    words: NonNullable<DeepgramUtterance['words']>,
    utteranceStartMs: number,
    utteranceEndMs: number,
): SentenceSegment[] => {
    let wordCursor = 0;

    return sentences.map((sentence, index) => {
        const tokenCount = (sentence.match(/\S+/g) ?? []).length;
        const firstWordIndex = Math.min(wordCursor, words.length - 1);
        const lastWordIndex = Math.min(wordCursor + tokenCount - 1, words.length - 1);

        const firstWord = words[firstWordIndex];
        const lastWord = words[lastWordIndex];

        wordCursor = lastWordIndex + 1;

        const isFirst = index === 0;
        const isLast = index === sentences.length - 1;

        const startMs = isFirst
            ? utteranceStartMs
            : toMs(firstWord?.start ?? utteranceStartMs / 1000);
        const endMs = isLast
            ? utteranceEndMs
            : toMs(lastWord?.end ?? utteranceEndMs / 1000);

        return { text: sentence.trim(), startMs, endMs: Math.max(startMs, endMs) };
    });
};

/**
 * Uses GPT-5.4-mini to intelligently split one Deepgram utterance into
 * individual shadowable sentences with accurate timestamps.
 * Falls back to the raw utterance on any error.
 */
export const splitWithGpt = async (utterance: DeepgramUtterance): Promise<SentenceSegment[]> => {
    const rawText = utterance.transcript?.trim() ?? '';
    if (rawText.length === 0) return [];

    const utteranceStartMs = toMs(utterance.start ?? 0);
    const utteranceEndMs = toMs(
        Math.max(utterance.start ?? 0, utterance.end ?? utterance.start ?? 0),
    );
    const fallback: SentenceSegment[] = [
        { text: rawText, startMs: utteranceStartMs, endMs: utteranceEndMs },
    ];

    try {
        const completion = await openaiClient.chat.completions.create({
            model: env.OPENAI_MODEL,
            response_format: { type: 'json_object' },
            temperature: 0,        // deterministic — no creative variation
            max_tokens: 512,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: buildUserPrompt(rawText) },
            ],
        });

        const raw = completion.choices[0]?.message?.content;
        if (!raw) return fallback;

        let parsed: unknown;
        try {
            parsed = JSON.parse(raw);
        } catch {
            logger.warn('GptSentenceSplitter: invalid JSON from GPT', { raw });
            return fallback;
        }

        const validated = GptSplitResponseSchema.safeParse(parsed);
        if (!validated.success) {
            logger.warn('GptSentenceSplitter: schema validation failed', { parsed });
            return fallback;
        }

        const { sentences } = validated.data as GptSplitResponse;

        if (sentences.length === 1) {
            return [{ text: sentences[0]!.trim(), startMs: utteranceStartMs, endMs: utteranceEndMs }];
        }

        const words = utterance.words ?? [];
        if (words.length === 0) {
            // Proportional fallback when Deepgram has no word timestamps
            const durationMs = utteranceEndMs - utteranceStartMs;
            return sentences.map((text, i) => ({
                text: text.trim(),
                startMs: utteranceStartMs + Math.round((durationMs * i) / sentences.length),
                endMs: utteranceStartMs + Math.round((durationMs * (i + 1)) / sentences.length),
            }));
        }

        return alignSentencesToWords(sentences, words, utteranceStartMs, utteranceEndMs);
    } catch (error) {
        logger.error('GptSentenceSplitter: GPT call failed, using raw utterance', {
            transcript: rawText.slice(0, 80),
            error,
        });
        return fallback;
    }
};
```

---

### Step 2 — Update `deepgram.service.ts`

Replace the call to the old regex splitter with the GPT splitter.
Process utterances **concurrently** (capped by `AI_ANALYSIS_CONCURRENCY`) to stay fast.

```typescript
// server/src/services/deepgram.service.ts

import fs from 'node:fs/promises';
import { createClient as createDeepgramClient } from '@deepgram/sdk';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import type { IShadowingCue } from '../models/mongo/shadowing-video.model.js';
import { logger } from '../utils/logger.js';
import { splitWithGpt } from './gpt-sentence-splitter.service.js';  // ← CHANGED

const deepgramClient = createDeepgramClient(env.DEEPGRAM_API_KEY);

/** Thin concurrency pool — process N utterances in parallel. */
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

export class DeepgramService {
    static async transcribe(filePath: string): Promise<IShadowingCue[]> {
        try {
            const audioBuffer = await fs.readFile(filePath);
            const response = await deepgramClient.listen.prerecorded.transcribeFile(audioBuffer, {
                model: 'nova-2',
                utterances: true,
                punctuate: true,
                words: true,
                smart_format: true,
                paragraphs: true,
            });

            if (response.error) {
                throw new AppError('Deepgram transcription failed', HttpStatus.BAD_GATEWAY);
            }

            const utterances = response.result?.results?.utterances ?? [];

            // GPT splits each utterance concurrently
            const segmentGroups = await mapConcurrent(
                utterances,
                (u) => splitWithGpt({
                    transcript: u.transcript,
                    start: u.start,
                    end: u.end,
                    words: u.words?.map((w) => ({ word: w.word, start: w.start, end: w.end })),
                }),
                env.AI_ANALYSIS_CONCURRENCY,
            );

            const cues: IShadowingCue[] = segmentGroups
                .flat()
                .filter((s) => s.text.length > 0)
                .map((s, index) => ({
                    id: `cue-${index}`,
                    text: s.text,
                    startMs: s.startMs,
                    endMs: s.endMs,
                }));

            return cues;
        } catch (error) {
            logger.error('Deepgram transcription error', { filePath, error });
            if (error instanceof AppError) throw error;
            throw new AppError('Deepgram transcription failed', HttpStatus.BAD_GATEWAY);
        } finally {
            try {
                await fs.unlink(filePath);
            } catch (error) {
                logger.warn('Could not remove temporary shadowing audio file', { filePath, error });
            }
        }
    }
}
```

---

### Step 3 — `env.ts` (no change needed)

`OPENAI_MODEL` and `AI_ANALYSIS_CONCURRENCY` are already validated in `server/src/config/env.ts`:

```typescript
OPENAI_MODEL: z.string().default('gpt-5.4-mini-2026-03-17'),
AI_ANALYSIS_CONCURRENCY: z.coerce.number().int().min(1).max(20).default(5),
```

✅ **No env.ts changes needed.**

---

### Step 4 — Retire `deepgram-sentence-splitter.ts` (partial)

The file is **kept** because it exports shared types (`DeepgramUtterance`, `DeepgramUtteranceWord`)
imported by the new GPT service. Only the `splitUtteranceIntoSentences` function becomes unused.

- Do **not** delete the file.
- The unused function can be removed or left for reference.

---

### Step 5 — Client-side safety guard (unchanged from v1)

**File:** `client/src/features/dashboard/shadowing/components/CueDisplay/CueDisplay.tsx`

```tsx
{cue.text.length > 200 && (
    <p className={styles.cueWarning} role="note">
        ⚠ This segment is long — take it slowly.
    </p>
)}
```

**File:** `client/src/features/dashboard/shadowing/components/CueDisplay/CueDisplay.module.css`

```css
.cueWarning {
    font-size: 12px;
    color: var(--color-warning, #f59e0b);
    margin-top: 6px;
}
```

---

## Files to Change

| File | Change |
|---|---|
| `server/src/services/gpt-sentence-splitter.service.ts` | **Create** — new GPT-based splitter |
| `server/src/services/deepgram.service.ts` | **Update** — replace regex splitter with GPT splitter + `mapConcurrent` |
| `server/src/services/deepgram-sentence-splitter.ts` | **Keep** (types still used); `splitUtteranceIntoSentences` becomes unused |
| `client/.../CueDisplay/CueDisplay.tsx` | **Update** — add long-cue warning |
| `client/.../CueDisplay/CueDisplay.module.css` | **Update** — add `.cueWarning` style |

> **No schema changes.** `IShadowingCue` shape is unchanged — GPT splitting just produces more items.
> **No client hook changes.** `useShadowingMachine` and `useYtPlayer` operate on `Cue[]` transparently.

---

## Edge Cases

| Case | Behaviour |
|---|---|
| GPT returns invalid JSON | Logger warning + fallback to raw utterance as one cue |
| GPT returns empty `sentences[]` | Zod schema fails → fallback |
| Utterance has no Deepgram `words[]` | Proportional timestamp fallback |
| Single-sentence utterance | GPT returns 1-item array → no timestamp change |
| OpenAI API timeout / 429 | `catch` block returns fallback, pipeline continues |
| GPT hallucinates different words | `temperature: 0` minimizes this; timestamps are always derived from Deepgram `words[]` |

---

## Acceptance Criteria

- [ ] A video where Deepgram returned a 3-sentence utterance now produces **3 separate cue cards**
- [ ] Each cue's `startMs` / `endMs` is aligned to Deepgram word boundaries (not estimated)
- [ ] GPT API failure does **not** crash the pipeline — video still gets cues (unsplit utterance as fallback)
- [ ] CueDisplay shows the long-cue warning when `text.length > 200`
- [ ] `AI_ANALYSIS_CONCURRENCY` controls max parallel GPT calls during a single video transcription
- [ ] Unit test for `alignSentencesToWords()` with 2-sentence and 3-sentence cases
- [ ] Unit test for fallback paths (no `words[]`, GPT error, invalid JSON)

---

## Implementation Order

```
Step 1 (be-dev): Create gpt-sentence-splitter.service.ts
Step 2 (be-dev): Update deepgram.service.ts (replace import + add mapConcurrent)
Step 3 (be-dev): Verify env.ts — OPENAI_MODEL + AI_ANALYSIS_CONCURRENCY (no change expected)
Step 4 (be-dev): Write unit tests (happy path + all fallbacks)
Step 5 (fe-dev): Add CueDisplay long-cue warning + CSS (can run parallel with Step 4)
```

*Last Updated: 2026-05-05*
