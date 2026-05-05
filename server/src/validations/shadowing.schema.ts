import { z } from 'zod';

const youtubeHostPattern = /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i;
const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;

const hasYoutubeHost = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return youtubeHostPattern.test(parsed.hostname);
    } catch {
        return false;
    }
};

export const submitVideoSchema = z.object({
    body: z.object({
        url: z
            .string()
            .url('Invalid URL')
            .refine((value) => hasYoutubeHost(value), 'URL must be a valid YouTube link'),
    }),
});

export const videoIdParamSchema = z.object({
    params: z.object({
        videoId: z
            .string()
            .regex(youtubeVideoIdPattern, 'Invalid YouTube videoId'),
    }),
});

export const listVideosSchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(50).default(12),
    }),
});

export const scorePronunciationSchema = z.object({
    body: z.object({
        referenceText: z.string().trim().min(1, 'referenceText is required').max(1000),
    }),
});

export const updateCuesSchema = z.object({
    params: z.object({
        videoId: z
            .string()
            .regex(youtubeVideoIdPattern, 'Invalid YouTube videoId'),
    }),
    body: z.object({
        cues: z.array(z.object({
            id: z.string().trim().min(1),
            text: z.string().trim().min(1).max(2000),
            startMs: z.number().int().min(0),
            endMs: z.number().int().min(0),
        }).superRefine((cue, ctx) => {
            if (cue.endMs < cue.startMs) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: 'endMs must be greater than or equal to startMs',
                    path: ['endMs'],
                });
            }
        })).min(1),
    }),
});

export type SubmitVideoBody = z.infer<typeof submitVideoSchema>['body'];
export type ScorePronunciationBody = z.infer<typeof scorePronunciationSchema>['body'];
export type UpdateCuesBody = z.infer<typeof updateCuesSchema>['body'];
