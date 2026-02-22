import type { Request, Response } from 'express';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { catchAsync } from '../utils/catch-async.js';
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

// ─── GET /api/audio/* ─────────────────────────────────────────────────────────

export const streamAudio = catchAsync(async (req: Request, res: Response) => {
    // req.path is the path relative to where this router is mounted (/api/audio)
    // Strip the leading slash to get the R2 object key
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
