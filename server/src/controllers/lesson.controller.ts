import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { lessonService } from '../services/lesson.service.js';
import type { CreateLessonBody, ReorderLessonsBody, UpdateLessonBody } from '../validations/lesson.validation.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';

export class LessonController {
    static getLessonsByUnitId = catchAsync(async (req: Request, res: Response) => {
        const lessons = await lessonService.getLessonsByUnitId(req.query.unitId as string);
        sendResponse(res, HttpStatus.OK, 'Get lessons successfully', lessons);
    });

    static getLessonById = catchAsync(async (req: Request, res: Response) => {
        const lesson = await lessonService.getLessonById(req.params['lessonId']!);
        sendResponse(res, HttpStatus.OK, 'Get lesson successfully', lesson);
    });

    static createLesson = catchAsync(async (req: Request, res: Response) => {
        const created = await lessonService.createLesson(req.body as CreateLessonBody);
        sendResponse(res, HttpStatus.CREATED, 'Lesson created successfully', created);
    });

    static updateLesson = catchAsync(async (req: Request, res: Response) => {
        const updated = await lessonService.updateLesson(
            req.params['lessonId']!,
            req.body as UpdateLessonBody,
        );
        sendResponse(res, HttpStatus.OK, 'Lesson updated successfully', updated);
    });

    static deleteLesson = catchAsync(async (req: Request, res: Response) => {
        await lessonService.deleteLesson(req.params['lessonId']!);
        sendResponse(res, HttpStatus.NO_CONTENT, 'Lesson deleted successfully', null);
    });

    static reorderLessons = catchAsync(async (req: Request, res: Response) => {
        await lessonService.reorderLessons(req.body as ReorderLessonsBody);
        sendResponse(res, HttpStatus.OK, 'Lessons reordered successfully', null);
    });
}
