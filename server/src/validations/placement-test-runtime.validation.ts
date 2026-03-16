import { z } from 'zod';

const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB id');
const answerOptionSchema = z.enum(['A', 'B', 'C', 'D']);

export const getActivePlacementRuntimeSchema = z.object({
    query: z.object({
        language: z.string().trim().min(2).max(10),
    }),
});

export const createPlacementAttemptSchema = z.object({
    body: z.object({
        placementTestId: mongoIdSchema,
    }),
});

export const getPlacementAttemptByIdSchema = z.object({
    params: z.object({
        attemptId: mongoIdSchema,
    }),
});

export const savePlacementAnswersSchema = z.object({
    params: z.object({
        attemptId: mongoIdSchema,
    }),
    body: z.object({
        answers: z
            .array(
                z.object({
                    questionId: z.string().trim().min(1),
                    selectedOption: answerOptionSchema.nullable().optional(),
                    flagged: z.boolean().optional(),
                }),
            )
            .min(1),
    }),
});

export const submitPlacementAttemptSchema = z.object({
    params: z.object({
        attemptId: mongoIdSchema,
    }),
});

export type GetActivePlacementRuntimeQuery = z.infer<typeof getActivePlacementRuntimeSchema>['query'];
export type CreatePlacementAttemptBody = z.infer<typeof createPlacementAttemptSchema>['body'];
export type GetPlacementAttemptByIdParams = z.infer<typeof getPlacementAttemptByIdSchema>['params'];
export type SavePlacementAnswersBody = z.infer<typeof savePlacementAnswersSchema>['body'];
export type SubmitPlacementAttemptParams = z.infer<typeof submitPlacementAttemptSchema>['params'];
