import { z } from 'zod';

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

export const manualQuestionSchema = z.object({
    question: z.string().min(1, 'Nhập câu hỏi'),
    optionA: z.string().min(1, 'Nhập đáp án A'),
    optionB: z.string().min(1, 'Nhập đáp án B'),
    optionC: z.string().min(1, 'Nhập đáp án C'),
    optionD: z.string().min(1, 'Nhập đáp án D'),
    correctOption: z.enum(['A', 'B', 'C', 'D']).default('A'),
    explanation: z.string().optional().default(''),
    transcript: z.string().optional().default(''),
    mediaUrl: z.string().url('URL media không hợp lệ').optional().or(z.literal('')),
    imageUrl: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
    imageUrls: z.array(z.string().url('URL ảnh không hợp lệ')).default([]),
    audioUrl: z.string().url('URL audio không hợp lệ').optional().or(z.literal('')),
});

export const partSchema = z.object({
    part: z.coerce.number().min(1),
    name: z.string().min(1),
    questionsCount: z.coerce.number().min(1).default(1),
    poolTag: z.string().min(1),
    groupPattern: z.array(z.coerce.number().int().min(2).max(7)).default([]),
    sharedAudioUrl: z.string().url('URL audio không hợp lệ').optional().or(z.literal('')).default(''),
    excludeRecentDays: z.coerce.number().min(0).default(30),
    manualQuestions: z.array(manualQuestionSchema).default([]),
});

export const mcqModuleSchema = z.object({
    name: z.string().min(1, 'Bắt buộc'),
    timeLimitMinutes: z.coerce.number().min(1),
    showCountdown: z.boolean().default(true),
    allowBackNavigation: z.boolean().default(false),
    adaptive: z.boolean().default(false),
    parts: z.array(partSchema).min(1, 'Cần ít nhất 1 part'),
});

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type MCQModuleFormValues = z.infer<typeof mcqModuleSchema>;
export type PartFormValues = z.infer<typeof partSchema>;
export type ManualQuestionFormValues = z.infer<typeof manualQuestionSchema>;
