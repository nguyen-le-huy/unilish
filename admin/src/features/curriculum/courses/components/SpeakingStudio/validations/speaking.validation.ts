import { z } from 'zod';

export const AIConfigSchema = z.object({
    roleName: z.string().optional(),
    firstMessage: z.string().optional(),
    systemInstruction: z.string().optional(),
});

export const KeywordConceptMapSchema = z.object({
    word: z.string().optional(),
    conceptId: z.string().optional(),
});

export const GradingConfigSchema = z.object({
    referenceText: z.string().nullable(),
    gradingSystem: z.enum(['FivePoint', 'HundredMark']),
    granularity: z.enum(['Phoneme', 'Word', 'Syllable']),
    enableProsodyAssessment: z.boolean(),
    requiredKeywords: z.array(z.string()),
    keywordConceptMap: z.array(KeywordConceptMapSchema),
});

export const SpeakingHintSchema = z.object({
    vi: z.string().optional(),
    en: z.string().optional(),
});

export const SpeakingLessonFormSchema = z.object({
    missionTitle: z.string().optional(),
    missionDescription: z.string().optional(),
    aiConfig: AIConfigSchema,
    gradingConfig: GradingConfigSchema,
    hints: z.array(SpeakingHintSchema),
});

export type SpeakingLessonFormValues = z.infer<typeof SpeakingLessonFormSchema>;
