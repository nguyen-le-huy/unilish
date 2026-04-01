import type { Request, Response } from 'express';
import {
    S3Client,
    GetObjectCommand,
    ListObjectsV2Command,
    DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';
import { sendResponse } from '../utils/send-response.js';
import { UploadService } from '../services/upload.service.js';
import type { Readable } from 'stream';

// ─── R2 Client ────────────────────────────────────────────────────────────────

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID || '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
    },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_PARTS = ['part1', 'part2', 'part3'] as const;
type SpeakingPart = typeof VALID_PARTS[number];

const isSpeakingPart = (value: string): value is SpeakingPart =>
    (VALID_PARTS as readonly string[]).includes(value);

const r2PublicUrl = (key: string): string => {
    const domain = env.R2_PUBLIC_DOMAIN ?? `https://${env.R2_BUCKET_NAME ?? ''}.r2.dev`;
    const base = domain.endsWith('/') ? domain.slice(0, -1) : domain;
    return `${base}/${key}`;
};

// ─── POST /api/audio/speaking-questions/upload ────────────────────────────────

/**
 * Upload a single audio file for a speaking question.
 * Body: multipart/form-data  — field name: "file"
 * Query: ?part=part1|part2|part3  &questionId=<string>
 *
 * Returns: { key, url }
 */
export const uploadSpeakingQuestionAudio = catchAsync(async (req: Request, res: Response) => {
    if (!req.file) {
        throw new AppError('No audio file uploaded', HttpStatus.BAD_REQUEST);
    }

    const { part, questionId } = req.query as Record<string, string>;

    if (!part || !isSpeakingPart(part)) {
        throw new AppError('Invalid or missing "part" query param. Use part1, part2, or part3.', HttpStatus.BAD_REQUEST);
    }

    if (!questionId?.trim()) {
        throw new AppError('Missing "questionId" query param.', HttpStatus.BAD_REQUEST);
    }

    if (!req.file.mimetype.startsWith('audio/')) {
        throw new AppError('Only audio files are allowed.', HttpStatus.BAD_REQUEST);
    }

    const result = await UploadService.uploadSpeakingQuestionAudio(req.file, part, questionId.trim());

    sendResponse(res, HttpStatus.CREATED, 'Audio uploaded successfully', result);
});

// ─── GET /api/audio/speaking-questions?part=part1 ─────────────────────────────

/**
 * List all uploaded question audios for a given part (or all parts).
 * Query: ?part=part1|part2|part3  (optional — omit for all)
 *
 * Returns: Array<{ key, url, fileName, uploadedAt }>
 */
export const listSpeakingQuestionAudios = catchAsync(async (req: Request, res: Response) => {
    const { part } = req.query as Record<string, string>;

    const prefix = part && isSpeakingPart(part)
        ? `speaking-questions/${part}/`
        : 'speaking-questions/';

    const command = new ListObjectsV2Command({
        Bucket: env.R2_BUCKET_NAME || '',
        Prefix: prefix,
    });

    const s3Response = await r2Client.send(command);

    const items = (s3Response.Contents ?? [])
        .filter((obj) => obj.Key && obj.Key !== prefix) // exclude the "directory" placeholder
        .map((obj) => ({
            key: obj.Key!,
            url: r2PublicUrl(obj.Key!),
            fileName: obj.Key!.split('/').pop() ?? '',
            uploadedAt: obj.LastModified?.toISOString() ?? null,
            sizeBytes: obj.Size ?? 0,
        }));

    sendResponse(res, HttpStatus.OK, 'Fetched speaking question audios', items);
});

// ─── DELETE /api/audio/speaking-questions ─────────────────────────────────────

/**
 * Delete a speaking question audio by its R2 key.
 * Body: { key: string }
 */
export const deleteSpeakingQuestionAudio = catchAsync(async (req: Request, res: Response) => {
    const { key } = req.body as { key?: string };

    if (!key?.trim()) {
        throw new AppError('Missing "key" in request body.', HttpStatus.BAD_REQUEST);
    }

    // Security: key must be scoped to the speaking-questions prefix
    if (!key.startsWith('speaking-questions/')) {
        throw new AppError('Invalid key path. Only speaking-questions/* keys are allowed.', HttpStatus.FORBIDDEN);
    }

    await r2Client.send(
        new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME || '', Key: key.trim() }),
    );

    sendResponse(res, HttpStatus.OK, 'Audio deleted successfully', { key: key.trim() });
});

// ─── GET /api/audio/* — stream R2 audio ───────────────────────────────────────

export const streamAudio = catchAsync(async (req: Request, res: Response) => {
    const key = req.path.replace(/^\//, '');

    if (!key) {
        throw new AppError('Audio key is required', HttpStatus.BAD_REQUEST);
    }

    const command = new GetObjectCommand({
        Bucket: env.R2_BUCKET_NAME || '',
        Key: key,
    });

    let r2Response;
    try {
        r2Response = await r2Client.send(command);
    } catch {
        throw new AppError('Audio file not found', HttpStatus.NOT_FOUND);
    }

    const contentType = r2Response.ContentType ?? 'audio/mpeg';
    const contentLength = r2Response.ContentLength;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    if (contentLength) {
        res.setHeader('Content-Length', contentLength);
    }

    (r2Response.Body as Readable).pipe(res);
});
