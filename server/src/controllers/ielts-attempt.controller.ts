import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { ieltsAttemptService } from '../services/ielts-attempt.service.js';
import type {
    StartAttemptBody,
    SaveDraftBody,
    SubmitAttemptBody,
} from '../validations/ielts-attempt.validation.js';

export class IeltsAttemptController {
    /**
     * POST /api/ielts-practice/tests/:testId/attempts
     * Start a new attempt.
     */
    static readonly startAttempt = catchAsync(async (req: Request, res: Response) => {
        const { testId } = req.params as { testId: string };
        const userId = String(req.user?._id);
        const idempotencyKey = req.headers['idempotency-key'] as string;

        if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
            return sendResponse(res, HttpStatus.BAD_REQUEST, 'Idempotency-Key header là bắt buộc (8–128 ký tự)', null);
        }

        const result = await ieltsAttemptService.startAttempt(
            testId,
            userId,
            idempotencyKey,
            req.body as StartAttemptBody,
        );

        const statusCode = result.resumed ? HttpStatus.OK : HttpStatus.CREATED;
        sendResponse(
            res,
            statusCode,
            result.resumed ? 'Lấy lượt làm bài thành công' : 'Bắt đầu lượt luyện IELTS thành công',
            result,
        );
    });

    /**
     * GET /api/ielts-practice/attempts/:attemptId
     * Get attempt detail (for resume/reload).
     */
    static readonly getAttempt = catchAsync(async (req: Request, res: Response) => {
        const { attemptId } = req.params as { attemptId: string };
        const userId = String(req.user?._id);
        const result = await ieltsAttemptService.getAttempt(attemptId, userId);
        sendResponse(res, HttpStatus.OK, 'Lấy thông tin lượt làm bài thành công', result);
    });

    /**
     * PATCH /api/ielts-practice/attempts/:attemptId/draft
     * Autosave draft with revision control.
     */
    static readonly saveDraft = catchAsync(async (req: Request, res: Response) => {
        const { attemptId } = req.params as { attemptId: string };
        const userId = String(req.user?._id);
        const result = await ieltsAttemptService.saveDraft(
            attemptId,
            userId,
            req.body as SaveDraftBody,
        );
        sendResponse(res, HttpStatus.OK, 'Đã lưu bản nháp', result);
    });

    /**
     * POST /api/ielts-practice/attempts/:attemptId/submit
     * Submit attempt with idempotency key.
     */
    static readonly submitAttempt = catchAsync(async (req: Request, res: Response) => {
        const { attemptId } = req.params as { attemptId: string };
        const userId = String(req.user?._id);
        const idempotencyKey = req.headers['idempotency-key'] as string;

        if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 128) {
            return sendResponse(res, HttpStatus.BAD_REQUEST, 'Idempotency-Key header là bắt buộc (8–128 ký tự)', null);
        }

        const result = await ieltsAttemptService.submitAttempt(
            attemptId,
            userId,
            idempotencyKey,
            req.body as SubmitAttemptBody,
        );

        sendResponse(res, HttpStatus.OK, 'Nộp bài thành công', result);
    });

    /**
     * POST /api/ielts-practice/attempts/:attemptId/abandon
     * Abandon attempt (idempotent).
     */
    static readonly abandonAttempt = catchAsync(async (req: Request, res: Response) => {
        const { attemptId } = req.params as { attemptId: string };
        const userId = String(req.user?._id);
        await ieltsAttemptService.abandonAttempt(attemptId, userId);
        sendResponse(res, HttpStatus.OK, 'Đã bỏ lượt làm bài', null);
    });

    /**
     * GET /api/ielts-practice/attempts/:attemptId/result
     * Get attempt result.
     */
    static readonly getAttemptResult = catchAsync(async (req: Request, res: Response) => {
        const { attemptId } = req.params as { attemptId: string };
        const userId = String(req.user?._id);
        const result = await ieltsAttemptService.getAttemptResult(attemptId, userId);

        const statusCode = result.grading === 'not_available' ? HttpStatus.OK : HttpStatus.OK;
        sendResponse(res, statusCode, 'Lấy kết quả thành công', result);
    });
}
