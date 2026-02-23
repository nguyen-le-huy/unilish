import { z } from 'zod';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;
const objectIdSchema = z.string().regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

// ─── Grammar sub-schemas ──────────────────────────────────────────────────────

const highlightInfoSchema = z.object({
    id: z.string().min(1),
    word: z.string().min(1, 'Từ highlight không được để trống').max(100).trim(),
    type: z.enum(['regular_verb', 'irregular_verb', 'grammar_particle', 'other']),
    root: z.string().min(1, 'Từ gốc không được để trống').max(100).trim(),
});

const contextStorySchema = z.object({
    text: z.string().min(1, 'Nội dung câu chuyện không được để trống').max(3000).trim(),
    translation: z.string().min(1, 'Dịch nghĩa không được để trống').max(3000).trim(),
    audioUrl: z.string().nullable().default(null),
    highlights: z.array(highlightInfoSchema).max(30, 'Tối đa 30 highlights'),
});

const grammarFormulaSchema = z.object({
    id: z.string().min(1),
    type: z.enum(['positive', 'negative', 'question', 'other']),
    structure: z.string().min(1, 'Cấu trúc không được để trống').max(200).trim(),
    example: z.string().min(1, 'Câu ví dụ không được để trống').max(500).trim(),
});

const irregularVerbSchema = z.object({
    id: z.string().min(1),
    base: z.string().min(1, 'Dạng gốc không được để trống').max(100).trim(),
    past: z.string().min(1, 'Dạng quá khứ không được để trống').max(100).trim(),
});

const grammarRuleSchema = z.object({
    name: z.string().min(1, 'Tên ngữ pháp không được để trống').max(200).trim(),
    usage: z.string().min(1, 'Mô tả cách dùng không được để trống').max(1000).trim(),
    formulas: z.array(grammarFormulaSchema).max(10, 'Tối đa 10 công thức'),
    irregular_verbs: z.array(irregularVerbSchema).max(50, 'Tối đa 50 động từ bất quy tắc'),
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
        context_story: contextStorySchema,
        grammar_rule: grammarRuleSchema,
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
        count: z.number().int().min(1).max(20).default(5),
        types: z
            .array(z.enum(['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'TRUE_FALSE', 'MATCHING'] as const))
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
