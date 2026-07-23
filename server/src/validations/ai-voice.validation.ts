import { z } from 'zod';

export const AI_VOICE_LEVELS = ['free-level', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2'] as const;
const aiVoiceTopicSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const aiVoiceChatHistoryItemSchema = z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(1000),
});

export const aiVoiceScenarioSchema = z.object({
    id: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().min(1).max(1000),
});

export const aiVoiceSttSchema = z.object({
    body: z.object({
        sessionId: z.string().uuid('Invalid sessionId'),
    }),
});

export const aiVoiceChatSchema = z.object({
    body: z.object({
        sessionId: z.string().uuid('Invalid sessionId'),
        scenario: aiVoiceScenarioSchema,
        transcript: z.string().trim().min(1, 'transcript is required').max(1000, 'transcript is too long'),
        chatHistory: z.array(aiVoiceChatHistoryItemSchema).max(50, 'chatHistory exceeds 50 items').default([]),
        level: z.enum(AI_VOICE_LEVELS),
        topic: aiVoiceTopicSchema,
    }),
});

export const aiVoiceTtsSchema = z.object({
    body: z.object({
        text: z.string().trim().min(1, 'text is required').max(2000, 'text is too long'),
    }),
});

export const aiVoiceAssessmentSchema = z.object({
    body: z.object({
        sessionId: z.string().uuid('Invalid sessionId'),
        scenario: z.string().min(1).max(5000),
        level: z.enum(AI_VOICE_LEVELS),
        topic: aiVoiceTopicSchema,
        turns: z.string().min(2).max(50_000),
    }),
});

export type AiVoiceLevel = (typeof AI_VOICE_LEVELS)[number];
export type AiVoiceTopic = z.infer<typeof aiVoiceTopicSchema>;

export type AiVoiceScenario = z.infer<typeof aiVoiceScenarioSchema>;
export type AiVoiceChatHistoryItem = z.infer<typeof aiVoiceChatHistoryItemSchema>;

export type AiVoiceSttBody = z.infer<typeof aiVoiceSttSchema>['body'];
export type AiVoiceChatBody = z.infer<typeof aiVoiceChatSchema>['body'];
export type AiVoiceTtsBody = z.infer<typeof aiVoiceTtsSchema>['body'];
export type AiVoiceAssessmentBody = z.infer<typeof aiVoiceAssessmentSchema>['body'];
