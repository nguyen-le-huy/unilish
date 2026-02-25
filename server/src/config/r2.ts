import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env.js';

/**
 * Shared Cloudflare R2 client (S3-compatible).
 * `region: 'auto'` is required by AWS SDK v3 even for non-AWS endpoints.
 */
export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID ?? ''}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? '',
    },
});

/** Derive the R2 key for a lesson's dialogue audio. */
export const listeningAudioKey = (lessonId: string) =>
    `audio/listening/${lessonId}/dialogue.mp3`;
