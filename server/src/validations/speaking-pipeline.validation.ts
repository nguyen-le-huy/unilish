import { z } from 'zod';

const OBJECT_ID_REGEX = /^[a-f\d]{24}$/i;

export const speakingSttSchema = z.object({
    body: z.object({
        lessonId: z.string().regex(OBJECT_ID_REGEX, 'Invalid lessonId'),
    }),
});

export const speakingChatSchema = z.object({
    body: z.object({
        lessonId: z.string().regex(OBJECT_ID_REGEX, 'Invalid lessonId'),
        transcript: z.string().trim().min(1, 'transcript is required'),
        chatHistory: z.array(
            z.object({
                role: z.enum(['user', 'assistant']),
                content: z.string().trim().min(1),
            }),
        ).default([]),
        pronunciationContext: z.string().trim().optional(),
    }),
});

export const speakingTtsSchema = z.object({
    body: z.object({
        lessonId: z.string().regex(OBJECT_ID_REGEX, 'Invalid lessonId'),
        text: z.string().trim().min(1, 'text is required'),
        voiceId: z.string().trim().optional(),
    }),
});

export type SpeakingSttBody = z.infer<typeof speakingSttSchema>['body'];
export type SpeakingChatBody = z.infer<typeof speakingChatSchema>['body'];
export type SpeakingTtsBody = z.infer<typeof speakingTtsSchema>['body'];
