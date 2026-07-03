import { z } from 'zod';

// ─── Reusable primitives ────────────────────────────────────────────────────

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'ID không hợp lệ (phải là ObjectId)');

const paramsWithCourseId = z.object({
    courseId: objectIdSchema,
});

const paramsWithLessonId = z.object({
    lessonId: objectIdSchema,
});

// ─── Objective Answer Schemas (shared by checkpoint & submission) ────────────

const multipleChoiceAnswerSchema = z.object({
    questionId: objectIdSchema,
    questionVersion: z.number().int().min(1),
    type: z.literal('MULTIPLE_CHOICE'),
    answer: z.object({
        selectedOptionId: z.string().min(1, 'Vui lòng chọn một đáp án'),
    }),
});

const fillInBlankAnswerSchema = z.object({
    questionId: objectIdSchema,
    questionVersion: z.number().int().min(1),
    type: z.literal('FILL_IN_BLANK'),
    answer: z.object({
        text: z.string(),
    }),
});

const trueFalseAnswerSchema = z.object({
    questionId: objectIdSchema,
    questionVersion: z.number().int().min(1),
    type: z.literal('TRUE_FALSE'),
    answer: z.object({
        value: z.boolean(),
    }),
});

const matchingAnswerSchema = z.object({
    questionId: objectIdSchema,
    questionVersion: z.number().int().min(1),
    type: z.literal('MATCHING'),
    answer: z.object({
        pairs: z.record(z.string(), z.string()),
    }),
});

const errorCorrectionAnswerSchema = z.object({
    questionId: objectIdSchema,
    questionVersion: z.number().int().min(1),
    type: z.literal('ERROR_CORRECTION'),
    answer: z.object({
        text: z.string(),
    }),
});

const objectiveAnswerSchema = z.discriminatedUnion('type', [
    multipleChoiceAnswerSchema,
    fillInBlankAnswerSchema,
    trueFalseAnswerSchema,
    matchingAnswerSchema,
    errorCorrectionAnswerSchema,
]);

// ─── Exercise Checkpoint ────────────────────────────────────────────────────

const checkpointObjectiveSchema = z.object({
    kind: z.literal('OBJECTIVE'),
    answers: z.array(objectiveAnswerSchema),
    currentQuestionIndex: z.number().int().min(0),
});

const checkpointWritingSchema = z.object({
    kind: z.literal('WRITING'),
    text: z.string(),
    warmupAnswers: z.record(z.string(), z.string()).optional(),
});

const checkpointSpeakingSchema = z.object({
    kind: z.literal('SPEAKING'),
    sessionId: z.string().nullable(),
});

const checkpointCompletionSchema = z.object({
    kind: z.literal('COMPLETION'),
    acknowledged: z.literal(true),
});

const exerciseCheckpointSchema = z.discriminatedUnion('kind', [
    checkpointObjectiveSchema,
    checkpointWritingSchema,
    checkpointSpeakingSchema,
    checkpointCompletionSchema,
]);

// ─── Exercise Submission ────────────────────────────────────────────────────

const submissionObjectiveSchema = z.object({
    kind: z.literal('OBJECTIVE'),
    answers: z.array(objectiveAnswerSchema),
});

const submissionSpeakingSchema = z.object({
    kind: z.literal('SPEAKING'),
    sessionId: z.string().min(1, 'Session ID không được để trống'),
});

const submissionWritingSchema = z.object({
    kind: z.literal('WRITING'),
    text: z.string().min(1, 'Nội dung viết không được để trống'),
    warmupAnswers: z.record(z.string(), z.string()).optional(),
});

const submissionCompletionSchema = z.object({
    kind: z.literal('COMPLETION'),
    acknowledged: z.literal(true),
});

const lessonSubmissionSchema = z.discriminatedUnion('kind', [
    submissionObjectiveSchema,
    submissionSpeakingSchema,
    submissionWritingSchema,
    submissionCompletionSchema,
]);

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

export const getAttemptSchema = z.object({
    params: z.object({
        attemptId: objectIdSchema,
    }),
});

// ─── Lesson start / read ─────────────────────────────────────────────────

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
        checkpoint: exerciseCheckpointSchema,
        activeSecondsDelta: z.number().int().min(0).max(300).default(0),
        conflictStrategy: z.enum(['STRICT', 'LAST_WRITE_WINS']).default('STRICT'),
    }),
});

// ─── Submission ─────────────────────────────────────────────────────────────

export const submitLessonSchema = z.object({
    params: paramsWithLessonId,
    body: z.object({
        clientAttemptId: z.string().uuid(),
        submission: lessonSubmissionSchema,
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

// Exported answer/checkpoint/submission types for use in services
export type ObjectiveAnswer = z.infer<typeof objectiveAnswerSchema>;
export type ExerciseCheckpoint = z.infer<typeof exerciseCheckpointSchema>;
export type LessonSubmission = z.infer<typeof lessonSubmissionSchema>;
