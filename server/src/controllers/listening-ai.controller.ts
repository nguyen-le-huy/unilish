import type { Request, Response } from 'express';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { HttpStatus } from '../constants/http-status.js';
import { ListeningAiService } from '../services/listening-ai.service.js';
import type {
    GenerateListeningScriptBody,
    MixAndSyncBody,
} from '../validations/listening.validation.js';

// ─── POST /:lessonId/listening/generate-script ────────────────────────────────

export const generateListeningScript = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as GenerateListeningScriptBody;

    const transcript = await ListeningAiService.generateScript(lessonId, body);

    sendResponse(
        res,
        HttpStatus.OK,
        `Đã tạo kịch bản ${transcript.length} dòng thoại`,
        transcript,
    );
});

// ─── POST /:lessonId/listening/mix-and-sync ───────────────────────────────────

export const mixAndSync = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as MixAndSyncBody;

    const result = await ListeningAiService.enqueueMixAndSync(lessonId, body);

    sendResponse(
        res,
        HttpStatus.ACCEPTED,
        'Mix & Sync đã được đưa vào hàng đợi xử lý',
        result,
    );
});

// ─── DELETE /:lessonId/listening/mix-and-sync ───────────────────────────────

export const cancelMixAndSync = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    await ListeningAiService.cancelMixAndSync(lessonId);
    sendResponse(res, HttpStatus.OK, 'Pipeline đã được huỷ', null);
});

// ─── GET /:lessonId/listening/sync-status ────────────────────────────────────

export const getListeningSyncStatus = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const result = await ListeningAiService.getSyncStatus(lessonId);
    sendResponse(res, HttpStatus.OK, 'Sync status retrieved', result);
});
