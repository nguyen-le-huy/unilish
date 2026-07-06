import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { learningService } from '../services/learning.service.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';

export class LearningController {
    // ─── Enroll ─────────────────────────────────────────────────────────────
    static enroll = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const courseId = req.params['courseId']!;

        const { created, ...result } = await learningService.enroll(userId, courseId);

        const statusCode = created ? HttpStatus.CREATED : HttpStatus.OK;
        const message = created
            ? 'Ghi danh khóa học thành công'
            : 'Khóa học đã được ghi danh trước đó';

        sendResponse(res, statusCode, message, result);
    });

    // ─── List enrollments ───────────────────────────────────────────────────
    static listEnrollments = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const status = req.query['status'] as string | undefined;

        const enrollments = await learningService.listEnrollments(userId, status);
        sendResponse(res, HttpStatus.OK, 'Lấy danh sách ghi danh thành công', enrollments);
    });

    // ─── Dashboard ─────────────────────────────────────────────────────────
    static dashboard = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const period = req.query['period'] as string | undefined;
        const month = req.query['month'] as string | undefined;

        const result = await learningService.getDashboard(userId, period, month);
        sendResponse(res, HttpStatus.OK, 'Thông tin học tập', result);
    });

    // ─── Roadmap ───────────────────────────────────────────────────────────
    static roadmap = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const slug = req.params['slug']!;

        const result = await learningService.getRoadmap(userId, slug);
        sendResponse(res, HttpStatus.OK, 'Lộ trình khóa học', result);
    });

    // ─── Start Lesson ──────────────────────────────────────────────────────
    static startLesson = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const lessonId = req.params['lessonId']!;

        const result = await learningService.startLesson(userId, lessonId);
        sendResponse(res, HttpStatus.OK, 'Bắt đầu bài học', result);
    });

    // ─── Restart Lesson ────────────────────────────────────────────────────
    static restartLesson = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const lessonId = req.params['lessonId']!;

        const result = await learningService.restartLesson(userId, lessonId);
        sendResponse(res, HttpStatus.OK, 'Bắt đầu làm lại bài học', result);
    });

    // ─── Mark Lesson Complete ──────────────────────────────────────────────
    static completeLesson = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const lessonId = req.params['lessonId']!;

        const result = await learningService.completeLesson(userId, lessonId);
        sendResponse(res, HttpStatus.OK, 'Đã hoàn thành bài học', result);
    });

    // ─── Read Lesson ───────────────────────────────────────────────────────
    static getLearnerLesson = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const lessonId = req.params['lessonId']!;

        const result = await learningService.getLearnerLesson(userId, lessonId);
        sendResponse(res, HttpStatus.OK, 'Lấy thông tin bài học', result);
    });

    // ─── Save Checkpoint ───────────────────────────────────────────────────
    static saveCheckpoint = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const lessonId = req.params['lessonId']!;
        const { version, checkpoint, activeSecondsDelta, conflictStrategy } = req.body as {
            version: number;
            checkpoint: unknown;
            activeSecondsDelta: number;
            conflictStrategy: 'STRICT' | 'LAST_WRITE_WINS';
        };

        const result = await learningService.saveCheckpoint(
            userId,
            lessonId,
            version,
            checkpoint,
            activeSecondsDelta,
            conflictStrategy,
        );
        sendResponse(res, HttpStatus.OK, 'Lưu tiến trình thành công', result);
    });

    // ─── Submit Lesson ──────────────────────────────────────────────────────
    static submitLesson = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const lessonId = req.params['lessonId']!;
        const { clientAttemptId, submission, durationSeconds } = req.body as {
            clientAttemptId: string;
            submission: unknown;
            durationSeconds: number;
        };

        const result = await learningService.submitLesson(
            userId,
            lessonId,
            clientAttemptId,
            submission as any,
            durationSeconds,
        );
        sendResponse(res, HttpStatus.OK, 'Nộp bài thành công', result);
    });

    // ─── Get Attempt ─────────────────────────────────────────────────────────
    static getAttempt = catchAsync(async (req: Request, res: Response) => {
        const userId = (req as any).user._id as string;
        const attemptId = req.params['attemptId']!;

        const result = await learningService.getAttempt(userId, attemptId);
        sendResponse(res, HttpStatus.OK, 'Lấy thông tin bài nộp', result);
    });
}
