import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { learningGoalService } from '../services/learning-goal.service.js';
import type {
    CreateLearningGoalBody,
    GetLearningGoalsQuery,
    UpdateLearningGoalBody,
} from '../validations/learning-goal.validation.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';

export class LearningGoalController {
    static getLearningGoals = catchAsync(async (req: Request, res: Response) => {
        const result = await learningGoalService.getLearningGoals(req.query as unknown as GetLearningGoalsQuery);
        sendResponse(res, HttpStatus.OK, 'Get learning goals successfully', result.goals, result.pagination);
    });

    static getLearningGoalBySlug = catchAsync(async (req: Request, res: Response) => {
        const slug = req.params.slug as string;
        const goal = await learningGoalService.getLearningGoalBySlug(slug);
        sendResponse(res, HttpStatus.OK, 'Get learning goal successfully', goal);
    });

    static createLearningGoal = catchAsync(async (req: Request, res: Response) => {
        const created = await learningGoalService.createLearningGoal(req.body as CreateLearningGoalBody);
        sendResponse(res, HttpStatus.CREATED, 'Create learning goal successfully', created);
    });

    static updateLearningGoal = catchAsync(async (req: Request, res: Response) => {
        const slug = req.params.slug as string;
        const updated = await learningGoalService.updateLearningGoal(slug, req.body as UpdateLearningGoalBody);
        sendResponse(res, HttpStatus.OK, 'Update learning goal successfully', updated);
    });

    static toggleLearningGoalStatus = catchAsync(async (req: Request, res: Response) => {
        const slug = req.params.slug as string;
        const updated = await learningGoalService.toggleLearningGoalStatus(slug);
        sendResponse(res, HttpStatus.OK, 'Toggle learning goal status successfully', updated);
    });

}
