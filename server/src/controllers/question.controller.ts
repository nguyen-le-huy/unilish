import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { questionService } from '../services/question.service.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import type {
    GetQuestionsQuery,
    CreateQuestionBody,
    UpdateQuestionBody,
    BulkActionBody,
    UpdateQuestionStatusBody,
    ExportQuestionsQuery,
} from '../validations/question.validation.js';

// ─── Controller ──────────────────────────────────────────────────────────────

export class QuestionController {
    // ─── GET /questions ───────────────────────────────────────────────────────
    static getQuestions = catchAsync(async (req: Request, res: Response) => {
        const result = await questionService.getQuestions(req.query as unknown as GetQuestionsQuery);
        sendResponse(res, HttpStatus.OK, 'Get questions successfully', result);
    });

    // ─── GET /questions/export ────────────────────────────────────────────────
    // NOTE: This route must be registered BEFORE /:id to avoid conflict
    static exportQuestions = catchAsync(async (req: Request, res: Response) => {
        const query = req.query as unknown as ExportQuestionsQuery;
        const buffer = await questionService.exportQuestions(query);

        const format = query.format ?? 'csv';
        const filename = `questions-export-${Date.now()}.${format}`;
        const contentType = format === 'json' ? 'application/json' : 'text/csv';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.status(HttpStatus.OK).send(buffer);
    });

    // ─── GET /questions/:id ───────────────────────────────────────────────────
    static getQuestionById = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const question = await questionService.getQuestionById(id);
        sendResponse(res, HttpStatus.OK, 'Get question successfully', question);
    });

    // ─── POST /questions ──────────────────────────────────────────────────────
    static createQuestion = catchAsync(async (req: Request, res: Response) => {
        const adminId = String(req.user?._id);
        const question = await questionService.createQuestion(
            req.body as CreateQuestionBody,
            adminId,
        );
        sendResponse(res, HttpStatus.CREATED, 'Tạo câu hỏi thành công', question);
    });

    // ─── PUT /questions/:id ───────────────────────────────────────────────────
    static updateQuestion = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const updated = await questionService.updateQuestion(id, req.body as UpdateQuestionBody);
        sendResponse(res, HttpStatus.OK, 'Cập nhật câu hỏi thành công', updated);
    });

    // ─── PATCH /questions/:id/status ─────────────────────────────────────────
    static updateQuestionStatus = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const { status } = req.body as UpdateQuestionStatusBody;
        const reviewerId = String(req.user?._id);
        const updated = await questionService.updateQuestionStatus(id, status, reviewerId);
        sendResponse(res, HttpStatus.OK, 'Cập nhật trạng thái thành công', updated);
    });

    // ─── DELETE /questions/:id ────────────────────────────────────────────────
    static deleteQuestion = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        await questionService.deleteQuestion(id);
        sendResponse(res, HttpStatus.OK, 'Xóa câu hỏi thành công', null);
    });

    // ─── POST /questions/bulk ─────────────────────────────────────────────────
    // NOTE: This route must be registered BEFORE /:id to avoid conflict
    static bulkAction = catchAsync(async (req: Request, res: Response) => {
        const result = await questionService.bulkAction(req.body as BulkActionBody);
        sendResponse(res, HttpStatus.OK, `Bulk action "${result.action}" thành công`, result);
    });
}
