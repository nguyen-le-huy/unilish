import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { courseService } from '../services/course.service.js';
import type { CreateCourseBody, GetCoursesListQuery, UpdateCourseBody } from '../validations/course.validation.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';

export class CourseController {
    // ─── List (paginated + filterable) ──────────────────────────────────────
    static getCoursesList = catchAsync(async (req: Request, res: Response) => {
        const result = await courseService.getCoursesList(
            req.query as unknown as GetCoursesListQuery,
        );
        sendResponse(res, HttpStatus.OK, 'Lấy danh sách khóa học thành công', result.courses, result.pagination);
    });

    // ─── Get by ID ──────────────────────────────────────────────────────────
    static getCourseById = catchAsync(async (req: Request, res: Response) => {
        const course = await courseService.getCourseById(req.params['courseId']!);
        sendResponse(res, HttpStatus.OK, 'Lấy thông tin khóa học thành công', course);
    });

    // ─── Get tree ───────────────────────────────────────────────────────────
    static getCourseTree = catchAsync(async (req: Request, res: Response) => {
        const tree = await courseService.getCourseTree(req.params['courseId']!);
        sendResponse(res, HttpStatus.OK, 'Lấy cây khóa học thành công', tree);
    });

    // ─── Create ─────────────────────────────────────────────────────────────
    static createCourse = catchAsync(async (req: Request, res: Response) => {
        const created = await courseService.createCourse(req.body as CreateCourseBody);
        sendResponse(res, HttpStatus.CREATED, 'Tạo khóa học thành công', created);
    });

    // ─── Update ─────────────────────────────────────────────────────────────
    static updateCourse = catchAsync(async (req: Request, res: Response) => {
        const updated = await courseService.updateCourse(
            req.params['courseId']!,
            req.body as UpdateCourseBody,
        );
        sendResponse(res, HttpStatus.OK, 'Cập nhật khóa học thành công', updated);
    });

    // ─── Toggle status ──────────────────────────────────────────────────────
    static toggleCourseStatus = catchAsync(async (req: Request, res: Response) => {
        const updated = await courseService.toggleCourseStatus(req.params['courseId']!);
        sendResponse(res, HttpStatus.OK, 'Đã chuyển đổi trạng thái khóa học', updated);
    });

    // ─── Delete ─────────────────────────────────────────────────────────────
    static deleteCourse = catchAsync(async (req: Request, res: Response) => {
        await courseService.deleteCourse(req.params['courseId']!);
        sendResponse(res, HttpStatus.NO_CONTENT, 'Đã xóa khóa học', null);
    });
}
