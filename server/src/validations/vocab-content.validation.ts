import { z } from 'zod';

// ─── Shared Primitives ────────────────────────────────────────────────────────

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

const objectIdSchema = z.string().regex(OBJECT_ID_REGEX, 'ID không hợp lệ (phải là ObjectId)');

// ─── VocabItem Schema ─────────────────────────────────────────────────────────

const vocabItemSchema = z.object({
    id: z.string().min(1, 'Item ID is required'),
    word: z.string().min(1, 'Từ vựng không được để trống').max(100).trim(),
    partOfSpeech: z.enum(['noun', 'verb', 'adjective', 'adverb', 'phrase', 'other']),
    ipa: z.string().max(100).default(''),
    definitionNative: z.string().min(1, 'Định nghĩa native không được để trống').max(300).trim(),
    definitionEn: z.string().min(1, 'Định nghĩa tiếng Anh không được để trống').max(300).trim(),
    exampleSentence: z.string().min(5, 'Câu ví dụ phải có ít nhất 5 ký tự').max(500).trim(),
    exampleTranslation: z.string().min(1, 'Dịch nghĩa không được để trống').max(500).trim(),
    audioWordUrl: z.string().nullable().default(null),
    audioSentenceUrl: z.string().nullable().default(null),
    imageUrl: z.string().nullable().default(null),
    conceptId: z
        .string()
        .regex(OBJECT_ID_REGEX, 'conceptId phải là ObjectId')
        .nullable()
        .default(null),
});

// ─── Save Vocab Content ───────────────────────────────────────────────────────
// PUT /curriculum/lessons/:lessonId/vocab/content

export const saveVocabContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        scenario: z.string().max(1000).trim().default(''),
        generationStatus: z.enum(['IDLE', 'GENERATING', 'GENERATING_AUDIO', 'DONE', 'ERROR']),
        items: z
            .array(vocabItemSchema)
            .max(50, 'Tối đa 50 từ vựng mỗi bài'),
    }),
});

// ─── Generate Vocab ───────────────────────────────────────────────────────────
// POST /curriculum/lessons/:lessonId/vocab/generate

export const generateVocabSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        wordCount: z
            .number()
            .int()
            .min(3, 'Tối thiểu 3 từ')
            .max(20, 'Tối đa 20 từ')
            .optional(),
        wordList: z
            .array(z.string().min(1).max(100).trim())
            .max(20, 'Tối đa 20 từ trong danh sách')
            .optional(),
    }),
});

// ─── Get Vocab Content ────────────────────────────────────────────────────────
// GET /curriculum/lessons/:lessonId/vocab/content

export const getVocabContentSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── Get Generation Status ────────────────────────────────────────────────────
// GET /curriculum/lessons/:lessonId/vocab/status

export const getVocabStatusSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── Regenerate Audio ─────────────────────────────────────────────────────────
// POST /curriculum/lessons/:lessonId/vocab/items/:itemId/regenerate-audio

export const regenerateAudioSchema = z.object({
    params: z.object({
        lessonId: objectIdSchema,
        itemId: z.string().min(1, 'itemId là bắt buộc'),
    }),
    body: z.object({
        target: z.enum(['word', 'sentence']),
    }),
});

// ─── Generate All Audio ───────────────────────────────────────────────────────
// POST /curriculum/lessons/:lessonId/vocab/generate-audio

export const generateAllAudioSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
});

// ─── Generate Questions ───────────────────────────────────────────────────────
// POST /curriculum/lessons/:lessonId/vocab/generate-questions

export const generateQuestionsSchema = z.object({
    params: z.object({ lessonId: objectIdSchema }),
    body: z.object({
        quantity: z
            .number()
            .int()
            .min(3, 'Tối thiểu 3 câu hỏi')
            .max(20, 'Tối đa 20 câu hỏi')
            .default(10),
    }),
});

// ─── Exported Types ───────────────────────────────────────────────────────────

export type GenerateVocabBody = z.infer<typeof generateVocabSchema>['body'];
export type SaveVocabContentBody = z.infer<typeof saveVocabContentSchema>['body'];
export type RegenerateAudioBody = z.infer<typeof regenerateAudioSchema>['body'];
export type GenerateQuestionsBody = z.infer<typeof generateQuestionsSchema>['body'];
