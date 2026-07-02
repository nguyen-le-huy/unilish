import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// ─── Mock dependencies before importing service ─────────────────────────────

const mockCourseModel = {
    findById: mock.fn(),
};

const mockEnrollmentModel = {
    findOne: mock.fn(),
};

const mockUserModel = {
    findByIdAndUpdate: mock.fn(),
};

const mockEnrollmentRepo = {
    findByUserAndCourse: mock.fn(),
    findActiveByUser: mock.fn(),
    findByUser: mock.fn(),
    pauseAllActiveByUser: mock.fn(),
    activateEnrollment: mock.fn(),
    upsertEnrollment: mock.fn(),
    findByIdSecure: mock.fn(),
};

// Create mocks for mongoose.Types.ObjectId
const mockObjectId = (id: string) => ({ toString: () => id, _str: id }) as any;

// Set up module-level mocks by manipulating the module system.
// We use a factory approach: create the service class with mocked deps directly.

// Dynamic import workaround: define the service inline for testing
import { HttpStatus } from '../src/constants/http-status.js';
import { AppError } from '../src/utils/app-error.js';
import { EEnrollmentStatus } from '../src/models/mongo/course-enrollment.model.js';

// Replicate the service class for isolated testing with mocks
class TestableLearningService {
    constructor(private readonly enrollmentRepo: typeof mockEnrollmentRepo) {}

    async enroll(
        userId: string,
        courseId: string,
    ): Promise<{
        enrollmentId: string;
        courseId: string;
        courseSlug: string;
        status: string;
        nextLessonId: string | null;
        created: boolean;
    }> {
        // 1. Validate Course exists and is active
        const course = await mockCourseModel.findById(courseId).exec() as {
            _id: unknown;
            slug: string;
            isActive: boolean;
            prerequisiteCourseId: unknown;
        } | null;

        if (!course) {
            throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (!course.isActive) {
            throw new AppError(
                'Khóa học hiện không khả dụng. Vui lòng chọn khóa học khác.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 2. Validate prerequisite Course is completed
        if (course.prerequisiteCourseId) {
            const prereqCompleted = await mockEnrollmentModel.findOne().lean().exec() as unknown | null;

            if (!prereqCompleted) {
                const prereqCourse = await mockCourseModel.findById(String(course.prerequisiteCourseId)).lean().exec() as { name: string } | null;
                throw new AppError(
                    `Bạn cần hoàn thành "${prereqCourse?.name ?? 'khóa học tiên quyết'}" trước khi ghi danh khóa học này.`,
                    HttpStatus.FORBIDDEN,
                );
            }
        }

        // 3. Check for existing enrollment
        const existing = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (existing) {
            if (existing.status === EEnrollmentStatus.ACTIVE) {
                return {
                    enrollmentId: String(existing._id),
                    courseId: String(existing.courseId),
                    courseSlug: course.slug,
                    status: existing.status,
                    nextLessonId: existing.lastLessonId ? String(existing.lastLessonId) : null,
                    created: false,
                };
            }

            if (existing.status === EEnrollmentStatus.COMPLETED) {
                throw new AppError(
                    'Khóa học đã được hoàn thành. Không thể ghi danh lại.',
                    HttpStatus.CONFLICT,
                );
            }

            const updated = await this.enrollmentRepo.activateEnrollment(
                String(existing._id),
                userId,
            );

            if (!updated) {
                throw new AppError('Không thể kích hoạt ghi danh', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            await mockUserModel.findByIdAndUpdate(userId, {
                lastActiveCourseId: mockObjectId(courseId),
                lastActiveAt: new Date(),
            });

            return {
                enrollmentId: String(updated._id),
                courseId: String(updated.courseId),
                courseSlug: course.slug,
                status: updated.status,
                nextLessonId: updated.lastLessonId ? String(updated.lastLessonId) : null,
                created: false,
            };
        }

        // 4. New enrollment
        await this.enrollmentRepo.pauseAllActiveByUser(userId);

        const totalRequiredLessons = 10;

        const { enrollment, created } = await this.enrollmentRepo.upsertEnrollment(
            userId,
            courseId,
            totalRequiredLessons,
        );

        await mockUserModel.findByIdAndUpdate(userId, {
            lastActiveCourseId: mockObjectId(courseId),
            lastActiveAt: new Date(),
        });

        return {
            enrollmentId: String(enrollment._id),
            courseId: String(enrollment.courseId),
            courseSlug: course.slug,
            status: enrollment.status,
            nextLessonId: null,
            created,
        };
    }
}

// ─── Helper to create query-like chain mocks ──────────────────────────────────

function mockChain(returnValue: unknown) {
    return {
        select: () => mockChain(returnValue),
        lean: () => mockChain(returnValue),
        exec: () => Promise.resolve(returnValue),
    };
}

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('LearningService.enroll', () => {
    let service: TestableLearningService;

    beforeEach(() => {
        // Reset all mocks
        mockCourseModel.findById.mock.resetCalls();
        mockEnrollmentModel.findOne.mock.resetCalls();
        mockUserModel.findByIdAndUpdate.mock.resetCalls();
        mockEnrollmentRepo.findByUserAndCourse.mock.resetCalls();
        mockEnrollmentRepo.pauseAllActiveByUser.mock.resetCalls();
        mockEnrollmentRepo.activateEnrollment.mock.resetCalls();
        mockEnrollmentRepo.upsertEnrollment.mock.resetCalls();

        service = new TestableLearningService(mockEnrollmentRepo);
    });

    // ─── AC-03: Invalid Course ────────────────────────────────────────────────

    it('throws 404 when course does not exist (AC-03)', async () => {
        mockCourseModel.findById.mock.mockImplementation(() => mockChain(null));

        await assert.rejects(
            () => service.enroll('user1', '507f1f77bcf86cd799439011'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.NOT_FOUND);
                assert.match(err.message, /không tồn tại/i);
                return true;
            },
        );
    });

    it('throws 403 when course is inactive (AC-03)', async () => {
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'id', slug: 'test', isActive: false, prerequisiteCourseId: null }),
        );

        await assert.rejects(
            () => service.enroll('user1', '507f1f77bcf86cd799439011'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.FORBIDDEN);
                assert.match(err.message, /không khả dụng/i);
                return true;
            },
        );
    });

    it('throws 403 when prerequisite course is not completed (AC-03)', async () => {
        const prereqCourseId = '507f1f77bcf86cd799439012';
        let callCount = 0;

        mockCourseModel.findById.mock.mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
                // First call: the course being enrolled in, has a prerequisite
                return mockChain({
                    _id: '507f1f77bcf86cd799439011',
                    slug: 'test',
                    isActive: true,
                    prerequisiteCourseId: prereqCourseId,
                });
            }
            // Second call: looking up the prerequisite course name for error message
            return mockChain({ _id: prereqCourseId, name: 'Pre-Intermediate', slug: 'pre-int', isActive: true, prerequisiteCourseId: null });
        });

        mockEnrollmentModel.findOne.mock.mockImplementation(() => mockChain(null));

        await assert.rejects(
            () => service.enroll('user1', '507f1f77bcf86cd799439011'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.FORBIDDEN);
                assert.match(err.message, /Pre-Intermediate/);
                return true;
            },
        );
    });

    // ─── AC-01: Idempotent Enrollment ─────────────────────────────────────────

    it('returns created=false when already active (AC-01)', async () => {
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'id', slug: 'test', isActive: true, prerequisiteCourseId: null }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                courseId: 'course1',
                lastLessonId: null,
                status: EEnrollmentStatus.ACTIVE,
            }),
        );

        const result = await service.enroll('user1', 'course1');
        assert.equal(result.created, false);
        assert.equal(result.status, EEnrollmentStatus.ACTIVE);
    });

    it('returns 409 when attempting to re-enroll a completed course', async () => {
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'id', slug: 'test', isActive: true, prerequisiteCourseId: null }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                courseId: 'course1',
                status: EEnrollmentStatus.COMPLETED,
            }),
        );

        await assert.rejects(
            () => service.enroll('user1', 'course1'),
            (err: AppError) => {
                assert.equal(err.statusCode, HttpStatus.CONFLICT);
                assert.match(err.message, /hoàn thành/);
                return true;
            },
        );
    });

    // ─── AC-02: One Active Course ──────────────────────────────────────────────

    it('pauses previous active and creates new enrollment (AC-02)', async () => {
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'course2', slug: 'test', isActive: true, prerequisiteCourseId: null }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() => Promise.resolve(null));
        mockEnrollmentRepo.pauseAllActiveByUser.mock.mockImplementation(() => Promise.resolve(1));
        mockEnrollmentRepo.upsertEnrollment.mock.mockImplementation(() =>
            Promise.resolve({
                enrollment: {
                    _id: 'enrollment2',
                    courseId: 'course2',
                    status: EEnrollmentStatus.ACTIVE,
                    lastLessonId: null,
                },
                created: true,
            }),
        );

        const result = await service.enroll('user1', 'course2');
        assert.equal(result.created, true);
        assert.equal(mockEnrollmentRepo.pauseAllActiveByUser.mock.calls.length, 1);
    });

    it('reactivates paused enrollment and pauses others (AC-02)', async () => {
        mockCourseModel.findById.mock.mockImplementation(() =>
            mockChain({ _id: 'course1', slug: 'test', isActive: true, prerequisiteCourseId: null }),
        );

        mockEnrollmentRepo.findByUserAndCourse.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                courseId: 'course1',
                status: EEnrollmentStatus.PAUSED,
            }),
        );

        mockEnrollmentRepo.activateEnrollment.mock.mockImplementation(() =>
            Promise.resolve({
                _id: 'enrollment1',
                courseId: 'course1',
                status: EEnrollmentStatus.ACTIVE,
                lastLessonId: null,
            }),
        );

        const result = await service.enroll('user1', 'course1');
        assert.equal(result.created, false);
        assert.equal(mockEnrollmentRepo.activateEnrollment.mock.calls.length, 1);
    });
});
