import { HttpStatus } from '../constants/http-status.js';
import { Course } from '../models/mongo/course.model.js';
import { CourseEnrollment, EEnrollmentStatus, type ICourseEnrollment } from '../models/mongo/course-enrollment.model.js';
import { CourseEnrollmentMongoRepository } from '../repositories/mongo/course-enrollment.mongo.repository.js';
import { LearnerLessonProgress, ELessonProgressStatus } from '../models/mongo/learner-lesson-progress.model.js';
import { LearnerLessonProgressMongoRepository } from '../repositories/mongo/learner-lesson-progress.mongo.repository.js';
import { Unit } from '../models/mongo/unit.model.js';
import { Lesson, ELessonType, EPracticeMode } from '../models/mongo/lesson.model.js';
import { Language } from '../models/mongo/language.model.js';
import { LearningGoal } from '../models/mongo/learning-goal.model.js';
import { sanitizeLessonContent, validateLessonContent } from './lesson-sanitizer.service.js';
import { gradeResponses, gradeSubjectivePass } from './lesson-grader.service.js';
import type { GradingResult } from './lesson-grader.service.js';
import { buildLearnerExercise, determineExerciseKind, loadLessonQuestionMap } from './learner-exercise.service.js';
import type { LearnerExerciseDto, LearnerPracticeQuestionDto, ExerciseKind, LessonType } from './learner-exercise.service.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import mongoose from 'mongoose';
import { User } from '../models/mongo/user.model.js';
import { LearnerLessonAttempt, type ILearnerLessonAttempt } from '../models/mongo/learner-lesson-attempt.model.js';
import { LearnerLessonAttemptMongoRepository } from '../repositories/mongo/learner-lesson-attempt.mongo.repository.js';
import type { LessonSubmission, ObjectiveAnswer } from '../validations/learning.validation.js';
import { resolveEffectivePracticeConfig } from '../utils/lesson-practice-config.js';

// ─── Service ──────────────────────────────────────────────────────────────────

export class LearningService {
    constructor(
        private readonly enrollmentRepo: CourseEnrollmentMongoRepository,
        private readonly progressRepo: LearnerLessonProgressMongoRepository,
        private readonly attemptRepo: LearnerLessonAttemptMongoRepository,
    ) {}

    /**
     * Enroll in a Course.
     *
     * - Validates Course exists and is active.
     * - Validates prerequisite Course is completed.
     * - If already enrolled, reactivates the existing enrollment idempotently.
     * - Pauses any other ACTIVE enrollment atomically.
     * - Synchronizes User.lastActiveCourseId as a compatibility projection.
     *
     * Implements FR-01, FR-02, AC-01, AC-02, AC-03.
     */
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
        const course = await Course.findById(courseId)
            .select('_id slug isActive prerequisiteCourseId')
            .lean()
            .exec() as { _id: unknown; slug: string; isActive: boolean; prerequisiteCourseId: unknown } | null;

        if (!course) {
            throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (!course.isActive) {
            throw new AppError(
                'Khóa học hiện không khả dụng. Vui lòng chọn khóa học khác.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 2. Validate prerequisite Course is completed (FR-01, AC-03)
        if (course.prerequisiteCourseId) {
            const prereqId = String(course.prerequisiteCourseId);
            const prereqCompleted = await CourseEnrollment.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                courseId: new mongoose.Types.ObjectId(prereqId),
                status: EEnrollmentStatus.COMPLETED,
            }).lean().exec();

            if (!prereqCompleted) {
                // Fetch prerequisite course name for a helpful error message
                const prereqCourse = await Course.findById(prereqId)
                    .select('name')
                    .lean()
                    .exec() as { name: string } | null;

                throw new AppError(
                    `Bạn cần hoàn thành "${prereqCourse?.name ?? 'khóa học tiên quyết'}" trước khi ghi danh khóa học này.`,
                    HttpStatus.FORBIDDEN,
                );
            }
        }

        // 3. Check for existing enrollment
        const existing = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (existing) {
            // Already enrolled — reactivate if not already ACTIVE
            if (existing.status === EEnrollmentStatus.ACTIVE) {
                // Idempotent: already active, return as-is
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

            // Reactivate: pause others, then set this one ACTIVE
            const updated = await this.enrollmentRepo.activateEnrollment(
                String(existing._id),
                userId,
            );

            if (!updated) {
                throw new AppError('Không thể kích hoạt ghi danh', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            // Sync User.lastActiveCourseId (compatibility projection)
            await User.findByIdAndUpdate(userId, {
                lastActiveCourseId: new mongoose.Types.ObjectId(courseId),
                lastActiveAt: new Date(),
            });

            logger.info('enrollment.reactivated', {
                userId,
                courseId,
                enrollmentId: String(updated._id),
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

        // 4. New enrollment — pause existing active, create new one
        await this.enrollmentRepo.pauseAllActiveByUser(userId);

        // Count required lessons for the course
        const totalRequiredLessons = await this.countRequiredLessons(courseId);

        const { enrollment, created } = await this.enrollmentRepo.upsertEnrollment(
            userId,
            courseId,
            totalRequiredLessons,
        );

        // Sync User.lastActiveCourseId
        await User.findByIdAndUpdate(userId, {
            lastActiveCourseId: new mongoose.Types.ObjectId(courseId),
            lastActiveAt: new Date(),
        });

        logger.info('enrollment.created', {
            userId,
            courseId,
            enrollmentId: String(enrollment._id),
            totalRequiredLessons,
        });

        return {
            enrollmentId: String(enrollment._id),
            courseId: String(enrollment.courseId),
            courseSlug: course.slug,
            status: enrollment.status,
            nextLessonId: null, // New enrollment — no resumable lesson yet
            created,
        };
    }

    /**
     * Get learning dashboard for the authenticated user.
     *
     * Returns active Course with progress, summary statistics, and activity days.
     * Before Phase 6, summary and activityDays return honest zero values.
     *
     * Implements FR-03, AC-04, AC-05.
     */
    async getDashboard(
        userId: string,
        _period?: string,
        _month?: string,
    ): Promise<{
        activeCourse: {
            id: string;
            slug: string;
            name: string;
            thumbnailUrl: string | null;
            level: string;
            totalUnits: number;
            totalLessons: number;
            completedLessons: number;
            progressPercent: number;
            timeSpentSeconds: number;
            nextLessonId: string | null;
            status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
        } | null;
        summary: {
            timeSpentSeconds: number;
            completedCourses: number;
            activeCourses: number;
        };
        activityDays: Array<{ date: string; minutes: number }>;
    }> {
        // 1. Find active enrollment
        const enrollment = await this.enrollmentRepo.findActiveByUser(userId);

        if (!enrollment) {
            // AC-04: No active enrollment — return null activeCourse with zero summary
            const activityDays = _period === 'month' && _month
                ? await this.getMonthlyActivity(userId, _month)
                : [];

            return {
                activeCourse: null,
                summary: { timeSpentSeconds: 0, completedCourses: 0, activeCourses: 0 },
                activityDays,
            };
        }

        // 2. Find course
        const course = await Course.findById(enrollment.courseId)
            .select('slug name thumbnailUrl level totalUnits')
            .lean()
            .exec() as { slug: string; name: string; thumbnailUrl: string | null; level: string; totalUnits: number } | null;

        if (!course) {
            // Course was deleted — enrollment is orphaned
            const activityDays = _period === 'month' && _month
                ? await this.getMonthlyActivity(userId, _month)
                : [];

            return {
                activeCourse: null,
                summary: { timeSpentSeconds: 0, completedCourses: 0, activeCourses: 0 },
                activityDays,
            };
        }

        // 3. Get progress summary from LearnerLessonProgress
        const progressRecords = await LearnerLessonProgress.find({
            enrollmentId: enrollment._id,
        })
            .select('status timeSpentSeconds')
            .lean()
            .exec() as Array<{ status: string; timeSpentSeconds: number }>;

        const completedLessons = progressRecords.filter(
            (p) => p.status === ELessonProgressStatus.COMPLETED,
        ).length;

        const totalTimeSpent = progressRecords.reduce(
            (sum, p) => sum + (p.timeSpentSeconds || 0),
            0,
        );

        // 4. Total required lessons from enrollment (authoritative source)
        const totalLessons = enrollment.totalRequiredLessonCount;

        // 5. Progress percentage: (completed / total) * 100, rounded to nearest integer
        const progressPercent =
            totalLessons > 0
                ? Math.round((completedLessons / totalLessons) * 100)
                : 0;

        // 6. Determine enrollment-based course status
        let courseStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
        if (enrollment.status === EEnrollmentStatus.COMPLETED) {
            courseStatus = 'COMPLETED';
        } else if (completedLessons > 0) {
            courseStatus = 'IN_PROGRESS';
        } else {
            courseStatus = 'NOT_STARTED';
        }

        // 7. Find next recommended lesson
        const nextLessonId = await this.findNextLesson(
            String(enrollment.courseId),
            String(enrollment._id),
            userId,
        );

        // 8. Summary statistics (honest, before Phase 6 analytics)
        const completedCourses = await CourseEnrollment.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
            status: EEnrollmentStatus.COMPLETED,
        }).exec();

        const activeCourses = await CourseEnrollment.countDocuments({
            userId: new mongoose.Types.ObjectId(userId),
            status: EEnrollmentStatus.ACTIVE,
        }).exec();

        // 9. Compute activity days for the requested month (Phase 6: BE-14)
        const activityDays = _period === 'month' && _month
            ? await this.getMonthlyActivity(userId, _month)
            : [];

        return {
            activeCourse: {
                id: String(enrollment.courseId),
                slug: course.slug,
                name: course.name,
                thumbnailUrl: course.thumbnailUrl,
                level: course.level,
                totalUnits: course.totalUnits,
                totalLessons,
                completedLessons,
                progressPercent,
                timeSpentSeconds: totalTimeSpent,
                nextLessonId,
                status: courseStatus,
            },
            summary: {
                timeSpentSeconds: totalTimeSpent,
                completedCourses,
                activeCourses,
            },
            activityDays,
        };
    }

    /**
     * Get monthly learning activity for the user.
     *
     * Aggregates active-learning days from LearnerLessonProgress.lastAccessedAt
     * within the given month using Asia/Ho_Chi_Minh timezone.
     *
     * Returns distinct activity dates with approximate minutes per day.
     * If no per-day time data is available, minutes reflect a proportional
     * distribution of total monthly time.
     *
     * Implements AC-18 (Monthly Activity).
     */
    private async getMonthlyActivity(
        userId: string,
        month: string, // "YYYY-MM" format
    ): Promise<Array<{ date: string; minutes: number }>> {
        // Parse month boundaries in Asia/Ho_Chi_Minh (UTC+7)
        const [yearStr, monthStr] = month.split('-');
        const year = parseInt(yearStr!, 10);
        const mon = parseInt(monthStr!, 10);

        // Start of month in ICT: YYYY-MM-01 00:00:00 ICT
        const startICT = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0, 0));
        startICT.setHours(startICT.getHours() - 7); // Convert ICT → UTC (subtract 7h)

        // End of month in ICT: YYYY-(MM+1)-01 00:00:00 ICT
        const endICT = new Date(Date.UTC(year, mon, 1, 0, 0, 0, 0));
        endICT.setHours(endICT.getHours() - 7); // Convert ICT → UTC

        // Query all progress records with lastAccessedAt in the month
        const progressRecords = await LearnerLessonProgress.find({
            userId: new mongoose.Types.ObjectId(userId),
            lastAccessedAt: {
                $gte: startICT,
                $lt: endICT,
            },
        })
            .select('lastAccessedAt timeSpentSeconds')
            .lean()
            .exec() as Array<{ lastAccessedAt: Date; timeSpentSeconds: number }>;

        if (progressRecords.length === 0) {
            return [];
        }

        // Group by date in Asia/Ho_Chi_Minh timezone
        const dayMap = new Map<string, { count: number; timeSum: number }>();

        // Add 7 hours (ICT offset) and extract date string YYYY-MM-DD
        const ICT_OFFSET_MS = 7 * 60 * 60 * 1000;

        for (const record of progressRecords) {
            const localDate = new Date(
                record.lastAccessedAt.getTime() + ICT_OFFSET_MS,
            );
            const dateStr = localDate.toISOString().slice(0, 10); // "2026-07-15"

            const existing = dayMap.get(dateStr);
            if (existing) {
                existing.count += 1;
                // timeSpentSeconds is cumulative per lesson, so we can't just sum.
                // Instead, count this as an activity day.
            } else {
                dayMap.set(dateStr, { count: 1, timeSum: 0 });
            }
        }

        // Calculate total monthly time by computing time delta from enrollment time
        // Since timeSpentSeconds is cumulative, we use the enrollment-level total.
        const enrollments = await CourseEnrollment.find({
            userId: new mongoose.Types.ObjectId(userId),
        })
            .select('timeSpentSeconds')
            .lean()
            .exec() as Array<{ timeSpentSeconds: number }>;

        const totalMonthlySeconds = enrollments.reduce(
            (sum, e) => sum + (e.timeSpentSeconds || 0),
            0,
        );

        const activeDayCount = dayMap.size;
        const avgMinutesPerDay =
            activeDayCount > 0
                ? Math.round(totalMonthlySeconds / 60 / activeDayCount)
                : 0;

        // Build result sorted by date
        const sortedDates = Array.from(dayMap.keys()).sort();

        return sortedDates.map((dateStr) => ({
            date: dateStr,
            minutes: avgMinutesPerDay,
        }));
    }

    /**
     * Get the course roadmap for a learner.
     *
     * Returns ordered Units and Lessons with computed statuses.
     * Enforces enrollment, prerequisite, and active curriculum checks.
     *
     * Implements FR-04, FR-05, AC-06, AC-07, AC-08.
     */
    async getRoadmap(
        userId: string,
        slug: string,
    ): Promise<{
        course: {
            id: string;
            slug: string;
            name: string;
            description: string | null;
            thumbnailUrl: string | null;
            level: string;
            language: { id: string; code: string; name: string };
            learningGoal: { id: string; slug: string; title: string };
        };
        enrollment: { id: string; status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' };
        progressPercent: number;
        nextLessonId: string | null;
        units: Array<{
            id: string;
            title: string;
            description: string | null;
            orderIndex: number;
            status: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
            progressPercent: number;
            lessons: Array<{
                id: string;
                title: string;
                type: string;
                orderIndex: number;
                status: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
                bestScore: number | null;
                lockReason: string | null;
            }>;
        }>;
    }> {
        // 1. Find course by slug
        const course = await Course.findOne({ slug })
            .select('_id name slug description thumbnailUrl level languageId learningGoalId isActive prerequisiteCourseId')
            .lean()
            .exec() as {
                _id: unknown;
                name: string;
                slug: string;
                description: string | null;
                thumbnailUrl: string | null;
                level: string;
                languageId: unknown;
                learningGoalId: unknown;
                isActive: boolean;
                prerequisiteCourseId: unknown;
            } | null;

        if (!course) {
            throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Check enrollment
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(
            userId,
            String(course._id),
        );

        if (!enrollment) {
            throw new AppError(
                'Bạn chưa ghi danh khóa học này. Vui lòng ghi danh trước.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 3. For non-COMPLETED enrollments, verify prerequisite is met (AC-08)
        if (
            enrollment.status !== EEnrollmentStatus.COMPLETED &&
            course.prerequisiteCourseId
        ) {
            const prereqId = String(course.prerequisiteCourseId);
            const prereqCompleted = await CourseEnrollment.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                courseId: new mongoose.Types.ObjectId(prereqId),
                status: EEnrollmentStatus.COMPLETED,
            }).lean().exec();

            if (!prereqCompleted) {
                throw new AppError(
                    'Bạn cần hoàn thành khóa học tiên quyết trước khi truy cập khóa học này.',
                    HttpStatus.FORBIDDEN,
                );
            }
        }

        // 4. Fetch language and learning goal
        const [language, learningGoal] = await Promise.all([
            Language.findById(course.languageId)
                .select('_id code name')
                .lean()
                .exec() as Promise<{ _id: unknown; code: string; name: string } | null>,
            LearningGoal.findById(course.learningGoalId)
                .select('_id slug title')
                .lean()
                .exec() as Promise<{ _id: unknown; slug: string; title: string } | null>,
        ]);

        // 5. Fetch units and lessons
        const units = await Unit.find({ courseId: new mongoose.Types.ObjectId(String(course._id)) })
            .select('_id title description orderIndex')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{
                _id: unknown;
                title: string;
                description: string | null;
                orderIndex: number;
            }>;

        // Get all lesson IDs for these units as ObjectId[]
        const unitIds = units.map((u) => new mongoose.Types.ObjectId(String(u._id)));

        const lessons = await Lesson.find({ unitId: { $in: unitIds } })
            .select('_id unitId title type orderIndex practiceConfig')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{
                _id: unknown;
                unitId: unknown;
                title: string;
                type: string;
                orderIndex: number;
                practiceConfig: { passingScore: number };
            }>;

        // 6. Fetch progress records for this enrollment
        const progressRecords = await LearnerLessonProgress.find({
            enrollmentId: enrollment._id,
        })
            .select('lessonId status bestScore')
            .lean()
            .exec() as Array<{
                lessonId: unknown;
                status: string;
                bestScore: number;
            }>;

        // Build progress map: lessonId → progress
        const progressMap = new Map<
            string,
            { status: string; bestScore: number }
        >();
        for (const p of progressRecords) {
            progressMap.set(String(p.lessonId), {
                status: p.status,
                bestScore: p.bestScore,
            });
        }

        // 7. Check if course/curriculum is inactive for lock reasons
        const isCourseActive = !!course.isActive;
        const courseActiveForEnrollment =
            enrollment.status === EEnrollmentStatus.ACTIVE;

        // 8. Build unit and lesson response
        const enrollmentStatus = enrollment.status as 'ACTIVE' | 'PAUSED' | 'COMPLETED';

        // Build a set of unitIds for fast lookup
        const unitIdsSet = new Set(unitIds.map(String));
        const lessonsByUnit = new Map<string, typeof lessons>();
        for (const lesson of lessons) {
            const unitKey = String(lesson.unitId);
            if (!lessonsByUnit.has(unitKey)) {
                lessonsByUnit.set(unitKey, []);
            }
            lessonsByUnit.get(unitKey)!.push(lesson);
        }

        const unitsResponse = units.map((unit) => {
            const unitLessons = lessonsByUnit.get(String(unit._id)) || [];

            const lessonResponses = unitLessons.map((lesson) => {
                const progress = progressMap.get(String(lesson._id));

                let lessonStatus: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
                let lockReason: string | null = null;

                if (progress) {
                    if (progress.status === ELessonProgressStatus.COMPLETED) {
                        lessonStatus = 'COMPLETED';
                    } else if (progress.status === ELessonProgressStatus.IN_PROGRESS) {
                        lessonStatus = 'IN_PROGRESS';
                    } else {
                        // NOT_STARTED with progress record — treat as AVAILABLE
                        lessonStatus = 'AVAILABLE';
                    }
                } else if (!isCourseActive || !courseActiveForEnrollment) {
                    lessonStatus = 'UNAVAILABLE';
                    lockReason = 'Khóa học hiện không khả dụng';
                } else {
                    // No progress record and course is active — AVAILABLE (free navigation per AC-07)
                    lessonStatus = 'AVAILABLE';
                }

                return {
                    id: String(lesson._id),
                    title: lesson.title,
                    type: lesson.type,
                    orderIndex: lesson.orderIndex,
                    status: lessonStatus,
                    bestScore:
                        progress && progress.bestScore >= 0
                            ? progress.bestScore
                            : null,
                    lockReason,
                };
            });

            // Compute unit status from its lessons
            let unitStatus: 'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';
            const lessonStatuses = lessonResponses.map((l) => l.status);

            if (lessonStatuses.length === 0) {
                unitStatus = isCourseActive && courseActiveForEnrollment ? 'AVAILABLE' : 'UNAVAILABLE';
            } else if (lessonStatuses.every((s) => s === 'COMPLETED')) {
                unitStatus = 'COMPLETED';
            } else if (lessonStatuses.some((s) => s === 'IN_PROGRESS')) {
                unitStatus = 'IN_PROGRESS';
            } else if (!isCourseActive || !courseActiveForEnrollment) {
                unitStatus = 'UNAVAILABLE';
            } else {
                unitStatus = 'AVAILABLE';
            }

            // Unit progress: completed / total
            const unitTotalLessons = lessonResponses.length;
            const unitCompletedLessons = lessonResponses.filter(
                (l) => l.status === 'COMPLETED',
            ).length;
            const unitProgressPercent =
                unitTotalLessons > 0
                    ? Math.round((unitCompletedLessons / unitTotalLessons) * 100)
                    : 0;

            return {
                id: String(unit._id),
                title: unit.title,
                description: unit.description,
                orderIndex: unit.orderIndex,
                status: unitStatus,
                progressPercent: unitProgressPercent,
                lessons: lessonResponses,
            };
        });

        // 9. Overall progress
        const allLessons = unitsResponse.flatMap((u) => u.lessons);
        const completedCount = allLessons.filter(
            (l) => l.status === 'COMPLETED',
        ).length;
        const totalCount = allLessons.length;
        const progressPercent =
            totalCount > 0
                ? Math.round((completedCount / totalCount) * 100)
                : 0;

        // 10. Next recommended lesson
        const nextLessonId = await this.findNextLesson(
            String(course._id),
            String(enrollment._id),
            userId,
        );

        return {
            course: {
                id: String(course._id),
                slug: course.slug,
                name: course.name,
                description: course.description,
                thumbnailUrl: course.thumbnailUrl,
                level: course.level,
                language: {
                    id: String(language?._id ?? ''),
                    code: language?.code ?? '',
                    name: language?.name ?? '',
                },
                learningGoal: {
                    id: String(learningGoal?._id ?? ''),
                    slug: learningGoal?.slug ?? '',
                    title: learningGoal?.title ?? '',
                },
            },
            enrollment: {
                id: String(enrollment._id),
                status: enrollmentStatus,
            },
            progressPercent,
            nextLessonId,
            units: unitsResponse,
        };
    }

    /**
     * List enrollments for the authenticated user.
     */
    async listEnrollments(
        userId: string,
        status?: string,
    ): Promise<
        Array<{
            enrollmentId: string;
            courseId: string;
            status: string;
            completedLessonCount: number;
            totalRequiredLessonCount: number;
            timeSpentSeconds: number;
            startedAt: Date;
            completedAt: Date | null;
        }>
    > {
        const enrollments = await this.enrollmentRepo.findByUser(userId, {
            userId,
            status: status ?? undefined,
        });

        return enrollments.map((e) => ({
            enrollmentId: String(e._id),
            courseId: String(e.courseId),
            status: e.status,
            completedLessonCount: e.completedLessonCount,
            totalRequiredLessonCount: e.totalRequiredLessonCount,
            timeSpentSeconds: e.timeSpentSeconds,
            startedAt: e.startedAt,
            completedAt: e.completedAt,
        }));
    }

    /**
     * Count required (published, active) lessons for a course.
     */
    private async countRequiredLessons(courseId: string): Promise<number> {
        const result = await mongoose.model('Unit')
            .aggregate([
                { $match: { courseId: new mongoose.Types.ObjectId(courseId), isActive: { $ne: false } } },
                {
                    $lookup: {
                        from: 'lessons',
                        localField: '_id',
                        foreignField: 'unitId',
                        as: 'lessons',
                        pipeline: [
                            { $match: { isActive: { $ne: false } } },
                            { $count: 'count' },
                        ],
                    },
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $arrayElemAt: ['$lessons.count', 0] } },
                    },
                },
            ])
            .exec();

        return result[0]?.total ?? 0;
    }

    /**
     * Save a checkpoint for a lesson.
     *
     * - Validates checkpoint kind matches Lesson exercise kind (BE-09).
     * - For OBJECTIVE checkpoints, validates question IDs/types/versions.
     * - Uses optimistic concurrency via checkpointVersion.
     * - Returns 409 CHECKPOINT_CONFLICT with latest checkpoint and version for reconciliation.
     * - Bounds activeSecondsDelta to max 300 seconds.
     * - Duplicate version delivery is prevented by the version check (each save increments version).
     * - Updates enrollment lastLessonId and accumulates time safely.
     *
     * Implements FR-10, AC-10, AC-11, AC-12, NFR-02, NFR-03.
     */
    async saveCheckpoint(
        userId: string,
        lessonId: string,
        version: number,
        checkpoint: unknown,
        activeSecondsDelta: number,
        conflictStrategy: 'STRICT' | 'LAST_WRITE_WINS' = 'STRICT',
    ): Promise<{
        progressId: string;
        checkpointVersion: number;
        timeSpentSeconds: number;
        status: string;
    }> {
        // 0. Serialize checkpoint for size validation before any DB reads
        const checkpointStr = JSON.stringify(checkpoint ?? {});
        const MAX_CHECKPOINT_SIZE = 100 * 1024; // 100KB
        if (checkpointStr.length > MAX_CHECKPOINT_SIZE) {
            throw new AppError(
                'Dữ liệu tiến trình vượt quá kích thước cho phép (100KB).',
                HttpStatus.BAD_REQUEST,
            );
        }

        const parsedCheckpoint = checkpoint as { kind: string } | null;
        const checkpointKind = parsedCheckpoint?.kind;

        // 1. Load lesson to validate checkpoint kind against exercise kind
        //    Also load question data for OBJECTIVE checkpoint validation
        const lesson = await Lesson.findById(lessonId)
            .select('_id type content practiceConfig')
            .lean()
            .exec() as {
                _id: unknown;
                type: string;
                content?: Record<string, unknown>;
                practiceConfig: {
                    mode: string;
                    questionIds: mongoose.Types.ObjectId[];
                    passingScore: number;
                };
            } | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        const lessonType = lesson.type as LessonType;
        const effectivePracticeConfig = resolveEffectivePracticeConfig({
            practiceConfig: lesson.practiceConfig,
            content: lesson.content,
        });
        const practiceMode = effectivePracticeConfig.mode;
        const questionMap = await loadLessonQuestionMap(effectivePracticeConfig.questionIds);

        // 2. Validate checkpoint kind against lesson exercise kind
        await this.validateCheckpointKind(
            lessonType,
            practiceMode,
            questionMap.size,
            checkpointKind,
        );

        // 3. For OBJECTIVE checkpoints, validate each answer's questionId, type, and version
        if (checkpointKind === 'OBJECTIVE') {
            const objectiveCheckpoint = checkpoint as {
                kind: 'OBJECTIVE';
                answers: Array<{
                    questionId: string;
                    questionVersion: number;
                    type: string;
                    answer: unknown;
                }>;
            };

            for (const answer of objectiveCheckpoint.answers) {
                this.validateCheckpointAnswer(answer, questionMap);
            }
        }

        // 4. Find progress record
        const progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);

        if (!progress) {
            throw new AppError(
                'Bạn cần bắt đầu bài học trước khi lưu tiến trình.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 5. Version check — 409 if stale, include latest checkpoint/version for reconciliation
        if (progress.checkpointVersion !== version && conflictStrategy === 'STRICT') {
            logger.warn('checkpoint.conflict', {
                userId,
                lessonId,
                expectedVersion: version,
                actualVersion: progress.checkpointVersion,
            });

            throw new AppError(
                'Phiên bản tiến trình không đồng bộ. Vui lòng tải lại.',
                HttpStatus.CONFLICT,
                {
                    latestCheckpoint: progress.checkpoint,
                    latestVersion: progress.checkpointVersion,
                },
            );
        }

        // 6. Bounded time delta (validated at route level, but double-check)
        //    Duplicate delivery protection: each successful save increments the version,
        //    so replaying the exact same request (same version + same checkpoint) will
        //    fail the version check (version already incremented). This prevents
        //    double-counting of activeSecondsDelta. (NFR-02, AC-11)
        const boundedDelta = Math.min(activeSecondsDelta, 300);

        // 7. Update checkpoint with optimistic concurrency
        const updated = conflictStrategy === 'LAST_WRITE_WINS'
            ? await this.progressRepo.updateCheckpointLatest(
                String(progress._id),
                userId,
                checkpoint,
                boundedDelta,
            )
            : await this.progressRepo.updateCheckpoint(
                String(progress._id),
                userId,
                version,
                checkpoint,
                boundedDelta,
            );

        if (!updated) {
            // Optimistic lock failure — another request advanced the version first
            // Fetch latest checkpoint data for the conflict response
            const latestProgress = await this.progressRepo.findByUserAndLesson(userId, lessonId);

            logger.warn('checkpoint.save_conflict', {
                userId,
                lessonId,
                version,
                progressId: String(progress._id),
            });

            throw new AppError(
                'Phiên bản tiến trình không đồng bộ. Vui lòng tải lại.',
                HttpStatus.CONFLICT,
                {
                    latestCheckpoint: latestProgress?.checkpoint ?? null,
                    latestVersion: latestProgress?.checkpointVersion ?? 0,
                },
            );
        }

        // 8. Update enrollment lastLessonId
        await CourseEnrollment.findByIdAndUpdate(progress.enrollmentId, {
            lastLessonId: new mongoose.Types.ObjectId(lessonId),
        }).exec();

        logger.info('checkpoint.saved', {
            userId,
            lessonId,
            progressId: String(updated._id),
            version: updated.checkpointVersion,
            timeDelta: boundedDelta,
        });

        return {
            progressId: String(updated._id),
            checkpointVersion: updated.checkpointVersion,
            timeSpentSeconds: updated.timeSpentSeconds,
            status: updated.status,
        };
    }

    /**
     * Validate that the checkpoint kind is allowed for the given lesson type.
     *
     * Rules (from exercise-spec.md and api-contract.md):
     * - OBJECTIVE checkpoint → only for OBJECTIVE exercise lessons with valid questions
     * - WRITING checkpoint → only for WRITING lessons
     * - SPEAKING checkpoint → only for SPEAKING lessons
     * - COMPLETION checkpoint → only for COMPLETION exercise lessons (non-assessed content)
     * - Any kind → rejected for DYNAMIC mode lessons
     *
     * Throws 400 or 422 on mismatch.
     *
     * Implements BE-09 (checkpoint kind validation).
     */
    private async validateCheckpointKind(
        lessonType: LessonType,
        practiceMode: string | undefined,
        validQuestionCount: number,
        checkpointKind: string | undefined,
    ): Promise<void> {
        if (!checkpointKind) {
            throw new AppError(
                'Thiếu loại checkpoint.',
                HttpStatus.BAD_REQUEST,
            );
        }

        const isDynamic = practiceMode === EPracticeMode.DYNAMIC;

        if (isDynamic) {
            throw new AppError(
                'Bài học sử dụng bài tập động chưa được hỗ trợ.',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        let expectedKind: string;
        try {
            const result = determineExerciseKind(
                lessonType,
                practiceMode,
                validQuestionCount,
            );
            expectedKind = result.kind;
        } catch {
            // If determineExerciseKind throws (e.g. UNIT_TEST with no questions),
            // the lesson should have returned 422 at read time. But validate anyway.
            throw new AppError(
                'Loại bài học không hỗ trợ checkpoint.',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        // Map exercise kind to allowed checkpoint kinds
        const allowedCheckpointKinds: Record<string, string[]> = {
            'OBJECTIVE': ['OBJECTIVE'],
            'SPEAKING': ['SPEAKING'],
            'WRITING': ['WRITING'],
            'COMPLETION': ['COMPLETION'],
        };

        const allowed = allowedCheckpointKinds[expectedKind];
        if (!allowed || !allowed.includes(checkpointKind)) {
            throw new AppError(
                `Loại checkpoint không phù hợp với bài học này.`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Validate a single checkpoint answer against the lesson's question set.
     *
     * Checks:
     * - questionId exists in the lesson's question set
     * - questionVersion matches the current published version
     * - type matches the question type
     *
     * Throws 400 on any mismatch.
     *
     * Implements BE-09 (reject unknown question IDs/types/versions).
     */
    private validateCheckpointAnswer(
        answer: { questionId: string; questionVersion: number; type: string },
        questionMap: Map<string, { type: string; version: number }>,
    ): void {
        const questionInfo = questionMap.get(answer.questionId);

        if (!questionInfo) {
            throw new AppError(
                `Câu hỏi không hợp lệ hoặc không thuộc bài học này.`,
                HttpStatus.BAD_REQUEST,
            );
        }

        if (questionInfo.version !== answer.questionVersion) {
            throw new AppError(
                `Phiên bản câu hỏi đã thay đổi. Vui lòng tải lại bài học.`,
                HttpStatus.CONFLICT,
            );
        }

        if (questionInfo.type !== answer.type) {
            throw new AppError(
                `Loại câu hỏi không khớp.`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Start a lesson for the learner.
     *
     * Creates or returns existing LearnerLessonProgress.
     * Validates enrollment and Lesson -> Unit -> Course ancestry.
     *
     * Implements FR-06, AC-10.
     */
    async startLesson(
        userId: string,
        lessonId: string,
    ): Promise<{
        progressId: string;
        lessonId: string;
        status: string;
        checkpointVersion: number;
        startedAt: Date;
        navigation: {
            previousLessonId: string | null;
            nextLessonId: string | null;
        };
    }> {
        // 1. Find lesson and validate ancestry
        const lesson = await Lesson.findById(lessonId)
            .select('_id unitId type')
            .lean()
            .exec() as { _id: unknown; unitId: unknown; type: string } | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Find unit to get courseId
        const unit = await Unit.findById(lesson.unitId)
            .select('_id courseId')
            .lean()
            .exec() as { _id: unknown; courseId: unknown } | null;

        if (!unit) {
            throw new AppError('Đơn vị bài học không tồn tại', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        // 3. Validate enrollment (which validates course is active and enrolled)
        const courseId = String(unit.courseId);
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (!enrollment) {
            throw new AppError(
                'Bạn chưa ghi danh khóa học này.',
                HttpStatus.FORBIDDEN,
            );
        }

        if (enrollment.status !== EEnrollmentStatus.ACTIVE) {
            throw new AppError(
                'Khóa học không ở trạng thái hoạt động.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 4. Check course is active
        const course = await Course.findById(courseId)
            .select('isActive')
            .lean()
            .exec() as { isActive: boolean } | null;

        if (!course || !course.isActive) {
            throw new AppError(
                'Khóa học hiện không khả dụng.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 5. Create or find existing progress
        let progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);
        const isNewLesson = !progress;

        if (progress) {
            // Update lastAccessedAt
            await LearnerLessonProgress.findByIdAndUpdate(progress._id, {
                lastAccessedAt: new Date(),
            }).exec();

            // Return existing progress (idempotent for repeated calls)
            const nav = await this.getNavigation(
                String(courseId),
                String(enrollment._id),
                userId,
                lessonId,
            );

            return {
                progressId: String(progress._id),
                lessonId: String(lesson._id),
                status: progress.status,
                checkpointVersion: progress.checkpointVersion,
                startedAt: progress.firstStartedAt ?? progress.createdAt,
                navigation: nav,
            };
        }

        // Create new progress record
        const now = new Date();
        progress = await LearnerLessonProgress.create({
            userId: new mongoose.Types.ObjectId(userId),
            enrollmentId: new mongoose.Types.ObjectId(String(enrollment._id)),
            courseId: new mongoose.Types.ObjectId(courseId),
            unitId: new mongoose.Types.ObjectId(String(unit._id)),
            lessonId: new mongoose.Types.ObjectId(lessonId),
            status: ELessonProgressStatus.IN_PROGRESS,
            checkpointVersion: 0,
            checkpoint: null,
            timeSpentSeconds: 0,
            firstStartedAt: now,
            lastAccessedAt: now,
        } as any);

        // Update enrollment lastLessonId
        await CourseEnrollment.findByIdAndUpdate(enrollment._id, {
            lastLessonId: new mongoose.Types.ObjectId(lessonId),
        }).exec();

        logger.info('lesson.started', {
            userId,
            lessonId,
            enrollmentId: String(enrollment._id),
            courseId,
            lessonType: lesson.type,
            isNew: isNewLesson,
        });

        const nav = await this.getNavigation(
            courseId,
            String(enrollment._id),
            userId,
            lessonId,
        );

        return {
            progressId: String(progress._id),
            lessonId: String(lesson._id),
            status: ELessonProgressStatus.IN_PROGRESS,
            checkpointVersion: 0,
            startedAt: now,
            navigation: nav,
        };
    }

    /**
     * Restart a completed lesson for retry.
     *
     * Resets checkpoint and sets progress back to IN_PROGRESS,
     * while preserving bestScore, attemptsCount, and completion history.
     * The learner can then re-submit new answers for a fresh attempt.
     *
     * Implements FR-13 (Retry), AC-32 (Retry Preserves Best Score).
     */
    async restartLesson(
        userId: string,
        lessonId: string,
    ): Promise<{
        progressId: string;
        status: string;
        checkpointVersion: number;
    }> {
        // 1. Find existing progress
        const progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);

        if (!progress) {
            throw new AppError(
                'Bạn cần bắt đầu bài học trước khi làm lại.',
                HttpStatus.FORBIDDEN,
            );
        }

        if (progress.status !== ELessonProgressStatus.COMPLETED) {
            // Not completed — nothing to restart, just return current state
            return {
                progressId: String(progress._id),
                status: progress.status,
                checkpointVersion: progress.checkpointVersion,
            };
        }

        // 2. Reset checkpoint, set to IN_PROGRESS, preserve best score
        await LearnerLessonProgress.findByIdAndUpdate(progress._id, {
            status: ELessonProgressStatus.IN_PROGRESS,
            checkpoint: null,
            checkpointVersion: 0,
            lastAccessedAt: new Date(),
        }).exec();

        logger.info('lesson.restarted', {
            userId,
            lessonId,
            progressId: String(progress._id),
        });

        return {
            progressId: String(progress._id),
            status: ELessonProgressStatus.IN_PROGRESS,
            checkpointVersion: 0,
        };
    }

    /**
     * Read a lesson for the learner with sanitized content and exercise DTO.
     *
     * Validates enrollment and Lesson -> Unit -> Course ancestry.
     * Returns sanitized content, exercise, progress, and navigation context.
     *
     * Implements FR-05, FR-06, FR-17, AC-09, AC-10, AC-19, AC-23, AC-31, NFR-11.
     */
    async getLearnerLesson(
        userId: string,
        lessonId: string,
    ): Promise<{
        course: { id: string; slug: string; name: string };
        unit: { id: string; title: string; orderIndex: number };
        lesson: {
            id: string;
            title: string;
            type: string;
            orderIndex: number;
            content: Record<string, unknown>;
            passingScore: number | null;
            exercise: LearnerExerciseDto;
        };
        progress: {
            status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
            checkpoint: unknown;
            checkpointVersion: number;
            bestScore: number | null;
        };
        navigation: {
            previousLessonId: string | null;
            nextLessonId: string | null;
        };
    }> {
        // 1. Find lesson with full details
        const lesson = await Lesson.findById(lessonId)
            .select('_id unitId title type orderIndex content practiceConfig')
            .lean()
            .exec() as {
                _id: unknown;
                unitId: unknown;
                title: string;
                type: string;
                orderIndex: number;
                content: unknown;
                practiceConfig: {
                    mode: string;
                    questionIds: mongoose.Types.ObjectId[];
                    passingScore: number;
                };
            } | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Validate Unit -> Course ancestry
        const unit = await Unit.findById(lesson.unitId)
            .select('_id courseId title orderIndex')
            .lean()
            .exec() as { _id: unknown; courseId: unknown; title: string; orderIndex: number } | null;

        if (!unit) {
            throw new AppError('Đơn vị bài học không tồn tại', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const courseId = String(unit.courseId);

        // 3. Validate enrollment
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (!enrollment) {
            throw new AppError(
                'Bạn chưa ghi danh khóa học này.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 4. Check course is active
        const course = await Course.findById(courseId)
            .select('_id slug name isActive')
            .lean()
            .exec() as { _id: unknown; slug: string; name: string; isActive: boolean } | null;

        if (!course) {
            throw new AppError('Khóa học không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (!course.isActive && enrollment.status !== EEnrollmentStatus.COMPLETED) {
            throw new AppError(
                'Khóa học hiện không khả dụng.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 5. Validate and sanitize content
        const malformedMessage = validateLessonContent(
            lesson.type as any,
            lesson.content,
        );

        if (malformedMessage) {
            logger.warn('Malformed lesson content', {
                lessonId,
                type: lesson.type,
                message: malformedMessage,
            });
            throw new AppError(malformedMessage, HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const safeContent = sanitizeLessonContent(
            lesson.type as any,
            lesson.content,
        );

        // 6. Build learner exercise DTO (FR-17, NFR-11, AC-23, AC-31)
        const lessonType = lesson.type as any;
        const effectivePracticeConfig = resolveEffectivePracticeConfig({
            practiceConfig: lesson.practiceConfig,
            content: lesson.content as Record<string, unknown> | undefined,
        });
        const practiceMode = effectivePracticeConfig.mode;
        const questionIds = effectivePracticeConfig.questionIds;
        const passingScore = effectivePracticeConfig.passingScore ?? 80;

        const exercise = await buildLearnerExercise(
            lessonType,
            practiceMode,
            questionIds,
            passingScore,
            lesson.content as Record<string, unknown> | undefined,
        );

        // 7. Find or create progress record
        let progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);

        if (!progress) {
            // Create a NOT_STARTED progress record so the GET doesn't require start first
            progress = await LearnerLessonProgress.create({
                userId: new mongoose.Types.ObjectId(userId),
                enrollmentId: new mongoose.Types.ObjectId(String(enrollment._id)),
                courseId: new mongoose.Types.ObjectId(courseId),
                unitId: new mongoose.Types.ObjectId(String(unit._id)),
                lessonId: new mongoose.Types.ObjectId(lessonId),
                status: ELessonProgressStatus.NOT_STARTED,
                checkpointVersion: 0,
                checkpoint: null,
                timeSpentSeconds: 0,
                lastAccessedAt: new Date(),
            } as any);
        }

        // 8. Build progress DTO
        const progressStatus = progress.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
        const bestScore = progress.bestScore >= 0 ? progress.bestScore : null;

        // 9. Navigation context
        const nav = await this.getNavigation(
            courseId,
            String(enrollment._id),
            userId,
            lessonId,
        );

        return {
            course: {
                id: String(course._id),
                slug: course.slug,
                name: course.name,
            },
            unit: {
                id: String(unit._id),
                title: unit.title,
                orderIndex: unit.orderIndex,
            },
            lesson: {
                id: String(lesson._id),
                title: lesson.title,
                type: lesson.type,
                orderIndex: lesson.orderIndex,
                content: safeContent,
                passingScore: effectivePracticeConfig.passingScore ?? null,
                exercise,
            },
            progress: {
                status: progressStatus,
                checkpoint: progress.checkpoint ?? null,
                checkpointVersion: progress.checkpointVersion,
                bestScore,
            },
            navigation: nav,
        };
    }

    /**
     * Submit a lesson for grading.
     *
     * - Validates enrollment, ancestry, and submission kind.
     * - BE-10: Validates objective answers: question membership, versions,
     *   types, completeness (exactly one answer per question).
     * - BE-11: Validates Speaking session ownership, Writing word count,
     *   COMPLETION eligibility.
     * - Checks for duplicate clientAttemptId (idempotency).
     * - Grades objective question types server-side.
     * - Speaking/Writing auto-pass with placeholder feedback.
     * - Persists immutable attempt record.
     * - Updates progress and enrollment.
     * - Supports unlimited retries with latest/best score tracking.
     *
     * Implements FR-08, FR-10, FR-13, FR-19, AC-13, AC-14, AC-21,
     * AC-26, AC-27, AC-28, AC-29, AC-30, NFR-11.
     */
    async submitLesson(
        userId: string,
        lessonId: string,
        clientAttemptId: string,
        submission: LessonSubmission,
        durationSeconds: number,
    ): Promise<{
        attemptId: string;
        score: number | null;
        passed: boolean;
        latestScore: number | null;
        bestScore: number | null;
        feedback: unknown;
        progress: {
            lessonStatus: 'IN_PROGRESS' | 'COMPLETED';
            unitStatus: string;
            courseStatus: string;
            courseProgressPercent: number;
        };
        nextLessonId: string | null;
    }> {
        // 1. Find lesson with practice config + content (for word count, etc.)
        const lesson = await Lesson.findById(lessonId)
            .select('_id unitId title type orderIndex practiceConfig content')
            .lean()
            .exec() as {
                _id: unknown;
                unitId: unknown;
                title: string;
                type: string;
                orderIndex: number;
                content: Record<string, unknown>;
                practiceConfig: {
                    mode: string;
                    questionIds: mongoose.Types.ObjectId[];
                    passingScore: number;
                };
            } | null;

        if (!lesson) {
            throw new AppError('Bài học không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Validate Unit -> Course ancestry
        const unit = await Unit.findById(lesson.unitId)
            .select('_id courseId')
            .lean()
            .exec() as { _id: unknown; courseId: unknown } | null;

        if (!unit) {
            throw new AppError('Đơn vị bài học không tồn tại', HttpStatus.UNPROCESSABLE_ENTITY);
        }

        const courseId = String(unit.courseId);

        // 3. Validate enrollment
        const enrollment = await this.enrollmentRepo.findByUserAndCourse(userId, courseId);

        if (!enrollment) {
            throw new AppError(
                'Bạn chưa ghi danh khóa học này.',
                HttpStatus.FORBIDDEN,
            );
        }

        if (enrollment.status !== EEnrollmentStatus.ACTIVE) {
            throw new AppError(
                'Không thể nộp bài cho khóa học không hoạt động.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 4. Check course is active
        const courseDoc = await Course.findById(courseId)
            .select('isActive')
            .lean()
            .exec() as { isActive: boolean } | null;

        if (!courseDoc || !courseDoc.isActive) {
            throw new AppError(
                'Khóa học hiện không khả dụng.',
                HttpStatus.FORBIDDEN,
            );
        }

        // 5. Validate submission kind matches lesson exercise kind (BE-11)
        const lessonType = lesson.type;
        const effectivePracticeConfig = resolveEffectivePracticeConfig({
            practiceConfig: lesson.practiceConfig,
            content: lesson.content,
        });
        const practiceMode = effectivePracticeConfig.mode;
        const submissionKind = submission.kind;
        const questionIds = effectivePracticeConfig.questionIds.map((id) => String(id));
        const passingScore = effectivePracticeConfig.passingScore ?? 80;

        await this.validateSubmissionKind(
            lessonType as any,
            practiceMode,
            submissionKind,
            questionIds,
            submission,
            userId,
            lesson,
            lessonId,
        );

        // 6. For OBJECTIVE submissions: pre-validate answers against question set (BE-10)
        if (submissionKind === 'OBJECTIVE') {
            await this.validateObjectiveSubmission(
                submission as Extract<LessonSubmission, { kind: 'OBJECTIVE' }>,
                questionIds,
            );
        }

        // 7. Check for duplicate clientAttemptId (idempotency)
        const existingAttempt = await this.attemptRepo.findByClientAttemptId(
            userId,
            clientAttemptId,
        );

        if (existingAttempt) {
            // Return existing result — idempotent
            return this.buildSubmitResultFromAttempt(
                existingAttempt,
                enrollment,
                lessonId,
                courseId,
                unit,
                userId,
            );
        }

        // 8. Find or create progress record
        let progress = await this.progressRepo.findByUserAndLesson(userId, lessonId);

        if (!progress) {
            progress = await LearnerLessonProgress.create({
                userId: new mongoose.Types.ObjectId(userId),
                enrollmentId: new mongoose.Types.ObjectId(String(enrollment._id)),
                courseId: new mongoose.Types.ObjectId(courseId),
                unitId: new mongoose.Types.ObjectId(String(unit._id)),
                lessonId: new mongoose.Types.ObjectId(lessonId),
                status: ELessonProgressStatus.IN_PROGRESS as any,
                checkpointVersion: 0,
                checkpoint: null,
                timeSpentSeconds: 0,
                firstStartedAt: new Date(),
                lastAccessedAt: new Date(),
            } as any);
        }

        // 9. Grade the submission based on kind
        let gradingResult: GradingResult;

        switch (submission.kind) {
            case 'OBJECTIVE': {
                // Convert answers array to Record<questionId, answer> for the grader
                const responsesMap: Record<string, unknown> = {};
                for (const answer of submission.answers) {
                    responsesMap[answer.questionId] = answer.answer;
                }
                gradingResult = await gradeResponses(
                    questionIds,
                    responsesMap,
                    passingScore,
                );
                break;
            }

            case 'SPEAKING':
            case 'WRITING':
                // Subjective: auto-pass with placeholder feedback (AC-21)
                gradingResult = gradeSubjectivePass();
                break;

            case 'COMPLETION':
                // Non-assessed: auto-complete
                gradingResult = {
                    score: 100,
                    maxScore: 100,
                    passed: true,
                    summary: 'Bài học đã được hoàn thành.',
                    questions: [],
                };
                break;
        }

        // 10. Create immutable attempt record
        //     Handle concurrent duplicate clientAttemptId (E11000) as
        //     409 ATTEMPT_IN_PROGRESS per api-contract.md (BE-04)
        let attempt: ILearnerLessonAttempt;
        try {
            attempt = await this.attemptRepo.createAttempt({
                clientAttemptId,
                userId,
                enrollmentId: String(enrollment._id),
                lessonId,
                submissionKind: submission.kind,
                submittedAnswers: submission,
                score: gradingResult.score,
                passed: gradingResult.passed,
                feedback: {
                    summary: gradingResult.summary,
                    questions: gradingResult.questions,
                },
                durationSeconds: Math.min(durationSeconds, 86400), // Cap at 24 hours
            });
        } catch (err: unknown) {
            // MongoDB duplicate key error (E11000) — another request with same
            // clientAttemptId was processed concurrently
            if (
                err &&
                typeof err === 'object' &&
                'code' in err &&
                (err as Record<string, unknown>).code === 11000
            ) {
                logger.warn('submission.duplicate_attempt', {
                    userId,
                    lessonId,
                    clientAttemptId,
                });

                // Fetch the existing attempt created by the concurrent request
                const existing = await this.attemptRepo.findByClientAttemptId(userId, clientAttemptId);
                if (existing) {
                    return this.buildSubmitResultFromAttempt(
                        existing,
                        enrollment,
                        lessonId,
                        courseId,
                        unit,
                        userId,
                    );
                }

                throw new AppError(
                    'Yêu cầu đang được xử lý. Vui lòng thử lại với cùng mã.',
                    HttpStatus.CONFLICT,
                );
            }
            throw err; // Re-throw if not a duplicate key error
        }

        // 11. Capture pre-completion status for duplicate prevention
        const wasAlreadyCompleted = progress.status === ELessonProgressStatus.COMPLETED;

        // 12. Update progress
        if (gradingResult.passed) {
            await this.progressRepo.completeLesson(
                String(progress._id),
                userId,
                gradingResult.score,
                true,
            );
        } else {
            // Update latest score and increment attempts without completing
            await LearnerLessonProgress.findByIdAndUpdate(progress._id, {
                latestScore: gradingResult.score,
                $inc: { attemptsCount: 1 },
                lastAccessedAt: new Date(),
            }).exec();
        }

        // 13. If passed and was NOT already completed, update enrollment counters
        if (gradingResult.passed && !wasAlreadyCompleted) {
            await this.updateEnrollmentProgress(
                String(enrollment._id),
                courseId,
                lessonId,
                String(unit._id),
            );
        }

        // 14. Structured events
        if (gradingResult.passed) {
            logger.info('submission.passed', {
                userId,
                lessonId,
                attemptId: String(attempt._id),
                enrollmentId: String(enrollment._id),
                score: gradingResult.score,
                wasRetry: wasAlreadyCompleted,
                lessonType: lesson.type,
            });
        } else {
            logger.info('submission.failed', {
                userId,
                lessonId,
                attemptId: String(attempt._id),
                enrollmentId: String(enrollment._id),
                score: gradingResult.score,
                lessonType: lesson.type,
            });
        }

        // 15. Build result
        const lessonProgressAfter = await this.progressRepo.findByUserAndLesson(userId, lessonId);
        const unitStatus = await this.computeUnitStatus(
            String(unit._id),
            String(enrollment._id),
        );
        const updatedEnrollment = await this.enrollmentRepo.findByIdSecure(
            String(enrollment._id),
            userId,
        );
        const courseStatus = updatedEnrollment?.status ?? enrollment.status;
        const completedLessonCount = updatedEnrollment?.completedLessonCount ?? enrollment.completedLessonCount;
        const totalRequired = updatedEnrollment?.totalRequiredLessonCount ?? enrollment.totalRequiredLessonCount;

        return {
            attemptId: String(attempt._id),
            score: gradingResult.score,
            passed: gradingResult.passed,
            latestScore: gradingResult.score,
            bestScore: lessonProgressAfter?.bestScore ?? gradingResult.score,
            feedback: {
                summary: gradingResult.summary,
                questions: gradingResult.questions,
            },
            progress: {
                lessonStatus: lessonProgressAfter?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
                unitStatus,
                courseStatus,
                courseProgressPercent: totalRequired > 0
                    ? Math.round((completedLessonCount / totalRequired) * 100)
                    : 0,
            },
            nextLessonId: await this.findNextLesson(courseId, String(enrollment._id), userId),
        };
    }

    /**
     * Build a submit result from an existing attempt (idempotent return).
     *
     * Used when a duplicate clientAttemptId is detected — either from the
     * pre-creation check (BE-04) or from a concurrent E11000 duplicate key
     * error during attempt creation.
     */
    private async buildSubmitResultFromAttempt(
        existingAttempt: ILearnerLessonAttempt,
        enrollment: ICourseEnrollment,
        lessonId: string,
        courseId: string,
        unit: { _id: unknown },
        userId: string,
    ): Promise<{
        attemptId: string;
        score: number | null;
        passed: boolean;
        latestScore: number | null;
        bestScore: number | null;
        feedback: unknown;
        progress: {
            lessonStatus: 'IN_PROGRESS' | 'COMPLETED';
            unitStatus: string;
            courseStatus: string;
            courseProgressPercent: number;
        };
        nextLessonId: string | null;
    }> {
        const lessonProgress = await this.progressRepo.findByUserAndLesson(userId, lessonId);
        const unitStatus = await this.computeUnitStatus(
            String(unit._id),
            String(enrollment._id),
        );
        const courseStatus = enrollment.status as string;

        return {
            attemptId: String(existingAttempt._id),
            score: existingAttempt.score,
            passed: existingAttempt.passed,
            latestScore: existingAttempt.score,
            bestScore: lessonProgress?.bestScore ?? existingAttempt.score,
            feedback: existingAttempt.feedback,
            progress: {
                lessonStatus: lessonProgress?.status === 'COMPLETED' ? 'COMPLETED' : 'IN_PROGRESS',
                unitStatus,
                courseStatus,
                courseProgressPercent: enrollment.totalRequiredLessonCount > 0
                    ? Math.round((enrollment.completedLessonCount / enrollment.totalRequiredLessonCount) * 100)
                    : 0,
            },
            nextLessonId: await this.findNextLesson(courseId, String(enrollment._id), userId),
        };
    }

    /**
     * Get a specific attempt by ID.
     *
     * Returns the attempt result with full feedback for review.
     * Verifies the attempt belongs to the authenticated learner.
     *
     * Implements AC-17 (Review Completed Lesson), AC-28 (Post-Submit Feedback).
     */
    async getAttempt(
        userId: string,
        attemptId: string,
    ): Promise<{
        attemptId: string;
        lessonId: string;
        score: number | null;
        passed: boolean;
        submissionKind: string;
        feedback: unknown;
        submittedAt: Date;
    }> {
        const attempt = await this.attemptRepo.findByIdSecure(attemptId, userId);

        if (!attempt) {
            throw new AppError(
                'Bài nộp không tồn tại.',
                HttpStatus.NOT_FOUND,
            );
        }

        logger.info('attempt.retrieved', {
            userId,
            attemptId,
            lessonId: String(attempt.lessonId),
            submissionKind: attempt.submissionKind,
        });

        return {
            attemptId: String(attempt._id),
            lessonId: String(attempt.lessonId),
            score: attempt.score,
            passed: attempt.passed,
            submissionKind: attempt.submissionKind,
            feedback: attempt.feedback,
            submittedAt: attempt.submittedAt,
        };
    }

    /**
     * Pre-validate an OBJECTIVE submission against the lesson's question set.
     *
     * Checks:
     * - Every submitted questionId exists in the lesson's questionIds
     * - Every submitted questionVersion matches the current published version
     * - Every submitted type matches the question type
     * - Exactly one answer per question (no missing, no duplicates, no extras)
     *
     * Throws 400 INCOMPLETE_ATTEMPT or 409 QUESTION_SET_CHANGED.
     *
     * Implements FR-19, AC-25, AC-26, AC-27.
     */
    private async validateObjectiveSubmission(
        submission: Extract<LessonSubmission, { kind: 'OBJECTIVE' }>,
        lessonQuestionIds: string[],
    ): Promise<void> {
        if (lessonQuestionIds.length === 0) {
            throw new AppError(
                'Bài học này không có câu hỏi để nộp.',
                HttpStatus.BAD_REQUEST,
            );
        }

        // Load current question metadata
        const questionMap = await loadLessonQuestionMap(
            lessonQuestionIds.map((id) => new mongoose.Types.ObjectId(id)),
        );

        // Check for extra/unknown questions
        const submittedIds = new Set<string>();
        for (const answer of submission.answers) {
            if (submittedIds.has(answer.questionId)) {
                throw new AppError(
                    `Câu hỏi ${answer.questionId} đã được trả lời hai lần.`,
                    HttpStatus.BAD_REQUEST,
                );
            }
            submittedIds.add(answer.questionId);

            const questionInfo = questionMap.get(answer.questionId);
            if (!questionInfo) {
                throw new AppError(
                    `Câu hỏi không hợp lệ hoặc không thuộc bài học này.`,
                    HttpStatus.BAD_REQUEST,
                );
            }

            if (questionInfo.version !== answer.questionVersion) {
                throw new AppError(
                    `Phiên bản câu hỏi đã thay đổi. Vui lòng tải lại bài học.`,
                    HttpStatus.CONFLICT,
                );
            }

            if (questionInfo.type !== answer.type) {
                throw new AppError(
                    `Loại câu hỏi không khớp.`,
                    HttpStatus.BAD_REQUEST,
                );
            }
        }

        // Check for missing questions
        const expectedQuestionIds = new Set(lessonQuestionIds);
        for (const submittedId of submittedIds) {
            expectedQuestionIds.delete(submittedId);
        }

        if (expectedQuestionIds.size > 0) {
            const missingIds = Array.from(expectedQuestionIds).join(', ');
            throw new AppError(
                `Bạn cần trả lời tất cả các câu hỏi. Còn ${expectedQuestionIds.size} câu hỏi chưa được trả lời.`,
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    /**
     * Validate that the submission kind matches the lesson exercise kind
     * and perform type-specific validation (Speaking session ownership,
     * Writing word count, COMPLETION eligibility).
     *
     * Throws AppError on mismatch.
     *
     * Implements NFR-11, AC-21, AC-29, AC-30, AC-31, BE-11.
     */
    private async validateSubmissionKind(
        lessonType: string,
        practiceMode: string | undefined,
        submissionKind: string,
        questionIds: string[],
        submission: LessonSubmission,
        userId: string,
        lesson: {
            type: string;
            content: Record<string, unknown>;
            practiceConfig: { mode: string; questionIds: mongoose.Types.ObjectId[]; passingScore: number };
        },
        lessonId: string,
    ): Promise<void> {
        const isDynamic = practiceMode === EPracticeMode.DYNAMIC;

        // Dynamic mode is never acceptable
        if (isDynamic) {
            throw new AppError(
                'Bài học sử dụng bài tập động chưa được hỗ trợ.',
                HttpStatus.UNPROCESSABLE_ENTITY,
            );
        }

        // Load valid published question count for consistent validation
        // with getLearnerLesson/buildLearnerExercise.
        // Raw questionIds.length can include unpublished/deleted questions,
        // causing mismatch between exercise kind shown to learner and
        // submission kind validation. (Fixes the 400 error)
        const questionMap = await loadLessonQuestionMap(
            resolveEffectivePracticeConfig({
                practiceConfig: lesson.practiceConfig,
                content: lesson.content,
            }).questionIds,
        );
        const validPublishedCount = questionMap.size;

        switch (lessonType) {
            case 'VOCAB':
            case 'GRAMMAR':
            case 'READING':
            case 'LISTENING': {
                // These can be OBJECTIVE (if has published questions) or COMPLETION (if no questions)
                const hasValidQuestions = validPublishedCount > 0;
                if (hasValidQuestions && submissionKind !== 'OBJECTIVE') {
                    throw new AppError(
                        'Loại bài nộp không phù hợp. Bài học này yêu cầu nộp câu trả lời.',
                        HttpStatus.BAD_REQUEST,
                    );
                }
                if (!hasValidQuestions && submissionKind !== 'COMPLETION') {
                    throw new AppError(
                        'Loại bài nộp không phù hợp. Bài học này không có câu hỏi.',
                        HttpStatus.BAD_REQUEST,
                    );
                }
                break;
            }

            case 'SPEAKING': {
                if (submissionKind !== 'SPEAKING') {
                    throw new AppError(
                        'Loại bài nộp không phù hợp. Bài học này yêu cầu nộp bài nói.',
                        HttpStatus.BAD_REQUEST,
                    );
                }
                // BE-11: Validate sessionId belongs to authenticated learner + current lesson
                if (submission.kind === 'SPEAKING') {
                    const sessionId = submission.sessionId;
                    if (!sessionId) {
                        throw new AppError(
                            'Session ID không hợp lệ.',
                            HttpStatus.BAD_REQUEST,
                        );
                    }
                    // Verify the speaking session exists and belongs to this user/lesson
                    // by querying UserLessonProgress (the existing speaking-specific progress)
                    const { UserLessonProgress } = await import('../models/mongo/user-lesson-progress.model.js');
                    const speakingSession = await UserLessonProgress.findOne({
                        _id: new mongoose.Types.ObjectId(sessionId),
                        userId: new mongoose.Types.ObjectId(userId),
                        lessonId: new mongoose.Types.ObjectId(lessonId),
                    }).lean().exec();

                    if (!speakingSession) {
                        throw new AppError(
                            'Phiên nói không hợp lệ hoặc không thuộc về bạn.',
                            HttpStatus.FORBIDDEN,
                        );
                    }
                }
                break;
            }

            case 'WRITING': {
                if (submissionKind !== 'WRITING') {
                    throw new AppError(
                        'Loại bài nộp không phù hợp. Bài học này yêu cầu nộp bài viết.',
                        HttpStatus.BAD_REQUEST,
                    );
                }
                // BE-11: Validate word count from lesson content config
                if (submission.kind === 'WRITING') {
                    const text = submission.text.trim();
                    if (text.length === 0) {
                        throw new AppError(
                            'Nội dung bài viết không được để trống.',
                            HttpStatus.BAD_REQUEST,
                        );
                    }
                    // Get authored word count boundaries from lesson content
                    const config = lesson.content?.['config'] as
                        | { minWords?: number; maxWords?: number }
                        | undefined;
                    const minWords = config?.minWords ?? 0;
                    const maxWords = config?.maxWords ?? Number.MAX_SAFE_INTEGER;

                    // Count words (split by whitespace)
                    const wordCount = text.split(/\s+/).filter(Boolean).length;

                    if (wordCount < minWords) {
                        throw new AppError(
                            `Bài viết cần ít nhất ${minWords} từ. Bạn đã viết ${wordCount} từ.`,
                            HttpStatus.BAD_REQUEST,
                        );
                    }
                    if (wordCount > maxWords) {
                        throw new AppError(
                            `Bài viết không được vượt quá ${maxWords} từ. Bạn đã viết ${wordCount} từ.`,
                            HttpStatus.BAD_REQUEST,
                        );
                    }
                }
                break;
            }

            case 'UNIT_TEST': {
                if (submissionKind !== 'OBJECTIVE') {
                    throw new AppError(
                        'Bài kiểm tra yêu cầu nộp câu trả lời.',
                        HttpStatus.BAD_REQUEST,
                    );
                }
                if (validPublishedCount === 0) {
                    throw new AppError(
                        'Bài kiểm tra hiện không có câu hỏi hợp lệ.',
                        HttpStatus.UNPROCESSABLE_ENTITY,
                    );
                }
                break;
            }

            default:
                throw new AppError(
                    'Loại bài học không được hỗ trợ.',
                    HttpStatus.UNPROCESSABLE_ENTITY,
                );
        }
    }

    /**
     * Update enrollment progress after a lesson is passed/completed.
     *
     * - Atomically increments completedLessonCount.
     * - Updates lastLessonId.
     * - Triggers course completion if all required lessons are done.
     *
     * IMPORTANT: Caller must ensure this method is not called for already-completed
     * lessons to prevent counter drift (AC-17, NFR-02).
     *
     * Implements FR-09, FR-10, AC-16, AC-17.
     */
    private async updateEnrollmentProgress(
        enrollmentId: string,
        courseId: string,
        lessonId: string,
        _unitId: string,
    ): Promise<void> {
        // Atomically increment completed count (race-safe: $inc is atomic per document)
        const updated = await CourseEnrollment.findByIdAndUpdate(
            enrollmentId,
            {
                $inc: { completedLessonCount: 1 },
                $set: { lastLessonId: new mongoose.Types.ObjectId(lessonId) },
            },
            { new: true },
        ).lean().exec() as { completedLessonCount: number; totalRequiredLessonCount: number } | null;

        if (!updated) return;

        // Check if course is now complete
        if (
            updated.completedLessonCount >= updated.totalRequiredLessonCount &&
            updated.totalRequiredLessonCount > 0
        ) {
            await CourseEnrollment.findByIdAndUpdate(enrollmentId, {
                status: EEnrollmentStatus.COMPLETED,
                completedAt: new Date(),
            }).exec();

            logger.info('Course completed', {
                enrollmentId,
                courseId,
                completedLessonCount: updated.completedLessonCount,
            });
        }
    }

    /**
     * Recalculate totalRequiredLessonCount for a specific enrollment.
     *
     * Should be called after curriculum changes (admin adds/removes lessons).
     * Returns the updated enrollment or null if not found.
     */
    async recalculateRequiredLessons(
        enrollmentId: string,
        userId: string,
    ): Promise<{ enrollmentId: string; totalRequiredLessonCount: number } | null> {
        // Verify enrollment ownership
        const enrollment = await this.enrollmentRepo.findByIdSecure(enrollmentId, userId);
        if (!enrollment) return null;

        const courseId = String(enrollment.courseId);
        const totalRequired = await this.countRequiredLessons(courseId);

        await CourseEnrollment.findByIdAndUpdate(enrollmentId, {
            totalRequiredLessonCount: totalRequired,
        }).exec();

        logger.info('Recalculated required lessons', {
            enrollmentId,
            courseId,
            previous: enrollment.totalRequiredLessonCount,
            new: totalRequired,
        });

        return {
            enrollmentId,
            totalRequiredLessonCount: totalRequired,
        };
    }

    /**
     * Recalculate completedLessonCount from COMPLETED LearnerLessonProgress records.
     *
     * Useful for correcting counter drift or after enrollment migration.
     * Returns the updated count.
     */
    async recalculateCompletedLessonCount(
        enrollmentId: string,
        userId: string,
    ): Promise<{ enrollmentId: string; completedLessonCount: number } | null> {
        // Verify enrollment ownership
        const enrollment = await this.enrollmentRepo.findByIdSecure(enrollmentId, userId);
        if (!enrollment) return null;

        // Count COMPLETED progress records for this enrollment
        const completedRecords = await LearnerLessonProgress.countDocuments({
            enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
            status: ELessonProgressStatus.COMPLETED,
        }).exec();

        await CourseEnrollment.findByIdAndUpdate(enrollmentId, {
            completedLessonCount: completedRecords,
        }).exec();

        // Check if course is now complete after repair
        if (
            completedRecords >= enrollment.totalRequiredLessonCount &&
            enrollment.totalRequiredLessonCount > 0
        ) {
            await CourseEnrollment.findByIdAndUpdate(enrollmentId, {
                status: EEnrollmentStatus.COMPLETED,
                completedAt: new Date(),
            }).exec();
        }

        logger.info('Recalculated completed lesson count', {
            enrollmentId,
            previous: enrollment.completedLessonCount,
            new: completedRecords,
        });

        return {
            enrollmentId,
            completedLessonCount: completedRecords,
        };
    }

    /**
     * Compute the status of a unit based on its lessons' progress.
     */
    private async computeUnitStatus(
        unitId: string,
        enrollmentId: string,
    ): Promise<'UNAVAILABLE' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED'> {
        const progressRecords = await LearnerLessonProgress.find({
            enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
        })
            .select('lessonId status')
            .lean()
            .exec() as Array<{ lessonId: unknown; status: string }>;

        // Get all lessons in this unit
        const lessons = await Lesson.find({ unitId: new mongoose.Types.ObjectId(unitId) })
            .select('_id')
            .lean()
            .exec() as Array<{ _id: unknown }>;

        if (lessons.length === 0) return 'AVAILABLE';

        const lessonIds = new Set(lessons.map((l) => String(l._id)));
        const unitProgress = progressRecords.filter((p) =>
            lessonIds.has(String(p.lessonId)),
        );

        if (unitProgress.length === 0) return 'AVAILABLE';
        if (unitProgress.every((p) => p.status === 'COMPLETED')) return 'COMPLETED';
        if (unitProgress.some((p) => p.status === 'IN_PROGRESS')) return 'IN_PROGRESS';
        return 'AVAILABLE';
    }

    /**
     * Find the next recommended lesson for the user within a course.
     *
     * Returns the first non-completed lesson ordered by (unit.orderIndex, lesson.orderIndex),
     * or null if all lessons are completed.
     */
    private async findNextLesson(
        courseId: string,
        enrollmentId: string,
        userId: string,
    ): Promise<string | null> {
        // Get all unit IDs for this course
        const units = await Unit.find({ courseId: new mongoose.Types.ObjectId(courseId) })
            .select('_id')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{ _id: unknown }>;

        if (units.length === 0) return null;

        const unitIds = units.map((u) => new mongoose.Types.ObjectId(String(u._id)));

        // Get all lessons ordered by (unitIndex, lessonIndex)
        const lessons = await Lesson.find({ unitId: { $in: unitIds } })
            .select('_id unitId')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{ _id: unknown; unitId: unknown }>;

        if (lessons.length === 0) return null;

        // Get completed lesson IDs
        const completedProgress = await LearnerLessonProgress.find({
            enrollmentId: new mongoose.Types.ObjectId(enrollmentId),
            status: ELessonProgressStatus.COMPLETED,
        })
            .select('lessonId')
            .lean()
            .exec() as Array<{ lessonId: unknown }>;

        const completedIds = new Set(
            completedProgress.map((p) => String(p.lessonId)),
        );

        // Find first non-completed lesson
        for (const lesson of lessons) {
            if (!completedIds.has(String(lesson._id))) {
                return String(lesson._id);
            }
        }

        return null; // All lessons completed
    }

    /**
     * Get previous and next lesson IDs for navigation context.
     */
    private async getNavigation(
        courseId: string,
        enrollmentId: string,
        userId: string,
        currentLessonId: string,
    ): Promise<{ previousLessonId: string | null; nextLessonId: string | null }> {
        // Get all unit IDs for this course
        const units = await Unit.find({ courseId: new mongoose.Types.ObjectId(courseId) })
            .select('_id')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{ _id: unknown }>;

        if (units.length === 0) {
            return { previousLessonId: null, nextLessonId: null };
        }

        const unitIds = units.map((u) => new mongoose.Types.ObjectId(String(u._id)));

        // Get all lessons ordered by (unitIndex, lessonIndex)
        const allLessons = await Lesson.find({ unitId: { $in: unitIds } })
            .select('_id')
            .sort({ orderIndex: 1 })
            .lean()
            .exec() as Array<{ _id: unknown }>;

        const lessonIds = allLessons.map((l) => String(l._id));
        const currentIndex = lessonIds.indexOf(currentLessonId);

        if (currentIndex === -1) {
            return { previousLessonId: null, nextLessonId: null };
        }

        return {
            previousLessonId: currentIndex > 0 ? lessonIds[currentIndex - 1] ?? null : null,
            nextLessonId: currentIndex < lessonIds.length - 1 ? lessonIds[currentIndex + 1] ?? null : null,
        };
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const learningService = new LearningService(
    new CourseEnrollmentMongoRepository(),
    new LearnerLessonProgressMongoRepository(),
    new LearnerLessonAttemptMongoRepository(),
);
