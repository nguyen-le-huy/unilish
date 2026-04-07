import type { Request, Response } from 'express';
import OpenAI from 'openai';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env.js';
import { r2Client } from '../config/r2.js';
import { AppError } from '../utils/app-error.js';
import { catchAsync } from '../utils/catch-async.js';
import { HttpStatus } from '../constants/http-status.js';
import type { Readable } from 'stream';

const openaiClient = new OpenAI({ apiKey: env.OPENAI_API_KEY });

const resolveAudioUrl = (audioKey: string): string => {
    if (audioKey.startsWith('http://') || audioKey.startsWith('https://')) {
        return audioKey;
    }

    const base = (env.R2_PUBLIC_DOMAIN ?? `https://${env.R2_BUCKET_NAME ?? ''}.r2.dev`).replace(/\/$/, '');
    const normalizedKey = audioKey.replace(/^\/+/, '');
    return `${base}/${normalizedKey}`;
};

const normalizeAudioKey = (audioKey: string): string => {
    if (!audioKey) {
        return '';
    }

    if (audioKey.startsWith('http://') || audioKey.startsWith('https://')) {
        try {
            const parsed = new URL(audioKey);
            return parsed.pathname.replace(/^\/+/, '');
        } catch {
            return '';
        }
    }

    return audioKey.replace(/^\/+/, '');
};

export class SpeakingExaminerController {
    static getVoice = catchAsync(async (req: Request, res: Response) => {
        const text = String(req.query.text ?? '').trim();
        const audioKey = typeof req.query.audioKey === 'string' ? req.query.audioKey.trim() : '';

        if (audioKey) {
            const normalizedKey = normalizeAudioKey(audioKey);

            if (normalizedKey) {
                try {
                    const r2Response = await r2Client.send(new GetObjectCommand({
                        Bucket: env.R2_BUCKET_NAME,
                        Key: normalizedKey,
                    }));

                    if (r2Response.Body) {
                        const chunks: Buffer[] = [];
                        for await (const chunk of r2Response.Body as Readable) {
                            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                        }
                        const buffer = Buffer.concat(chunks);
                        const contentType = r2Response.ContentType ?? 'audio/mpeg';
                        res.setHeader('Content-Type', contentType);
                        res.setHeader('Cache-Control', 'no-store');
                        res.status(200).send(buffer);
                        return;
                    }
                } catch {
                    // Fall through to URL fetch and TTS fallback when object is unavailable.
                }
            }

            const audioUrl = resolveAudioUrl(audioKey);
            const audioResponse = await fetch(audioUrl, { method: 'GET' });

            if (audioResponse.ok) {
                const contentType = audioResponse.headers.get('content-type') ?? 'audio/mpeg';
                const buffer = Buffer.from(await audioResponse.arrayBuffer());
                res.setHeader('Content-Type', contentType);
                res.setHeader('Cache-Control', 'no-store');
                res.status(200).send(buffer);
                return;
            }
        }

        if (!text) {
            throw new AppError('Text is required to synthesize examiner voice', HttpStatus.BAD_REQUEST);
        }

        const speech = await openaiClient.audio.speech.create({
            model: env.OPENAI_TTS_MODEL,
            voice: 'alloy',
            input: text,
        });

        const buffer = Buffer.from(await speech.arrayBuffer());
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).send(buffer);
    });
}
