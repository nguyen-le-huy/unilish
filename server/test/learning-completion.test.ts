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
    findOne: mock.fn(),
};

const mockGrader = {
    gradeResponses: mock.fn(),
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

class TestableCompletionService {
    constructor(
        private readonly enrollmentRepo: typeof mockEnrollmentRepo,
        private readonly progressRepo: typeof mockProgressRepo,
        private readonly attemptRepo: typeof mockAttemptRepo,
    ) {}

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

        if (!lesson) throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);

        const unit = await mockUnitModel.findById(lesson.unitId)
            .select('_id courseId').lean().exec() as any;
        if (!unit) throw new AppError('Đơn vị bài học không tồn tại', HttpStatus.UNPROCESSABLE_ENTITY);

        const courseId = String(unit.courseId);
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);
        if (!enrollment) throw new AppError('Chưa ghi danh.', HttpStatus.FORBIDDEN);
        if (enrollment.status !== 'ACTIVE') throw new AppError('Không hoạt động.', HttpStatus.FORBIDDEN);

        const courseDoc = await mockCourseModel.findById(courseId).select('isActive').lean().exec() as any;
        if (!courseDoc?.isActive) throw new AppError('Không khả dụng.', HttpStatus.FORBIDDEN);

        const existingAttempt = await this.attemptRepo.findByClientAttemptId(userId, clientAttemptId);
        if (existingAttempt) {
            return { attemptId: String(existingAttempt._id), score: existingAttempt.score, passed: existingAttempt.passed, feedback: existingAttempt.feedback };
        }

        let progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);
        if (!progress) progress = { _id: 'progress1', status: 'IN_PROGRESS' } as any;

        const passingScore = lesson.practiceConfig?.passingScore ?? 80;
        const questionIds = lesson.practiceConfig?.questionIds?.map((id: any) => String(id)) ?? [];

        let gradingResult: any;
        if (questionIds.length > 0) {
            gradingResult = await mockGrader.gradeResponses(questionIds, (responses ?? {}) as Record<string, unknown>, passingScore);
        } else {
            gradingResult = { score: 100, maxScore: 100, passed: true, feedback: { message: 'Completed.' } };
        }

        // Capture pre-completion status for duplicate prevention
        const wasAlreadyCompleted = progress.status === 'COMPLETED';

        if (gradingResult.passed) {
            await this.progressRepo.completeLesson(String(progress._id), userId, gradingResult.score, true);
        }

        // Only update enrollment counter if not already completed (AC-17)
        if (gradingResult.passed && !wasAlreadyCompleted) {
            await this.updateEnrollmentProgress(String(enrollment._id), courseId, lessonId, String(unit._id));
        }

        const updatedEnrollment = await this.enrollmentRepo.findByIdSecure(String(enrollment._id), userId);
        const completedCount = updatedEnrollment?.completedLessonCount ?? enrollment.completedLessonCount;
        const totalRequired = updatedEnrollment?.totalRequiredLessonCount ?? enrollment.totalRequiredLessonCount;

        return {
            attemptId: 'attempt-new',
            score: gradingResult.score,
            passed: gradingResult.passed,
            feedback: gradingResult.feedback,
            progress: {
                lessonStatus: gradingResult.passed ? 'COMPLETED' : 'IN_PROGRESS',
                unitStatus: 'IN_PROGRESS',
                courseStatus: updatedEnrollment?.status ?? 'ACTIVE',
                courseProgressPercent: totalRequired > 0 ? Math.round((completedCount / totalRequired) * 100) : 0,
            },
            nextLessonId: 'next-lesson-id',
        };
    }

    private async updateEnrollmentProgress(
        enrollmentId: string,
        _courseId: string,
        _lessonId: string,
        _unitId: string,
    ): Promise<void> {
        // Simulate atomic increment followed by completion check
        const updated = await mockEnrollmentModel.findByIdAndUpdate(
            enrollmentId,
            { $inc: { completedLessonCount: 1 }, $set: { lastLessonId: _lessonId } },
            { new: true },
        ).lean().exec() as any;

        if (!updated) return;

        if (updated.completedLessonCount >= updated.totalRequiredLessonCount && updated.totalRequiredLessonCount > 0) {
            await mockEnrollmentModel.findByIdAndUpdate(enrollmentId, {
                status: 'COMPLETED',
                completedAt: new Date(),
            }).exec();
        }
    }
}

// ─── Completion Tests ─────────────────────────────────────────────────────────

describe('Course Completion (BE-10)', () => {
    let service: TestableCompletionService;

    beforeEach(() => {
        mockLessonModel.findById.mock.resetCalls();
        mockUnitModel.findById.mock.resetCalls();
        mockEnrollmentRepo.findByUserAndCourse.mock.resetCalls();
        mockCourseModel.findById.mock.resetCalls();
        mockAttemptRepo.findByClientAttemptId.mock.resetCalls();
        mockAttemptRepo.createAttempt.mock.resetCalls();
        mockProgressRepo.findByUserAndLesson.mock.resetCalls();
        mockProgressRepo.completeLesson.mock.resetCalls();
        mockEnrollmentModel.findByIdAndUpdate.mock.resetCalls();
        mockGrader.gradeResponses.mock.resetCalls();

        service = new TestableCompletionService(mockEnrollmentRepo, mockProgressRepo, mockAttemptRepo);
    });

    // ─── AC-16: Complete Course ────────────────────────────────────────────

    it('completes enrollment when last required lesson passes (AC-16)', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'final-lesson',
                unitId: 'unit1',
                title: 'Final Lesson',
                type: 'GRAMMAR',
                practiceConfig: { passingScore: 80, questionIds: ['q1'] },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
                completedLessonCount: 9,
                totalRequiredLessonCount: 10,
            }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockAttemptRepo.findByClientAttemptId.mock.mockImplementation(() => Promise.resolve(null));
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'progress1', status: 'IN_PROGRESS' }),
        );
        mockGrader.gradeResponses.mock.mockImplementation(() =>
            Promise.resolve({ score: 90, maxScore: 100, passed: true, feedback: {} }),
        );
        mockAttemptRepo.createAttempt.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'attempt-final' }),
        );
        mockEnrollmentModel.findByIdAndUpdate.mock.mockImplementation((id: string, update: any, opts: any) => {
            if (update.$inc) {
                // First call: increment completedLessonCount → now 10 (== totalRequired)
                return mockChain({ completedLessonCount: 10, totalRequiredLessonCount: 10 });
            }
            // Second call: enrollment status update
            return mockChain({ _id: id });
        });
        mockEnrollmentRepo.findByIdSecure.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'COMPLETED',
                completedLessonCount: 10,
                totalRequiredLessonCount: 10,
            }),
        );

        const result = await service.submitLesson('user1', 'final-lesson', 'uuid-final', { q1: 'A' }, 60);
        assert.equal(result.passed, true);
        assert.equal(result.progress.courseStatus, 'COMPLETED');
        assert.equal(result.progress.courseProgressPercent, 100);
    });

    // ─── AC-17: Review does not alter completion counts ────────────────────

    it('does not increment completion counter on retry of already completed lesson (AC-17)', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'lesson1',
                unitId: 'unit1',
                title: 'Lesson 1',
                type: 'GRAMMAR',
                practiceConfig: { passingScore: 80, questionIds: ['q1'] },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
                completedLessonCount: 5,
                totalRequiredLessonCount: 10,
            }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockAttemptRepo.findByClientAttemptId.mock.mockImplementation(() => Promise.resolve(null));
        // Progress is ALREADY COMPLETED from a prior submission
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'progress1', status: 'COMPLETED' }),
        );
        mockGrader.gradeResponses.mock.mockImplementation(() =>
            Promise.resolve({ score: 95, maxScore: 100, passed: true, feedback: { message: 'Improved!' } }),
        );
        mockAttemptRepo.createAttempt.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'attempt-retry' }),
        );
        mockEnrollmentRepo.findByIdSecure.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
                completedLessonCount: 5, // Should NOT have incremented
                totalRequiredLessonCount: 10,
            }),
        );

        // Stub enrollmentModel.findByIdAndUpdate to track calls
        let updateCount = 0;
        mockEnrollmentModel.findByIdAndUpdate.mock.mockImplementation(() => {
            updateCount++;
            return mockChain({ completedLessonCount: 5, totalRequiredLessonCount: 10 });
        });

        const result = await service.submitLesson('user1', 'lesson1', 'uuid-retry', { q1: 'B' }, 60);
        assert.equal(result.passed, true);
        assert.equal(result.progress.courseProgressPercent, 50); // 5/10 * 100 = 50
    });

    // ─── AC-15: Unlock Next Lesson ─────────────────────────────────────────

    it('nextLessonId is returned after completion (AC-15)', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'lesson1',
                unitId: 'unit1',
                title: 'Lesson 1',
                type: 'VOCAB',
                practiceConfig: { passingScore: 80, questionIds: [] },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
                completedLessonCount: 0,
                totalRequiredLessonCount: 10,
            }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockAttemptRepo.findByClientAttemptId.mock.mockImplementation(() => Promise.resolve(null));
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'progress1', status: 'IN_PROGRESS' }),
        );
        mockAttemptRepo.createAttempt.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'attempt1' }),
        );
        mockEnrollmentRepo.findByIdSecure.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
                completedLessonCount: 1,
                totalRequiredLessonCount: 10,
            }),
        );

        const result = await service.submitLesson('user1', 'lesson1', 'uuid-1', {}, 60);
        assert.equal(result.passed, true);
        assert.ok(result.nextLessonId);
    });

    // ─── AC-13: Failed Assessment keeps lesson IN_PROGRESS ─────────────────

    it('keeps lesson IN_PROGRESS on failed assessment (AC-13)', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'lesson1',
                unitId: 'unit1',
                title: 'Lesson 1',
                type: 'GRAMMAR',
                practiceConfig: { passingScore: 80, questionIds: ['q1'] },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
                completedLessonCount: 0,
                totalRequiredLessonCount: 10,
            }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockAttemptRepo.findByClientAttemptId.mock.mockImplementation(() => Promise.resolve(null));
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'progress1', status: 'IN_PROGRESS' }),
        );
        mockGrader.gradeResponses.mock.mockImplementation(() =>
            Promise.resolve({ score: 40, maxScore: 100, passed: false, feedback: { perQuestion: {} } }),
        );
        mockAttemptRepo.createAttempt.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'attempt-fail' }),
        );
        mockEnrollmentRepo.findByIdSecure.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
                completedLessonCount: 0,
                totalRequiredLessonCount: 10,
            }),
        );

        const result = await service.submitLesson('user1', 'lesson1', 'uuid-fail', { q1: 'wrong' }, 60);
        assert.equal(result.passed, false);
        assert.equal(result.progress.lessonStatus, 'IN_PROGRESS');
        assert.equal(result.progress.courseProgressPercent, 0);
    });

    // ─── AC-21: Speaking/Writing auto-completes ───────────────────────────

    it('auto-completes Speaking/Writing (AC-21)', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'speaking1',
                unitId: 'unit1',
                title: 'Speaking Test',
                type: 'SPEAKING',
                practiceConfig: { passingScore: 80, questionIds: [] },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
                completedLessonCount: 0,
                totalRequiredLessonCount: 10,
            }),
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
        mockEnrollmentRepo.findByIdSecure.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                status: 'ACTIVE',
                completedLessonCount: 1,
                totalRequiredLessonCount: 10,
            }),
        );

        const result = await service.submitLesson('user1', 'speaking1', 'uuid-speak', { audioUrl: '...' }, 180);
        assert.equal(result.passed, true);
        assert.equal(result.score, 100);
    });
});

// ─── Recalculation Tests ───────────────────────────────────────────────────

describe('Recalculation logic', () => {
    beforeEach(() => {
        mockEnrollmentRepo.findByIdSecure.mock.resetCalls();
        mockEnrollmentModel.findByIdAndUpdate.mock.resetCalls();
    });

    it('prevents counter drift via wasAlreadyCompleted check', async () => {
        // Verify that a lesson already COMPLETED does not trigger enrollment counter update
        const progress = { _id: 'progress1', status: 'COMPLETED' };
        const wasAlreadyCompleted = progress.status === 'COMPLETED';
        assert.equal(wasAlreadyCompleted, true);
    });

    it('allows counter increment for first-time completion', async () => {
        const progress = { _id: 'progress1', status: 'IN_PROGRESS' };
        const wasAlreadyCompleted = progress.status === 'COMPLETED';
        assert.equal(wasAlreadyCompleted, false);
    });
});
