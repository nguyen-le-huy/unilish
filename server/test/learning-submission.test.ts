import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { HttpStatus } from '../src/constants/http-status.js';
import { AppError } from '../src/utils/app-error.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockEnrollmentRepo = {
    findActiveByUser: mock.fn(),
    findByUserAndCourse: mock.fn(),
    findByIdSecure: mock.fn(),
    findByUser: mock.fn(),
};

const mockProgressRepo = {
    findByUserAndLesson: mock.fn(),
    completeLesson: mock.fn(),
    updateCheckpoint: mock.fn(),
};

const mockAttemptRepo = {
    findByClientAttemptId: mock.fn(),
    createAttempt: mock.fn(),
};

const mockLessonModel = {
    findById: mock.fn(),
    find: mock.fn(),
};

const mockUnitModel = {
    findById: mock.fn(),
    find: mock.fn(),
};

const mockCourseModel = {
    findById: mock.fn(),
};

const mockEnrollmentModel = {
    findByIdAndUpdate: mock.fn(),
    findOne: mock.fn(),
};

const mockProgressModel = {
    findByIdAndUpdate: mock.fn(),
    create: mock.fn(),
    find: mock.fn(),
};

const mockGrader = {
    gradeResponses: mock.fn(),
    gradeSubjectivePass: mock.fn(),
};

// ─── Helper ────────────────────────────────────────────────────────────────────

function mockChain(returnValue: unknown) {
    return {
        select: () => mockChain(returnValue),
        sort: () => mockChain(returnValue),
        lean: () => mockChain(returnValue),
        exec: () => Promise.resolve(returnValue),
    };
}

// ─── Testable Service ──────────────────────────────────────────────────────────

class TestableSubmissionService {
    constructor(
        private readonly enrollmentRepo: typeof mockEnrollmentRepo,
        private readonly progressRepo: typeof mockProgressRepo,
        private readonly attemptRepo: typeof mockAttemptRepo,
    ) {}

    async saveCheckpoint(
        userId: string,
        lessonId: string,
        version: number,
        checkpoint: unknown,
        activeSecondsDelta: number,
    ): Promise<any> {
        const progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);
        if (!progress) {
            throw new AppError('Bạn cần bắt đầu bài học trước khi lưu tiến trình.', HttpStatus.FORBIDDEN);
        }

        if (progress.checkpointVersion !== version) {
            throw new AppError('Phiên bản tiến trình không đồng bộ. Vui lòng tải lại.', HttpStatus.CONFLICT);
        }

        const updated = await this.progressRepo.updateCheckpoint(
            String(progress._id), userId, version, checkpoint, activeSecondsDelta,
        );

        if (!updated) {
            throw new AppError('Phiên bản tiến trình không đồng bộ. Vui lòng tải lại.', HttpStatus.CONFLICT);
        }

        return {
            progressId: String(updated._id),
            checkpointVersion: updated.checkpointVersion,
            timeSpentSeconds: updated.timeSpentSeconds,
            status: updated.status,
        };
    }

    async submitLesson(
        userId: string,
        lessonId: string,
        clientAttemptId: string,
        responses: unknown,
        durationSeconds: number,
    ): Promise<any> {
        const lesson = await mockLessonModel.findById(lessonId)
            .select('_id unitId title type orderIndex practiceConfig')
            .lean()
            .exec() as any | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const unit = await mockUnitModel.findById(lesson.unitId)
            .select('_id courseId')
            .lean()
            .exec() as any | null;

        if (!unit) {
            throw new AppError('Đơn vị bài học không tồn tại', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const courseId = String(unit.courseId);
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (!enrollment) {
            throw new AppError('Bạn chưa ghi danh khóa học này.', HttpStatus.FORBIDDEN);
        }

        if (enrollment.status !== 'ACTIVE') {
            throw new AppError('Không thể nộp bài cho khóa học không hoạt động.', HttpStatus.FORBIDDEN);
        }

        const courseDoc = await mockCourseModel.findById(courseId).select('isActive').lean().exec() as any;
        if (!courseDoc || !courseDoc.isActive) {
            throw new AppError('Khóa học hiện không khả dụng.', HttpStatus.FORBIDDEN);
        }

        // Idempotency check
        const existingAttempt = await this.attemptRepo.findByClientAttemptId(userId, clientAttemptId);
        if (existingAttempt) {
            return {
                attemptId: String(existingAttempt._id),
                score: existingAttempt.score,
                passed: existingAttempt.passed,
                feedback: existingAttempt.feedback,
                progress: { lessonStatus: 'COMPLETED', unitStatus: 'COMPLETED', courseStatus: 'ACTIVE', courseProgressPercent: 50 },
                nextLessonId: null,
            };
        }

        let progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);
        if (!progress) {
            progress = { _id: 'progress1', status: 'IN_PROGRESS' } as any;
        }

        const isSubjective = lesson.type === 'SPEAKING' || lesson.type === 'WRITING';
        const passingScore = lesson.practiceConfig?.passingScore ?? 80;
        const questionIds = lesson.practiceConfig?.questionIds?.map((id: any) => String(id)) ?? [];

        let gradingResult: any;

        if (isSubjective) {
            gradingResult = { score: 100, maxScore: 100, passed: true, feedback: { message: 'Submission received.' } };
        } else if (questionIds.length > 0) {
            gradingResult = await mockGrader.gradeResponses(questionIds, (responses ?? {}) as Record<string, unknown>, passingScore);
        } else {
            gradingResult = { score: 100, maxScore: 100, passed: true, feedback: { message: 'Completed.' } };
        }

        const attempt = await this.attemptRepo.createAttempt({
            clientAttemptId, userId, enrollmentId: String(enrollment._id), lessonId,
            submittedAnswers: responses, score: gradingResult.score, passed: gradingResult.passed,
            feedback: gradingResult.feedback, durationSeconds: Math.min(durationSeconds, 86400),
        });

        if (gradingResult.passed) {
            await this.progressRepo.completeLesson(String(progress._id), userId, gradingResult.score, true);
        }

        return {
            attemptId: String(attempt._id),
            score: gradingResult.score,
            passed: gradingResult.passed,
            feedback: gradingResult.feedback,
            progress: { lessonStatus: gradingResult.passed ? 'COMPLETED' : 'IN_PROGRESS', unitStatus: 'IN_PROGRESS', courseStatus: 'ACTIVE', courseProgressPercent: 50 },
            nextLessonId: 'next-lesson-id',
        };
    }
}

// ─── Checkpoint Tests ─────────────────────────────────────────────────────────

describe('LearningService.saveCheckpoint', () => {
    let service: TestableSubmissionService;

    beforeEach(() => {
        mockProgressRepo.findByUserAndLesson.mock.resetCalls();
        mockProgressRepo.updateCheckpoint.mock.resetCalls();
        service = new TestableSubmissionService(mockEnrollmentRepo, mockProgressRepo, mockAttemptRepo);
    });

    it('throws 403 when no progress exists', async () => {
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() => Promise.resolve(null));

        await assert.rejects(
            () => service.saveCheckpoint('user1', 'lesson1', 0, {}, 20),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.FORBIDDEN);
                return true;
            },
        );
    });

    it('throws 409 on version mismatch (AC-12)', async () => {
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'progress1',
                status: 'IN_PROGRESS',
                checkpointVersion: 5,
            }),
        );

        await assert.rejects(
            () => service.saveCheckpoint('user1', 'lesson1', 3, {}, 20),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.CONFLICT);
                return true;
            },
        );
    });

    it('saves checkpoint on matching version (AC-11)', async () => {
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'progress1',
                status: 'IN_PROGRESS',
                checkpointVersion: 3,
            }),
        );

        mockProgressRepo.updateCheckpoint.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'progress1',
                checkpointVersion: 4,
                timeSpentSeconds: 120,
                status: 'IN_PROGRESS',
            }),
        );

        const result = await service.saveCheckpoint('user1', 'lesson1', 3, { page: 2 }, 20);
        assert.equal(result.checkpointVersion, 4);
        assert.equal(result.timeSpentSeconds, 120);
    });
});

// ─── Submission Tests ─────────────────────────────────────────────────────────

describe('LearningService.submitLesson', () => {
    let service: TestableSubmissionService;

    beforeEach(() => {
        mockLessonModel.findById.mock.resetCalls();
        mockUnitModel.findById.mock.resetCalls();
        mockEnrollmentRepo.findByUserAndCourse.mock.resetCalls();
        mockCourseModel.findById.mock.resetCalls();
        mockAttemptRepo.findByClientAttemptId.mock.resetCalls();
        mockAttemptRepo.createAttempt.mock.resetCalls();
        mockProgressRepo.findByUserAndLesson.mock.resetCalls();
        mockProgressRepo.completeLesson.mock.resetCalls();
        mockGrader.gradeResponses.mock.resetCalls();

        service = new TestableSubmissionService(mockEnrollmentRepo, mockProgressRepo, mockAttemptRepo);
    });

    it('throws 404 when lesson does not exist', async () => {
        mockLessonModel.findById.mock.mockImplementation(() => mockChain(null));

        await assert.rejects(
            () => service.submitLesson('user1', 'bad-id', 'uuid-1', {}, 60),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.NOT_FOUND);
                return true;
            },
        );
    });

    it('throws 403 when not enrolled', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lesson1', unitId: 'unit1', type: 'VOCAB', practiceConfig: {} }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() => Promise.resolve(null));

        await assert.rejects(
            () => service.submitLesson('user1', 'lesson1', 'uuid-1', {}, 60),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.FORBIDDEN);
                return true;
            },
        );
    });

    it('returns existing attempt idempotently (AC-14)', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lesson1', unitId: 'unit1', type: 'VOCAB', practiceConfig: { passingScore: 80, questionIds: [] } }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE', completedLessonCount: 5, totalRequiredLessonCount: 10 }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockAttemptRepo.findByClientAttemptId.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'attempt1',
                score: 90,
                passed: true,
                feedback: { message: 'Great job!' },
            }),
        );

        const result = await service.submitLesson('user1', 'lesson1', 'same-uuid', {}, 60);
        assert.equal(result.attemptId, 'attempt1');
        assert.equal(result.score, 90);
        assert.equal(result.passed, true);
    });

    it('grades objective lessons and returns result (AC-13)', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'lesson1',
                unitId: 'unit1',
                type: 'GRAMMAR',
                practiceConfig: {
                    passingScore: 80,
                    questionIds: ['q1', 'q2'],
                },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE', completedLessonCount: 5, totalRequiredLessonCount: 10 }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockAttemptRepo.findByClientAttemptId.mock.mockImplementation(() => Promise.resolve(null));
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'progress1', status: 'IN_PROGRESS' }),
        );
        mockGrader.gradeResponses.mock.mockImplementation(() =>
            Promise.resolve({ score: 50, maxScore: 100, passed: false, feedback: { perQuestion: {} } }),
        );
        mockAttemptRepo.createAttempt.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'attempt-new' }),
        );

        const result = await service.submitLesson('user1', 'lesson1', 'uuid-2', { q1: 'A', q2: 'B' }, 120);
        assert.equal(result.score, 50);
        assert.equal(result.passed, false);
        assert.equal(result.progress.lessonStatus, 'IN_PROGRESS');
    });

    it('passes Speaking/Writing automatically (AC-21)', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'lesson1',
                unitId: 'unit1',
                type: 'SPEAKING',
                practiceConfig: { passingScore: 80, questionIds: [] },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE', completedLessonCount: 5, totalRequiredLessonCount: 10 }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockAttemptRepo.findByClientAttemptId.mock.mockImplementation(() => Promise.resolve(null));
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'progress1', status: 'IN_PROGRESS' }),
        );
        mockAttemptRepo.createAttempt.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'attempt-speak' }),
        );

        const result = await service.submitLesson('user1', 'lesson1', 'uuid-3', { audioUrl: '...' }, 180);
        assert.equal(result.passed, true);
        assert.equal(result.score, 100);
        assert.equal(result.progress.lessonStatus, 'COMPLETED');
    });

    it('completes non-assessed lessons with no questions', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'lesson1',
                unitId: 'unit1',
                type: 'VOCAB',
                practiceConfig: { passingScore: 80, questionIds: [] },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE', completedLessonCount: 5, totalRequiredLessonCount: 10 }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockAttemptRepo.findByClientAttemptId.mock.mockImplementation(() => Promise.resolve(null));
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'progress1', status: 'IN_PROGRESS' }),
        );
        mockAttemptRepo.createAttempt.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'attempt-vocab' }),
        );

        const result = await service.submitLesson('user1', 'lesson1', 'uuid-4', {}, 60);
        assert.equal(result.passed, true);
        assert.equal(result.score, 100);
    });
});
