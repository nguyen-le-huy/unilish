import { z } from 'zod';

// ─── Reusable primitives ────────────────────────────────────────────────────

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ (phải là ObjectId)');

const paramsWithCourseId = z.object({
    courseId: objectIdSchema,
});

const paramsWithLessonId = z.object({
    lessonId: objectIdSchema,
});

// ─── Enrollment ─────────────────────────────────────────────────────────────

export const enrollCourseSchema = z.object({
    params: paramsWithCourseId,
    // No body required — enrollment is a resource creation operation
    // Idempotency-Key is optional; service handles dedup internally
});

export const getEnrollmentsSchema = z.object({
    query: z.object({
        status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
    }),
});

export const getEnrollmentParamsSchema = z.object({
    params: z.object({
        enrollmentId: objectIdSchema,
    }),
});

// ─── Lesson start / read (for Phase 3, defined here for contract completeness) ─

export const startLessonSchema = z.object({
    params: paramsWithLessonId,
});

export const getLearnerLessonSchema = z.object({
    params: paramsWithLessonId,
});

// ─── Checkpoint ─────────────────────────────────────────────────────────────

export const saveCheckpointSchema = z.object({
    params: paramsWithLessonId,
    body: z.object({
        version: z.number().int().min(0),
        checkpoint: z.any().default({}),
        activeSecondsDelta: z.number().int().min(0).max(300).default(0),
    }),
});

// ─── Submission ─────────────────────────────────────────────────────────────

export const submitLessonSchema = z.object({
    params: paramsWithLessonId,
    body: z.object({
        clientAttemptId: z.string().uuid(),
        responses: z.any(),
        durationSeconds: z.number().int().min(0).default(0),
    }),
});

// ─── Dashboard ────────────────────────────────────────────────────────────

export const getDashboardSchema = z.object({
    query: z.object({
        period: z.enum(['month']).optional(),
        month: z
            .string()
            .regex(/^\d{4}-\d{2}$/, 'Tháng phải theo định dạng YYYY-MM')
            .optional(),
    }),
});

// ─── Roadmap ──────────────────────────────────────────────────────────────

export const getRoadmapSchema = z.object({
    params: z.object({
        slug: z.string().min(1, 'Slug không được để trống'),
    }),
});

// ─── Inferred types ─────────────────────────────────────────────────────────

export type EnrollCourseParams = z.infer<typeof enrollCourseSchema>['params'];
export type GetEnrollmentsQuery = z.infer<typeof getEnrollmentsSchema>['query'];
export type StartLessonParams = z.infer<typeof startLessonSchema>['params'];
export type GetLearnerLessonParams = z.infer<typeof getLearnerLessonSchema>['params'];
export type SaveCheckpointParams = z.infer<typeof saveCheckpointSchema>['params'];
export type SaveCheckpointBody = z.infer<typeof saveCheckpointSchema>['body'];
export type SubmitLessonParams = z.infer<typeof submitLessonSchema>['params'];
export type SubmitLessonBody = z.infer<typeof submitLessonSchema>['body'];
export type GetDashboardQuery = z.infer<typeof getDashboardSchema>['query'];
export type GetRoadmapParams = z.infer<typeof getRoadmapSchema>['params'];
