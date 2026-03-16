import { z } from 'zod';

const languageCodeSchema = z.string().min(2).max(10).regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code format');
const audioPathSchema = z.union([z.string().url(), z.string().startsWith('/')]);

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
        greeting: z.string().min(1).max(300).optional(),
        greetingSound: audioPathSchema.optional(),
        flagIconUrl: z.string().url().optional(),
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
            greeting: z.string().min(1).max(300).nullable().optional(),
            greetingSound: audioPathSchema.nullable().optional(),
            flagIconUrl: z.string().url().nullable().optional(),
            isActive: z.boolean().optional(),
        })
        .refine((body) => Object.keys(body).length > 0, 'At least one field is required'),
});

export const toggleLanguageStatusSchema = z.object({
    params: z.object({
        code: languageCodeSchema,
    }),
});

export type GetLanguagesQuery = z.infer<typeof getLanguagesSchema>['query'];
export type CreateLanguageBody = z.infer<typeof createLanguageSchema>['body'];
export type UpdateLanguageBody = z.infer<typeof updateLanguageSchema>['body'];
