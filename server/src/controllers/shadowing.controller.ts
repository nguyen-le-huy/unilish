import type { Request, Response } from 'express';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { catchAsync } from '../utils/catch-async.js';
import { shadowingService } from '../services/shadowing.service.js';
import type { IShadowingCue } from '../models/mongo/shadowing-video.model.js';
import type {
    ScorePronunciationBody,
    SubmitVideoBody,
    UpdateCuesBody,
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

    static listAdminVideos = catchAsync(async (req: Request, res: Response) => {
        const page = Number(req.query['page'] ?? 1);
        const limit = Number(req.query['limit'] ?? 20);
        const payload = await shadowingService.listAdminVideos(page, limit);
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

    static updateCues = catchAsync(async (req: Request<{ videoId: string }, {}, UpdateCuesBody>, res: Response) => {
        const normalizedCues: IShadowingCue[] = req.body.cues.map((cue) => ({
            id: cue.id,
            text: cue.text,
            translationVi: cue.translationVi ?? null,
            vocabulary: cue.vocabulary ?? [],
            commonPhrases: cue.commonPhrases ?? [],
            startMs: cue.startMs,
            endMs: cue.endMs,
        }));

        const payload = await shadowingService.updateCues(
            req.params.videoId,
            normalizedCues,
            req.body.autoTranslate ?? false,
        );
        res.status(HttpStatus.OK).json(payload);
    });

    static deleteVideo = catchAsync(async (req: Request<{ videoId: string }>, res: Response) => {
        await shadowingService.deleteVideo(req.params.videoId);
        res.status(HttpStatus.NO_CONTENT).send();
    });
}
