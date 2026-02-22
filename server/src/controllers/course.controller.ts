import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { courseService } from '../services/course.service.js';
import type { CreateCourseBody, GetCoursesListQuery, UpdateCourseBody } from '../validations/course.validation.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';

export class CourseController {
    static getCoursesBySeriesId = catchAsync(async (req: Request, res: Response) => {
        const courses = await courseService.getCoursesBySeriesId(
            req.query as unknown as GetCoursesListQuery,
        );
        sendResponse(res, HttpStatus.OK, 'Get courses successfully', courses);
    });

    static getCourseById = catchAsync(async (req: Request, res: Response) => {
        const course = await courseService.getCourseById(req.params['courseId']!);
        sendResponse(res, HttpStatus.OK, 'Get course successfully', course);
    });

    static getCourseTree = catchAsync(async (req: Request, res: Response) => {
        const tree = await courseService.getCourseTree(req.params['courseId']!);
        sendResponse(res, HttpStatus.OK, 'Get course tree successfully', tree);
    });

    static createCourse = catchAsync(async (req: Request, res: Response) => {
        const created = await courseService.createCourse(req.body as CreateCourseBody);
        sendResponse(res, HttpStatus.CREATED, 'Course created successfully', created);
    });

    static updateCourse = catchAsync(async (req: Request, res: Response) => {
        const updated = await courseService.updateCourse(
            req.params['courseId']!,
            req.body as UpdateCourseBody,
        );
        sendResponse(res, HttpStatus.OK, 'Course updated successfully', updated);
    });

    static toggleCourseStatus = catchAsync(async (req: Request, res: Response) => {
        const updated = await courseService.toggleCourseStatus(req.params['courseId']!);
        sendResponse(res, HttpStatus.OK, 'Course status toggled successfully', updated);
    });

    static deleteCourse = catchAsync(async (req: Request, res: Response) => {
        await courseService.deleteCourse(req.params['courseId']!);
        sendResponse(res, HttpStatus.NO_CONTENT, 'Course deleted successfully', null);
    });
}
