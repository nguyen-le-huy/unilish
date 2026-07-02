import type { Request, Response } from 'express';
import { recommendationService } from '../services/recommendation.service.js';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { AppError } from '../utils/app-error.js';

export class RecommendationController {
    static getRecommendations = catchAsync(async (req: Request, res: Response) => {
        const userId = req.user?._id ? String(req.user._id) : '';

        if (!userId) {
            throw new AppError('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const recommendations = await recommendationService.getRecommendedCourses(userId);
        sendResponse(res, HttpStatus.OK, 'Get recommendations successfully', recommendations);
    });
}
