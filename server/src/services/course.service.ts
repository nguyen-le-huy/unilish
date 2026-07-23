import { HttpStatus } from '../constants/http-status.js';
import type { ICourse } from '../models/mongo/course.model.js';
import { CourseMongoRepository } from '../repositories/mongo/course.mongo.repository.js';
import { LanguageMongoRepository } from '../repositories/mongo/language.mongo.repository.js';
import { LearningGoalMongoRepository } from '../repositories/mongo/learning-goal.mongo.repository.js';
import { AppError } from '../utils/app-error.js';
import { logger } from '../utils/logger.js';
import type {
    CreateCourseBody,
    GetCoursesListQuery,
    UpdateCourseBody,
} from '../validations/course.validation.js';

// ─── Service ──────────────────────────────────────────────────────────────────

export class CourseService {
    constructor(
        private readonly courseRepo: CourseMongoRepository,
        private readonly languageRepo: LanguageMongoRepository,
        private readonly learningGoalRepo: LearningGoalMongoRepository,
    ) { }

    // ─── Read list (paginated) ───────────────────────────────────────────────

    async getCoursesList(query: GetCoursesListQuery): Promise<{
        courses: ICourse[];
        pagination: { page: number; limit: number; total: number; pages: number };
    }> {
        return this.courseRepo.findAllWithPagination(
            {
                languageId: query.languageId,
                learningGoalId: query.learningGoalId,
                level: query.level,
                isActive: query.isActive,
                search: query.search,
            },
            {
                page: query.page,
                limit: query.limit,
                sort: query.sort,
                order: query.order,
            },
        );
    }

    // ─── Read single ─────────────────────────────────────────────────────────

    async getCourseById(courseId: string): Promise<ICourse> {
        const course = await this.courseRepo.findByIdFull(courseId);
        if (!course) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }
        return course;
    }

    /**
     * Returns the full course tree (course → units → lessons) in a single aggregate.
     * Used by the Studio 3-panel UI to avoid N+1 waterfall queries.
     */
    async getCourseTree(courseId: string): Promise<ICourse> {
        const tree = await this.courseRepo.getCourseTree(courseId);
        if (!tree) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }
        return tree;
    }

    // ─── Create ──────────────────────────────────────────────────────────────

    async createCourse(body: CreateCourseBody): Promise<ICourse> {
        // 1. Validate Language exists
        const language = await this.languageRepo.findById(body.languageId);
        if (!language) {
            throw new AppError('Ngôn ngữ không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 2. Validate Learning Goal exists
        const goal = await this.learningGoalRepo.findById(body.learningGoalId);
        if (!goal) {
            throw new AppError('Mục tiêu học tập không tồn tại', HttpStatus.NOT_FOUND);
        }

        // 3. Check slug uniqueness → 409
        const slugDuplicate = await this.courseRepo.slugExists(body.slug);
        if (slugDuplicate) {
            throw new AppError(
                `Slug "${body.slug}" đã tồn tại. Vui lòng chọn slug khác.`,
                HttpStatus.CONFLICT,
            );
        }

        // Keep an internal order for stable display without exposing it in the admin form.
        const orderIndex = await this.courseRepo.getNextOrderIndex(
            body.languageId,
            body.learningGoalId,
            body.level,
        );

        const created = await this.courseRepo.createCourse({ ...body, orderIndex });

        logger.info('Course created', {
            courseId: String(created._id),
            languageId: body.languageId,
            learningGoalId: body.learningGoalId,
            slug: body.slug,
        });
        return created;
    }

    // ─── Update ──────────────────────────────────────────────────────────────

    async updateCourse(courseId: string, body: UpdateCourseBody): Promise<ICourse> {
        const existing = await this.courseRepo.findByIdFull(courseId);
        if (!existing) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }

        // If languageId or learningGoalId changes, validate existence
        if (body.languageId) {
            const language = await this.languageRepo.findById(body.languageId);
            if (!language) {
                throw new AppError('Ngôn ngữ không tồn tại', HttpStatus.NOT_FOUND);
            }
        }

        if (body.learningGoalId) {
            const goal = await this.learningGoalRepo.findById(body.learningGoalId);
            if (!goal) {
                throw new AppError('Mục tiêu học tập không tồn tại', HttpStatus.NOT_FOUND);
            }
        }

        // Slug uniqueness check → 409 (exclude self)
        if (body.slug && body.slug !== existing.slug) {
            const slugDuplicate = await this.courseRepo.slugExists(body.slug, courseId);
            if (slugDuplicate) {
                throw new AppError(
                    `Slug "${body.slug}" đã tồn tại. Vui lòng chọn slug khác.`,
                    HttpStatus.CONFLICT,
                );
            }
        }

        const updateData: Record<string, unknown> = { ...body };
        const groupingChanged = (body.languageId !== undefined && body.languageId !== String(existing.languageId))
            || (body.learningGoalId !== undefined && body.learningGoalId !== String(existing.learningGoalId))
            || (body.level !== undefined && body.level !== existing.level);
        if (groupingChanged) {
            updateData.orderIndex = await this.courseRepo.getNextOrderIndex(
                body.languageId ?? String(existing.languageId),
                body.learningGoalId ?? String(existing.learningGoalId),
                body.level ?? existing.level,
            );
        }

        const updated = await this.courseRepo.updateCourse(courseId, updateData);
        if (!updated) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }

        logger.info('Course updated', { courseId });
        return updated;
    }

    // ─── Toggle status ───────────────────────────────────────────────────────

    async toggleCourseStatus(courseId: string): Promise<ICourse> {
        const current = await this.courseRepo.findByIdFull(courseId);
        if (!current) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }
        const updated = await this.courseRepo.updateCourse(courseId, {
            isActive: !current.isActive,
        });
        return updated!;
    }

    // ─── Delete ──────────────────────────────────────────────────────────────

    async deleteCourse(courseId: string): Promise<void> {
        const course = await this.courseRepo.findByIdFull(courseId);
        if (!course) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }

        // Preserve delete guard: reject when Units exist
        if (course.totalUnits > 0) {
            throw new AppError(
                `Không thể xóa course "${course.name}" vì còn ${course.totalUnits} unit bên trong. Hãy xóa các unit trước.`,
                HttpStatus.BAD_REQUEST,
            );
        }

        await this.courseRepo.deleteById(courseId);

        logger.info('Course deleted', { courseId });
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const courseService = new CourseService(
    new CourseMongoRepository(),
    new LanguageMongoRepository(),
    new LearningGoalMongoRepository(),
);
