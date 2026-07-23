import { z } from 'zod';

const slugSchema = z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug chỉ gồm chữ thường, số và dấu gạch ngang');

const scenarioSchema = z.object({
    id: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().min(5).max(1000),
    isActive: z.boolean().default(true),
    order: z.number().int().min(0).default(0),
});

const topicBodySchema = z.object({
    slug: slugSchema,
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().min(2).max(300),
    icon: z.string().trim().min(1).max(10).default('✦'),
    isActive: z.boolean().default(true),
    order: z.number().int().min(0).default(0),
    scenarios: z.array(scenarioSchema).max(50).default([]),
});

export const createAiVoiceTopicSchema = z.object({ body: topicBodySchema });

export const updateAiVoiceTopicSchema = z.object({
    params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid topic id') }),
    body: topicBodySchema,
});

export const deleteAiVoiceTopicSchema = z.object({
    params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid topic id') }),
});

export type AiVoiceTopicBody = z.infer<typeof topicBodySchema>;
