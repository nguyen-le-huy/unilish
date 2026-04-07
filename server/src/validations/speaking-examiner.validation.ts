import { z } from 'zod';

export const getExaminerVoiceSchema = z.object({
    query: z.object({
        text: z.string().trim().min(1).max(2000),
        audioKey: z.string().trim().min(1).max(255).optional(),
    }),
});
