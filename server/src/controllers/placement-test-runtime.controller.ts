import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { placementTestRuntimeService } from '../services/placement-test-runtime.service.js';
import type {
    CreatePlacementAttemptBody,
    GetActivePlacementRuntimeQuery,
    GetPlacementAttemptByIdParams,
    SavePlacementAnswersBody,
    SubmitPlacementAttemptParams,
} from '../validations/placement-test-runtime.validation.js';

export class PlacementTestRuntimeController {
    static getActive = catchAsync(async (req: Request, res: Response) => {
        const query = req.query as unknown as GetActivePlacementRuntimeQuery;
        const activeTest = await placementTestRuntimeService.getActive(query.language);
        sendResponse(res, HttpStatus.OK, 'Get active placement test successfully', activeTest);
    });

    static createAttempt = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const body = req.body as CreatePlacementAttemptBody;
        const attempt = await placementTestRuntimeService.createAttempt(userId, body);
        sendResponse(res, HttpStatus.CREATED, 'Create placement attempt successfully', attempt);
    });

    static getAttemptById = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { attemptId } = req.params as unknown as GetPlacementAttemptByIdParams;
        const attempt = await placementTestRuntimeService.getAttemptById(userId, attemptId);
        sendResponse(res, HttpStatus.OK, 'Get placement attempt successfully', attempt);
    });

    static saveAnswers = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { attemptId } = req.params as unknown as GetPlacementAttemptByIdParams;
        const body = req.body as SavePlacementAnswersBody;
        const result = await placementTestRuntimeService.saveAnswers(userId, attemptId, body);
        sendResponse(res, HttpStatus.OK, 'Save placement answers successfully', result);
    });

    static submitAttempt = catchAsync(async (req: Request, res: Response) => {
        const userId = String(req.user?._id);
        const { attemptId } = req.params as unknown as SubmitPlacementAttemptParams;
        const result = await placementTestRuntimeService.submitAttempt(userId, attemptId);
        sendResponse(res, HttpStatus.OK, 'Submit placement attempt successfully', result);
    });
}
