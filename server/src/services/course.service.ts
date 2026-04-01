import { HttpStatus } from '../constants/http-status.js';
import type { ICourse } from '../models/mongo/course.model.js';
import { CourseMongoRepository } from '../repositories/mongo/course.mongo.repository.js';
import { CourseSeriesMongoRepository } from '../repositories/mongo/course-series.mongo.repository.js';
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
        private readonly seriesRepo: CourseSeriesMongoRepository,
    ) {}

    // ─── Read ──────────────────────────────────────────────────────────────

    async getCoursesBySeriesId(query: GetCoursesListQuery): Promise<ICourse[]> {
        return this.courseRepo.findBySeriesId({
            seriesId: query.seriesId,
            ...(typeof query.isActive === 'boolean' && { isActive: query.isActive }),
        });
    }

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

    // ─── Write ─────────────────────────────────────────────────────────────

    async createCourse(body: CreateCourseBody): Promise<ICourse> {
        // Validate parent series exists
        const seriesExists = await this.seriesRepo.findById(body.seriesId);
        if (!seriesExists) {
            throw new AppError('Course Series không tồn tại', HttpStatus.NOT_FOUND);
        }

        const duplicatedLevel = await this.courseRepo.existsBySeriesAndLevel(body.seriesId, body.level);
        if (duplicatedLevel) {
            throw new AppError(
                `Series đã có course cho level ${body.level}. Vui lòng chọn level khác.`,
                HttpStatus.BAD_REQUEST,
            );
        }

        const created = await this.courseRepo.createCourse(body as unknown as Partial<ICourse>);

        // Keep series totalCourses in sync
        await this.seriesRepo.update(body.seriesId, { $inc: { totalCourses: 1 } } as never);

        logger.info('Course created', { courseId: String(created._id), seriesId: body.seriesId });
        return created;
    }

    async updateCourse(courseId: string, body: UpdateCourseBody): Promise<ICourse> {
        const updated = await this.courseRepo.updateById(
            courseId,
            body as unknown as Partial<ICourse>,
        );
        if (!updated) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }
        return updated;
    }

    async toggleCourseStatus(courseId: string): Promise<ICourse> {
        const current = await this.courseRepo.findByIdFull(courseId);
        if (!current) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }
        const updated = await this.courseRepo.updateById(courseId, {
            isActive: !current.isActive,
        } as Partial<ICourse>);
        return updated!;
    }

    async deleteCourse(courseId: string): Promise<void> {
        const course = await this.courseRepo.findByIdFull(courseId);
        if (!course) {
            throw new AppError('Course không tồn tại', HttpStatus.NOT_FOUND);
        }

        if (course.totalUnits > 0) {
            throw new AppError(
                `Không thể xóa course "${course.name}" vì còn ${course.totalUnits} unit bên trong. Hãy xóa các unit trước.`,
                HttpStatus.BAD_REQUEST,
            );
        }

        await this.courseRepo.deleteById(courseId);

        // Keep series totalCourses in sync
        await this.seriesRepo.update(String(course.seriesId), {
            $inc: { totalCourses: -1 },
        } as never);

        logger.info('Course deleted', { courseId, seriesId: String(course.seriesId) });
    }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const courseService = new CourseService(
    new CourseMongoRepository(),
    new CourseSeriesMongoRepository(),
);
