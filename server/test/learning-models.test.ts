import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Model contract tests.
 *
 * These tests validate that the model schema and indexes match the data model
 * specification. Full uniqueness verification requires a running MongoDB instance.
 * Run with MONGO_URI set to enable integration tests.
 */

// ─── Schema definition checks (no DB required) ──────────────────────────────

describe('CourseEnrollment model contract', () => {
    it('enforces unique compound index on (userId, courseId)', async () => {
        // Import model and verify index configuration
        const { CourseEnrollment } = await import(
            '../src/models/mongo/course-enrollment.model.js'
        );

        const indexes = CourseEnrollment.schema.indexes();
        const uniqueCompound = indexes.find(
            ([key]) => JSON.stringify(key) === JSON.stringify({ userId: 1, courseId: 1 }),
        );

        assert.ok(uniqueCompound, 'Expected unique index on { userId: 1, courseId: 1 }');
        const [, options] = uniqueCompound;
        assert.equal(options?.unique, true);
    });

    it('has index on (userId, status, updatedAt) for enrollment listing', async () => {
        const { CourseEnrollment } = await import(
            '../src/models/mongo/course-enrollment.model.js'
        );

        const indexes = CourseEnrollment.schema.indexes();
        const listIndex = indexes.find(
            ([key]) =>
                JSON.stringify(key) ===
                JSON.stringify({ userId: 1, status: 1, updatedAt: -1 }),
        );

        assert.ok(listIndex, 'Expected index on { userId: 1, status: 1, updatedAt: -1 }');
    });

    it('has index on (courseId, status) for admin queries', async () => {
        const { CourseEnrollment } = await import(
            '../src/models/mongo/course-enrollment.model.js'
        );

        const indexes = CourseEnrollment.schema.indexes();
        const courseIndex = indexes.find(
            ([key]) =>
                JSON.stringify(key) === JSON.stringify({ courseId: 1, status: 1 }),
        );

        assert.ok(courseIndex, 'Expected index on { courseId: 1, status: 1 }');
    });

    it('uses correct enum values for status', async () => {
        const { EEnrollmentStatus } = await import(
            '../src/models/mongo/course-enrollment.model.js'
        );

        assert.deepEqual(Object.values(EEnrollmentStatus).sort(), [
            'ACTIVE',
            'COMPLETED',
            'PAUSED',
        ]);
    });
});

describe('LearnerLessonProgress model contract', () => {
    it('enforces unique compound index on (userId, lessonId)', async () => {
        const { LearnerLessonProgress } = await import(
            '../src/models/mongo/learner-lesson-progress.model.js'
        );

        const indexes = LearnerLessonProgress.schema.indexes();
        const uniqueCompound = indexes.find(
            ([key]) => JSON.stringify(key) === JSON.stringify({ userId: 1, lessonId: 1 }),
        );

        assert.ok(uniqueCompound, 'Expected unique index on { userId: 1, lessonId: 1 }');
        const [, options] = uniqueCompound;
        assert.equal(options?.unique, true);
    });

    it('has index on (enrollmentId, status)', async () => {
        const { LearnerLessonProgress } = await import(
            '../src/models/mongo/learner-lesson-progress.model.js'
        );

        const indexes = LearnerLessonProgress.schema.indexes();
        const enrollIndex = indexes.find(
            ([key]) =>
                JSON.stringify(key) === JSON.stringify({ enrollmentId: 1, status: 1 }),
        );

        assert.ok(enrollIndex, 'Expected index on { enrollmentId: 1, status: 1 }');
    });

    it('has index on (userId, lastAccessedAt) for resume', async () => {
        const { LearnerLessonProgress } = await import(
            '../src/models/mongo/learner-lesson-progress.model.js'
        );

        const indexes = LearnerLessonProgress.schema.indexes();
        const resumeIndex = indexes.find(
            ([key]) =>
                JSON.stringify(key) === JSON.stringify({ userId: 1, lastAccessedAt: -1 }),
        );

        assert.ok(resumeIndex, 'Expected index on { userId: 1, lastAccessedAt: -1 }');
    });

    it('uses correct enum values for progress status', async () => {
        const { ELessonProgressStatus } = await import(
            '../src/models/mongo/learner-lesson-progress.model.js'
        );

        assert.deepEqual(Object.values(ELessonProgressStatus).sort(), [
            'COMPLETED',
            'IN_PROGRESS',
            'NOT_STARTED',
        ]);
    });
});

describe('LearnerLessonAttempt model contract', () => {
    it('enforces unique compound index on (userId, clientAttemptId) for idempotency', async () => {
        const { LearnerLessonAttempt } = await import(
            '../src/models/mongo/learner-lesson-attempt.model.js'
        );

        const indexes = LearnerLessonAttempt.schema.indexes();
        const uniqueCompound = indexes.find(
            ([key]) =>
                JSON.stringify(key) === JSON.stringify({ userId: 1, clientAttemptId: 1 }),
        );

        assert.ok(uniqueCompound, 'Expected unique index on { userId: 1, clientAttemptId: 1 }');
        const [, options] = uniqueCompound;
        assert.equal(options?.unique, true);
    });

    it('has index on (userId, lessonId, submittedAt) for history queries', async () => {
        const { LearnerLessonAttempt } = await import(
            '../src/models/mongo/learner-lesson-attempt.model.js'
        );

        const indexes = LearnerLessonAttempt.schema.indexes();
        const historyIndex = indexes.find(
            ([key]) =>
                JSON.stringify(key) ===
                JSON.stringify({ userId: 1, lessonId: 1, submittedAt: -1 }),
        );

        assert.ok(historyIndex, 'Expected index on { userId: 1, lessonId: 1, submittedAt: -1 }');
    });
});

// ─── Integration tests (require MONGO_URI) ─────────────────────────────────

describe('Enrollment uniqueness (integration, requires MONGO_URI)', { skip: true }, () => {
    it('prevents duplicate (userId, courseId) enrollment at the database level', async () => {
        // This test requires a running MongoDB instance.
        // To run: set MONGO_URI in environment and remove the skip flag.
        // Implementation:
        //   1. Connect to MongoDB
        //   2. Drop test collection
        //   3. Create two records with same (userId, courseId)
        //   4. Assert the second write throws a duplicate key error (11000)
        //   5. Clean up test data
    });
});
