import { z } from 'zod';

const languageCodeSchema = z.string().min(2).max(10).regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code format');

const ttsConfigSchema = z.object({
    provider: z.enum(['OPENAI', 'AZURE', 'ELEVENLABS']),
    voiceId: z.string().min(1).max(128).optional(),
    style: z.string().min(1).max(64).optional(),
    speed: z.number().min(0.8).max(1.2).default(1),
});

export const getLanguagesSchema = z.object({
    query: z.object({
        isActive: z
            .enum(['true', 'false'])
            .optional()
            .transform((value) => (value === undefined ? undefined : value === 'true')),
        search: z.string().optional(),
    }),
});

export const getLanguageByCodeSchema = z.object({
    params: z.object({
        code: languageCodeSchema,
    }),
});

export const createLanguageSchema = z.object({
    body: z.object({
        code: languageCodeSchema,
        name: z.string().min(2).max(100),
        nativeName: z.string().min(2).max(100),
        flagIconUrl: z.string().url().optional(),
        ttsConfig: ttsConfigSchema,
        isActive: z.boolean().default(true),
    }),
});

export const updateLanguageSchema = z.object({
    params: z.object({
        code: languageCodeSchema,
    }),
    body: z
        .object({
            name: z.string().min(2).max(100).optional(),
            nativeName: z.string().min(2).max(100).optional(),
            flagIconUrl: z.string().url().nullable().optional(),
            ttsConfig: ttsConfigSchema.partial().optional(),
            isActive: z.boolean().optional(),
        })
        .refine((body) => Object.keys(body).length > 0, 'At least one field is required'),
});

export const toggleLanguageStatusSchema = z.object({
    params: z.object({
        code: languageCodeSchema,
    }),
});

export const testLanguageVoiceSchema = z.object({
    params: z.object({
        code: languageCodeSchema,
    }),
    body: z.object({
        text: z.string().min(1).max(300),
        provider: z.enum(['OPENAI', 'AZURE', 'ELEVENLABS']),
        voiceId: z.string().min(1).max(128),
        style: z.string().max(64).optional(),
        speed: z.number().min(0.8).max(1.2).default(1),
    }),
});

export type GetLanguagesQuery = z.infer<typeof getLanguagesSchema>['query'];
export type CreateLanguageBody = z.infer<typeof createLanguageSchema>['body'];
export type UpdateLanguageBody = z.infer<typeof updateLanguageSchema>['body'];
export type TestLanguageVoiceBody = z.infer<typeof testLanguageVoiceSchema>['body'];
