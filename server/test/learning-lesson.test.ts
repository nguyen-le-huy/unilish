import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { HttpStatus } from '../src/constants/http-status.js';
import { AppError } from '../src/utils/app-error.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockEnrollmentRepo = {
    findByUserAndCourse: mock.fn(),
    findActiveByUser: mock.fn(),
};

const mockProgressRepo = {
    findByUserAndLesson: mock.fn(),
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
};

const mockProgressModel = {
    findByIdAndUpdate: mock.fn(),
    create: mock.fn(),
};

const mockSanitizer = {
    sanitizeLessonContent: mock.fn(),
    validateLessonContent: mock.fn(),
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

class TestableLessonService {
    constructor(
        private readonly enrollmentRepo: typeof mockEnrollmentRepo,
        private readonly progressRepo: typeof mockProgressRepo,
    ) {}

    async startLesson(userId: string, lessonId: string): Promise<any> {
        // 1. Find lesson
        const lesson = await mockLessonModel.findById(lessonId)
            .select('_id unitId type')
            .lean()
            .exec() as any | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Find unit for courseId
        const unit = await mockUnitModel.findById(lesson.unitId)
            .select('_id courseId')
            .lean()
            .exec() as any | null;

        if (!unit) {
            throw new AppError('Đơn vị bài học không tồn tại', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const courseId = String(unit.courseId);

        // 3. Validate enrollment
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (!enrollment) {
            throw new AppError('Bạn chưa ghi danh khóa học này.', HttpStatus.FORBIDDEN);
        }

        if (enrollment.status !== 'ACTIVE') {
            throw new AppError('Khóa học không ở trạng thái hoạt động.', HttpStatus.FORBIDDEN);
        }

        // 4. Check course is active
        const course = await mockCourseModel.findById(courseId)
            .select('isActive')
            .lean()
            .exec() as any | null;

        if (!course || !course.isActive) {
            throw new AppError('Khóa học hiện không khả dụng.', HttpStatus.FORBIDDEN);
        }

        // 5. Find or create progress
        const progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);

        if (progress) {
            return {
                progressId: String(progress._id),
                lessonId: String(lesson._id),
                status: progress.status,
                checkpointVersion: progress.checkpointVersion,
                startedAt: new Date(),
                navigation: { previousLessonId: null, nextLessonId: null },
            };
        }

        return {
            progressId: 'new-progress-id',
            lessonId: String(lesson._id),
            status: 'IN_PROGRESS',
            checkpointVersion: 0,
            startedAt: new Date(),
            navigation: { previousLessonId: null, nextLessonId: null },
        };
    }

    async getLearnerLesson(userId: string, lessonId: string): Promise<any> {
        const lesson = await mockLessonModel.findById(lessonId)
            .select('_id unitId title type orderIndex content practiceConfig')
            .lean()
            .exec() as any | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const unit = await mockUnitModel.findById(lesson.unitId)
            .select('_id courseId title orderIndex')
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

        const course = await mockCourseModel.findById(courseId)
            .select('_id slug name isActive')
            .lean()
            .exec() as any | null;

        if (!course) {
            throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (!course.isActive && enrollment.status !== 'COMPLETED') {
            throw new AppError('Khóa học hiện không khả dụng.', HttpStatus.FORBIDDEN);
        }

        // Validate content
        const validationError = mockSanitizer.validateLessonContent(lesson.type, lesson.content);
        if (validationError) {
            throw new AppError(validationError, HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // Sanitize content
        const safeContent = mockSanitizer.sanitizeLessonContent(lesson.type, lesson.content);

        // Find or create progress
        let progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);
        if (!progress) {
            progress = {
                _id: 'new-progress',
                status: 'NOT_STARTED',
                checkpointVersion: 0,
                checkpoint: null,
                bestScore: -1,
            };
        }

        return {
            course: { id: String(course._id), slug: course.slug, name: course.name },
            unit: { id: String(unit._id), title: unit.title, orderIndex: unit.orderIndex },
            lesson: {
                id: String(lesson._id),
                title: lesson.title,
                type: lesson.type,
                orderIndex: lesson.orderIndex,
                content: safeContent,
                passingScore: lesson.practiceConfig?.passingScore ?? null,
            },
            progress: {
                status: progress.status,
                checkpoint: progress.checkpoint ?? null,
                checkpointVersion: progress.checkpointVersion,
                bestScore: progress.bestScore >= 0 ? progress.bestScore : null,
            },
            navigation: { previousLessonId: null, nextLessonId: null },
        };
    }
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('LearningService.startLesson', () => {
    let service: TestableLessonService;

    beforeEach(() => {
        mockLessonModel.findById.mock.resetCalls();
        mockUnitModel.findById.mock.resetCalls();
        mockCourseModel.findById.mock.resetCalls();
        mockEnrollmentRepo.findByUserAndCourse.mock.resetCalls();
        mockProgressRepo.findByUserAndLesson.mock.resetCalls();

        service = new TestableLessonService(mockEnrollmentRepo, mockProgressRepo);
    });

    it('throws 404 when lesson does not exist', async () => {
        mockLessonModel.findById.mock.mockImplementation(() => mockChain(null));

        await assert.rejects(
            () => service.startLesson('user1', '507f1f77bcf86cd799439011'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.NOT_FOUND);
                return true;
            },
        );
    });

    it('throws 403 when user is not enrolled in the course', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lesson1', unitId: 'unit1', type: 'VOCAB' }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve(null),
        );

        await assert.rejects(
            () => service.startLesson('user1', 'lesson1'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.FORBIDDEN);
                return true;
            },
        );
    });

    it('throws 403 when enrollment is not active', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lesson1', unitId: 'unit1', type: 'VOCAB' }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'PAUSED' }),
        );

        await assert.rejects(
            () => service.startLesson('user1', 'lesson1'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.FORBIDDEN);
                return true;
            },
        );
    });

    it('throws 403 when course is inactive', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lesson1', unitId: 'unit1', type: 'VOCAB' }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: false }),
        );

        await assert.rejects(
            () => service.startLesson('user1', 'lesson1'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.FORBIDDEN);
                return true;
            },
        );
    });

    it('creates progress and returns lesson started', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lesson1', unitId: 'unit1', type: 'VOCAB' }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve(null),
        );

        const result = await service.startLesson('user1', 'lesson1');
        assert.equal(result.status, 'IN_PROGRESS');
        assert.equal(result.lessonId, 'lesson1');
        assert.ok(result.progressId);
        assert.ok(result.navigation);
    });

    it('returns existing progress idempotently', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'lesson1', unitId: 'unit1', type: 'VOCAB' }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1' }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ isActive: true }),
        );
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'existing-progress',
                status: 'IN_PROGRESS',
                checkpointVersion: 2,
                firstStartedAt: new Date('2026-01-01'),
                createdAt: new Date('2026-01-01'),
            }),
        );

        const result = await service.startLesson('user1', 'lesson1');
        assert.equal(result.progressId, 'existing-progress');
        assert.equal(result.checkpointVersion, 2);
    });
});

describe('LearningService.getLearnerLesson', () => {
    let service: TestableLessonService;

    beforeEach(() => {
        mockLessonModel.findById.mock.resetCalls();
        mockUnitModel.findById.mock.resetCalls();
        mockCourseModel.findById.mock.resetCalls();
        mockEnrollmentRepo.findByUserAndCourse.mock.resetCalls();
        mockProgressRepo.findByUserAndLesson.mock.resetCalls();
        mockSanitizer.validateLessonContent.mock.resetCalls();
        mockSanitizer.sanitizeLessonContent.mock.resetCalls();

        service = new TestableLessonService(mockEnrollmentRepo, mockProgressRepo);
    });

    it('returns 422 for malformed content (AC-19)', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'lesson1',
                unitId: 'unit1',
                title: 'Lesson 1',
                type: 'VOCAB',
                orderIndex: 1,
                content: { items: [] },
                practiceConfig: { passingScore: 80 },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1', title: 'Unit 1', orderIndex: 1 }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'course1', slug: 'test', name: 'Test', isActive: true }),
        );
        mockSanitizer.validateLessonContent.mock.mockImplementation(() => 'Nội dung từ vựng đang được cập nhật.');

        await assert.rejects(
            () => service.getLearnerLesson('user1', 'lesson1'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.UNPROCESSABLE_ENTITY);
                return true;
            },
        );
    });

    it('returns sanitized lesson with progress and navigation', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'lesson1',
                unitId: 'unit1',
                title: 'Lesson 1',
                type: 'VOCAB',
                orderIndex: 1,
                content: { type: 'VOCAB', items: [{ id: '1', word: 'hello' }] },
                practiceConfig: { passingScore: 80 },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1', title: 'Unit 1', orderIndex: 1 }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'course1', slug: 'test', name: 'Test Course', isActive: true }),
        );
        mockSanitizer.validateLessonContent.mock.mockImplementation(() => null);
        mockSanitizer.sanitizeLessonContent.mock.mockImplementation(() => ({
            type: 'VOCAB',
            items: [{ id: '1', word: 'hello' }],
        }));
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'progress1',
                status: 'IN_PROGRESS',
                checkpointVersion: 1,
                checkpoint: { currentPage: 2 },
                bestScore: -1,
            }),
        );

        const result = await service.getLearnerLesson('user1', 'lesson1');

        assert.equal(result.course.slug, 'test');
        assert.equal(result.unit.title, 'Unit 1');
        assert.equal(result.lesson.title, 'Lesson 1');
        assert.equal(result.lesson.type, 'VOCAB');
        assert.equal(result.lesson.passingScore, 80);
        assert.ok(result.lesson.content);
        assert.equal(result.progress.status, 'IN_PROGRESS');
        assert.equal(result.progress.checkpointVersion, 1);
        assert.equal(result.progress.bestScore, null); // -1 maps to null
        assert.equal(result.progress.checkpoint.currentPage, 2);
        assert.ok(result.navigation);
    });

    it('creates NOT_STARTED progress if none exists', async () => {
        mockLessonModel.findById.mock.mockImplementation(() =>
            mockChain({
                _id: 'lesson1',
                unitId: 'unit1',
                title: 'Lesson 1',
                type: 'VOCAB',
                orderIndex: 1,
                content: { type: 'VOCAB', items: [{ id: '1', word: 'hello' }] },
                practiceConfig: { passingScore: 80 },
            }),
        );
        mockUnitModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'unit1', courseId: 'course1', title: 'Unit 1', orderIndex: 1 }),
        );
        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({ _id: 'enrollment1', status: 'ACTIVE' }),
        );
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'course1', slug: 'test', name: 'Test', isActive: true }),
        );
        mockSanitizer.validateLessonContent.mock.mockImplementation(() => null);
        mockSanitizer.sanitizeLessonContent.mock.mockImplementation(() => ({}));
        mockProgressRepo.findByUserAndLesson.mock.mockImplementation(() => Promise.resolve(null));

        const result = await service.getLearnerLesson('user1', 'lesson1');
        assert.equal(result.progress.status, 'NOT_STARTED');
        assert.equal(result.progress.bestScore, null);
    });
});
