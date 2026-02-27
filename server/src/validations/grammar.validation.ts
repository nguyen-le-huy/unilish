import { z } from 'zod';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');
const cefrSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);

// ─── Grammar sub-schemas ──────────────────────────────────────────────────────

const grammarExampleSchema = z.object({
    en: z.string().min(1).max(500).trim(),
    vi: z.string().min(1).max(500).trim(),
});

const inlineQuizQuestionSchema = z.object({
    id: z.string().min(1),
    stem: z.string().min(1).max(500).trim(),
    type: z.enum(['MULTIPLE_CHOICE', 'FILL_IN_BLANK']),
    options: z.array(z.string().min(1).max(150).trim()).max(6).optional(),
    correct: z.string().min(1).max(150).trim(),
    acceptedAnswers: z.array(z.string().min(1).max(150).trim()).max(6).optional(),
    explanation: z.string().min(1).max(500).trim(),
});

const explanationBlockSchema = z.object({
    id: z.string().min(1),
    type: z.literal('EXPLANATION'),
    heading: z.string().min(1).max(200).trim(),
    body: z.string().min(1).max(2000).trim(),
    examples: z.array(grammarExampleSchema).min(1).max(8),
    highlightPattern: z.string().min(1).max(500).trim(),
});

const inlineQuizBlockSchema = z.object({
    id: z.string().min(1),
    type: z.literal('INLINE_QUIZ'),
    instruction: z.string().min(1).max(200).trim(),
    questions: z.array(inlineQuizQuestionSchema).min(1).max(3),
});

const calloutBlockSchema = z.object({
    id: z.string().min(1),
    type: z.literal('CALLOUT'),
    variant: z.enum(['TIP', 'WARNING', 'EXAMPLE', 'UNIT_CONTEXT']),
    text: z.string().min(1).max(1000).trim(),
});

const unitContextBlockSchema = z.object({
    id: z.string().min(1),
    type: z.literal('UNIT_CONTEXT_BLOCK'),
    heading: z.string().min(1).max(200).trim(),
    note: z.string().min(1).max(400).trim(),
    examples: z.array(grammarExampleSchema).min(1).max(8),
});

const grammarBlockSchema = z.discriminatedUnion('type', [
    explanationBlockSchema,
    inlineQuizBlockSchema,
    calloutBlockSchema,
    unitContextBlockSchema,
]);

const grammarHeroSchema = z.object({
    hook: z.string().min(1).max(500).trim(),
    contextSentences: z.array(z.string().min(1).max(300).trim()).min(1).max(6),
});

const summaryTableSchema = z.object({
    columns: z.tuple([
        z.string().min(1).max(100).trim(),
        z.string().min(1).max(100).trim(),
        z.string().min(1).max(100).trim(),
    ]),
    rows: z.array(z.tuple([
        z.string().min(1).max(120).trim(),
        z.string().min(1).max(240).trim(),
        z.string().min(1).max(240).trim(),
    ])).min(1).max(20),
});

// ─── GET /lessons/:lessonId/grammar/content ───────────────────────────────────

export const getGrammarContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

export type GetGrammarContentParams = z.infer<typeof getGrammarContentSchema>['params'];

// ─── PUT /lessons/:lessonId/grammar/content ───────────────────────────────────

export const saveGrammarContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        level: cefrSchema,
        readingTime: z.number().int().min(1).max(60),
        conceptName: z.string().min(1).max(200).trim(),
        hero: grammarHeroSchema,
        blocks: z.array(grammarBlockSchema).min(1).max(50),
        summaryTable: summaryTableSchema,
        practiceConfig: z.object({
            mode: z.literal('FIXED'),
            passingScore: z.number().int().min(0).max(100).default(80),
        }),
        taughtConcepts: z.array(z.string()).default([]),
    }),
});

export type SaveGrammarContentBody = z.infer<typeof saveGrammarContentSchema>['body'];

// ─── POST /lessons/:lessonId/grammar/generate-story ───────────────────────────

export const generateGrammarStorySchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        grammarName: z.string().min(1, 'Tên ngữ pháp không được để trống').max(200).trim(),
        level: cefrSchema.default('A2'),
        selectedVocab: z
            .array(z.string().min(1).max(100).trim())
            .max(20, 'Tối đa 20 từ vựng')
            .default([]),
    }),
});

export type GenerateGrammarStoryBody = z.infer<typeof generateGrammarStorySchema>['body'];

// ─── POST /lessons/:lessonId/grammar/generate-questions ──────────────────────

export const generateGrammarQuestionsSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        count: z.number().int().min(1).max(20).default(10),
        types: z
            .array(z.enum(['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'ERROR_CORRECTION'] as const))
            .min(1)
            .optional(),
    }),
});

export type GenerateGrammarQuestionsBody = z.infer<typeof generateGrammarQuestionsSchema>['body'];

// ─── POST /lessons/:lessonId/grammar/generate-audio ──────────────────────────

export const generateGrammarAudioSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── GET /lessons/:lessonId/grammar/questions ─────────────────────────────────

export const getGrammarQuestionsSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── POST /lessons/:lessonId/grammar/questions/:questionId/swap ───────────────

export const swapGrammarQuestionSchema = z.object({
    params: z.object({
        lessonId: objectIdSchema,
        questionId: objectIdSchema,
    }),
});

// ─── PUT /lessons/:lessonId/grammar/questions/:questionId ────────────────────

export const updateGrammarQuestionSchema = z.object({
    params: z.object({
        lessonId: objectIdSchema,
        questionId: objectIdSchema,
    }),
    body: z.object({
        stem: z.object({
            text: z.string().min(1).max(1000).trim().optional(),
            audioUrl: z.string().nullable().optional(),
        }).optional(),
        explanation: z.string().max(1000).nullable().optional(),
        content: z.record(z.string(), z.unknown()).optional(),
    }),
});

export type UpdateGrammarQuestionBody = z.infer<typeof updateGrammarQuestionSchema>['body'];

// ─── DELETE /lessons/:lessonId/grammar/questions/:questionId ─────────────────

export const deleteGrammarQuestionSchema = z.object({
    params: z.object({
        lessonId: objectIdSchema,
        questionId: objectIdSchema,
    }),
});
