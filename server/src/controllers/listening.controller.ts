import type { Request, Response } from 'express';
import { GetObjectCommand, NoSuchKey } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { ListeningService } from '../services/listening.service.js';
import { r2Client, listeningAudioKey } from '../config/r2.js';
import { env } from '../config/env.js';
import type {
    SaveListeningContentBody,
    GenerateListeningQuestionsBody,
    UpdateListeningQuestionBody,
} from '../validations/listening.validation.js';

// ─── GET /:lessonId/listening/content ────────────────────────────────────────

export const getListeningContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const content = await ListeningService.getContent(lessonId);
    sendResponse(res, HttpStatus.OK, 'Listening content retrieved', content);
});

// ─── PUT /:lessonId/listening/content ────────────────────────────────────────

export const saveListeningContent = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as SaveListeningContentBody;
    const content = await ListeningService.saveContent(lessonId, body);
    sendResponse(res, HttpStatus.OK, 'Listening content saved', content);
});

// ─── GET /:lessonId/listening/audio — R2 proxy (no auth required) ────────────
// Streams the generated audio from R2 through the server so the browser never
// needs R2 credentials. WaveSurfer fetch() works without extra headers.

export const streamListeningAudio = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const key = listeningAudioKey(lessonId);

    const command = new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME ?? '',
        Key: key,
    });

    let r2Response;
    try {
        r2Response = await r2Client.send(command);
    } catch (err) {
        const errorName = typeof err === 'object' && err !== null && 'name' in err
            ? String((err as { name?: string }).name)
            : '';

        if (err instanceof NoSuchKey || errorName === 'NoSuchKey') {
            throw new AppError(
                'Audio file not found. Generate audio first via Mix & Sync.',
                HttpStatus.NOT_FOUND,
            );
        }
        throw err;
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    if (r2Response.ContentLength) {
        res.setHeader('Content-Length', r2Response.ContentLength.toString());
    }

    const body = r2Response.Body as unknown;
    if (!body) {
        throw new AppError('Audio stream is empty.', HttpStatus.BAD_GATEWAY);
    }

    // AWS SDK v3 can return either Node readable stream or Web stream depending runtime.
    if (
        typeof body === 'object'
        && body !== null
        && 'pipe' in body
        && typeof (body as { pipe?: unknown }).pipe === 'function'
    ) {
        (body as NodeJS.ReadableStream).pipe(res);
        return;
    }

    if (
        typeof body === 'object'
        && body !== null
        && 'getReader' in body
        && typeof (body as { getReader?: unknown }).getReader === 'function'
    ) {
        const nodeStream = Readable.fromWeb(body as Parameters<typeof Readable.fromWeb>[0]);
        nodeStream.pipe(res);
        return;
    }

    if (
        typeof body === 'object'
        && body !== null
        && 'transformToWebStream' in body
        && typeof (body as { transformToWebStream?: unknown }).transformToWebStream === 'function'
    ) {
        const webStream = (body as { transformToWebStream: () => ReadableStream }).transformToWebStream();
        const nodeStream = Readable.fromWeb(webStream as Parameters<typeof Readable.fromWeb>[0]);
        nodeStream.pipe(res);
        return;
    }

    throw new AppError('Unsupported audio stream type from storage.', HttpStatus.BAD_GATEWAY);
});

// ─── POST /:lessonId/listening/generate-questions ───────────────────────────

export const generateListeningQuestions = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const body = req.body as GenerateListeningQuestionsBody;

    const result = await ListeningService.generateQuestions(lessonId, body);

    sendResponse(res, HttpStatus.OK, 'Listening questions generated', result);
});

// ─── GET /:lessonId/listening/questions ─────────────────────────────────────

export const getListeningQuestions = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questions = await ListeningService.getQuestions(lessonId);
    sendResponse(res, HttpStatus.OK, 'Listening questions retrieved', questions);
});

// ─── POST /:lessonId/listening/questions/:questionId/swap ───────────────────

export const swapListeningQuestion = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questionId = req.params['questionId']!;
    const replacement = await ListeningService.swapQuestion(lessonId, questionId);
    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được thay thế', replacement);
});

// ─── PUT /:lessonId/listening/questions/:questionId ─────────────────────────

export const updateListeningQuestion = catchAsync(async (req: Request, res: Response) => {
    const questionId = req.params['questionId']!;
    const body = req.body as UpdateListeningQuestionBody;
    const updated = await ListeningService.updateQuestion(questionId, body as Record<string, unknown>);
    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được cập nhật', updated);
});

// ─── DELETE /:lessonId/listening/questions/:questionId ──────────────────────

export const deleteListeningQuestion = catchAsync(async (req: Request, res: Response) => {
    const lessonId = req.params['lessonId']!;
    const questionId = req.params['questionId']!;
    await ListeningService.deleteQuestion(lessonId, questionId);
    sendResponse(res, HttpStatus.OK, 'Câu hỏi đã được xoá', null);
});
