import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { examTestService } from '../services/exam-test.service.js';
import type {
    CreateExamTestBody,
    CreateVersionBody,
    GetExamTestsQuery,
    ParseQuestionsBody,
    RollbackExamTestParams,
    UpdateExamTestBody,
    UpdateExamTestStatusBody,
} from '../validations/exam-test.validation.js';

export class ExamTestController {
    static readonly getAll = catchAsync(async (req: Request, res: Response) => {
        const result = await examTestService.getAll(req.query as unknown as GetExamTestsQuery);
        sendResponse(res, HttpStatus.OK, 'Lấy danh sách bài thi thành công', result.data, {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
        });
    });

    static readonly getById = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await examTestService.getById(id);
        sendResponse(res, HttpStatus.OK, 'Lấy chi tiết bài thi thành công', result);
    });

    static readonly getPreview = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await examTestService.getPreview(id);
        sendResponse(res, HttpStatus.OK, 'Lấy preview đề thi thành công', result);
    });

    static readonly create = catchAsync(async (req: Request, res: Response) => {
        const adminId = String(req.user?._id);
        const result = await examTestService.create(req.body as CreateExamTestBody, adminId);
        sendResponse(res, HttpStatus.CREATED, 'Tạo bài thi thành công', result);
    });

    static readonly update = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const adminId = String(req.user?._id);
        const result = await examTestService.update(id, req.body as UpdateExamTestBody, adminId);
        sendResponse(res, HttpStatus.OK, 'Cập nhật bài thi thành công', result);
    });

    static readonly delete = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const adminId = String(req.user?._id);
        const result = await examTestService.delete(id, adminId);
        sendResponse(res, HttpStatus.OK, 'Đã lưu trữ bài thi thành công', result);
    });

    static readonly hardDelete = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const adminId = String(req.user?._id);
        const result = await examTestService.hardDelete(id, adminId);
        sendResponse(res, HttpStatus.OK, 'Đã xoá bài thi vĩnh viễn', result);
    });

    static readonly updateStatus = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const adminId = String(req.user?._id);
        const { status } = req.body as UpdateExamTestStatusBody;
        const result = await examTestService.updateStatus(id, status, adminId);
        sendResponse(res, HttpStatus.OK, 'Cập nhật trạng thái bài thi thành công', result);
    });

    static readonly getVersionHistory = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await examTestService.getVersionHistory(id);
        sendResponse(res, HttpStatus.OK, 'Lấy lịch sử phiên bản thành công', result);
    });

    static readonly createVersion = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const adminId = String(req.user?._id);
        const result = await examTestService.createVersion(id, req.body as CreateVersionBody, adminId);
        sendResponse(res, HttpStatus.CREATED, 'Tạo phiên bản mới thành công', result);
    });

    static readonly validatePublish = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await examTestService.validatePublish(id);
        sendResponse(res, HttpStatus.OK, 'Kiểm tra đề hoàn tất', result);
    });

    static readonly rollback = catchAsync(async (req: Request, res: Response) => {
        const { id, version } = req.params as unknown as RollbackExamTestParams;
        const adminId = String(req.user?._id);
        const result = await examTestService.rollback(id, version, adminId);
        sendResponse(res, HttpStatus.CREATED, 'Rollback về v' + String(version) + ' thành công', result);
    });

    static readonly getAnalytics = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await examTestService.getAnalytics(id);
        sendResponse(res, HttpStatus.OK, 'Lấy analytics thành công', result);
    });

    static readonly parseQuestions = catchAsync(async (req: Request, res: Response) => {
        const { rawText } = req.body as ParseQuestionsBody;
        const result = await examTestService.parseQuestions(rawText);
        sendResponse(res, HttpStatus.OK, 'AI parse câu hỏi thành công', result);
    });
}
