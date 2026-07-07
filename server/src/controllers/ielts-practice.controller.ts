import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { ieltsPracticeService } from '../services/ielts-practice.service.js';
import type { IeltsListTestsQuery, IeltsTestDetailParams } from '../validations/ielts-practice.validation.js';

export class IeltsPracticeController {
    /**
     * GET /api/ielts-practice/summary
     * Returns the number of active tests per skill.
     */
    static readonly getSkillSummary = catchAsync(async (req: Request, res: Response) => {
        const result = await ieltsPracticeService.getSkillSummary();
        sendResponse(res, HttpStatus.OK, 'Lấy tổng quan IELTS thành công', result);
    });

    /**
     * GET /api/ielts-practice/tests
     * Returns paginated list of active tests for a given skill.
     */
    static readonly getTestsBySkill = catchAsync(async (req: Request, res: Response) => {
        const query = req.query as unknown as IeltsListTestsQuery;
        const userId = String(req.user?._id);
        const result = await ieltsPracticeService.getTestsBySkill(
            query.skill,
            query.page,
            query.limit,
            query.search,
            userId,
        );
        sendResponse(res, HttpStatus.OK, 'Lấy danh sách đề IELTS thành công', result.data, {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: result.totalPages,
        });
    });

    /**
     * GET /api/ielts-practice/tests/:slug
     * Returns redacted test detail by slug.
     */
    static readonly getTestDetail = catchAsync(async (req: Request, res: Response) => {
        const { slug } = req.params as IeltsTestDetailParams;
        const userId = String(req.user?._id);
        const result = await ieltsPracticeService.getTestDetailBySlug(slug, userId);
        sendResponse(res, HttpStatus.OK, 'Lấy chi tiết đề IELTS thành công', result);
    });
}
