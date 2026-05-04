import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { catchAsync } from '../utils/catch-async.js';
import { shadowingService } from '../services/shadowing.service.js';
import type {
    ScorePronunciationBody,
    SubmitVideoBody,
} from '../validations/shadowing.schema.js';

export class ShadowingController {
    static submitVideo = catchAsync(async (req: Request<{}, {}, SubmitVideoBody>, res: Response) => {
        const userId = req.user?._id ? String(req.user._id) : '';
        if (!userId) {
            throw new AppError('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

        const payload = await shadowingService.submitVideo(req.body.url, userId);
        res.status(HttpStatus.OK).json(payload);
    });

    static getVideoStatus = catchAsync(async (req: Request, res: Response) => {
        const payload = await shadowingService.getVideoStatus(req.params['videoId']!);
        res.status(HttpStatus.OK).json(payload);
    });

    static listVideos = catchAsync(async (req: Request, res: Response) => {
        const page = Number(req.query['page'] ?? 1);
        const limit = Number(req.query['limit'] ?? 12);
        const payload = await shadowingService.listVideos(page, limit);
        res.status(HttpStatus.OK).json(payload);
    });

    static scorePronunciation = catchAsync(async (req: Request<{}, {}, ScorePronunciationBody>, res: Response) => {
        const file = req.file;
        if (!file || !file.buffer || file.buffer.length === 0) {
            throw new AppError('Audio file is required.', HttpStatus.BAD_REQUEST);
        }

        const payload = await shadowingService.scorePronunciation(file.buffer, req.body.referenceText, file.mimetype);
        res.status(HttpStatus.OK).json(payload);
    });
}
