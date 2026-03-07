import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { placementTestService } from '../services/placement-test.service.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import type {
    GetPlacementTestsQuery,
    CreatePlacementTestBody,
    UpdatePlacementTestBody,
    UpdatePlacementTestStatusBody,
    RollbackParams,
    AnalyticsQuery,
    ParseMcqPart3ImportBody,
    PushToQuestionBankBody,
} from '../validations/placement-test.validation.js';

// ─── Controller ───────────────────────────────────────────────────────────────

export class PlacementTestController {

    // ─── GET /placement-tests ─────────────────────────────────────────────────
    static getAll = catchAsync(async (req: Request, res: Response) => {
        const result = await placementTestService.getAll(
            req.query as unknown as GetPlacementTestsQuery,
        );
        sendResponse(res, HttpStatus.OK, 'Lấy danh sách bài kiểm tra thành công', result);
    });

    // ─── GET /placement-tests/:id ─────────────────────────────────────────────
    static getById = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const test = await placementTestService.getById(id);
        sendResponse(res, HttpStatus.OK, 'Lấy bài kiểm tra thành công', test);
    });

    // ─── POST /placement-tests ────────────────────────────────────────────────
    static create = catchAsync(async (req: Request, res: Response) => {
        const adminId = String(req.user?._id);
        const test = await placementTestService.create(req.body as CreatePlacementTestBody, adminId);
        sendResponse(res, HttpStatus.CREATED, 'Tạo bài kiểm tra thành công', test);
    });

    // ─── PUT /placement-tests/:id ─────────────────────────────────────────────
    static update = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const adminId = String(req.user?._id);
        const updated = await placementTestService.update(
            id,
            req.body as UpdatePlacementTestBody,
            adminId,
        );
        sendResponse(res, HttpStatus.OK, 'Cập nhật bài kiểm tra thành công', updated);
    });

    // ─── PATCH /placement-tests/:id/status ───────────────────────────────────
    static updateStatus = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const adminId = String(req.user?._id);
        const { status } = req.body as UpdatePlacementTestStatusBody;
        const updated = await placementTestService.updateStatus(id, status, adminId);
        sendResponse(res, HttpStatus.OK, 'Cập nhật trạng thái thành công', updated);
    });

    // ─── GET /placement-tests/:id/versions ───────────────────────────────────
    static getVersionHistory = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const history = await placementTestService.getVersionHistory(id);
        sendResponse(res, HttpStatus.OK, 'Lấy lịch sử phiên bản thành công', history);
    });

    // ─── POST /placement-tests/:id/rollback/:version ──────────────────────────
    static rollback = catchAsync(async (req: Request, res: Response) => {
        const { id, version } = req.params as unknown as RollbackParams;
        const adminId = String(req.user?._id);
        const draft = await placementTestService.rollback(id, version, adminId);
        sendResponse(res, HttpStatus.CREATED, `Rollback về v${version} thành công (draft mới tạo)`, draft);
    });

    // ─── GET /placement-tests/:id/pool-validation ─────────────────────────────
    static validatePool = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await placementTestService.validatePool(id);
        sendResponse(res, HttpStatus.OK, 'Kiểm tra pool thành công', result);
    });

    // ─── GET /placement-tests/:id/analytics ──────────────────────────────────
    static getAnalytics = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const result = await placementTestService.getAnalytics(
            id,
            req.query as unknown as AnalyticsQuery,
        );
        sendResponse(res, HttpStatus.OK, 'Lấy thống kê thành công', result);
    });

    // ─── POST /placement-tests/ai/parse-mcq-part3 ───────────────────────────
    static parseMcqPart3Import = catchAsync(async (req: Request, res: Response) => {
        const { rawText, part } = req.body as ParseMcqPart3ImportBody;
        const result = await placementTestService.parseMcqPart3Import(rawText, part);
        sendResponse(res, HttpStatus.OK, 'AI phân tích nội dung thành công', result);
    });
    // ─── POST /placement-tests/:id/push-to-question-bank ─────────────────
    static pushToQuestionBank = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params as { id: string };
        const adminId = String(req.user?._id);
        const result = await placementTestService.pushToQuestionBank(
            id,
            adminId,
            req.body as PushToQuestionBankBody,
        );
        sendResponse(res, HttpStatus.OK, `Đã đẩy ${result.inserted} câu hỏi vào Question Bank`, result);
    });}
