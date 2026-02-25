/**
 * @module audio-archive.writer
 * @description Archives finalized audio blobs from sessions to Cloudflare R2.
 * Triggered after session finalization. Implements retry policy via Phase 4 queue.
 *
 * Phase 0/3 stub — R2 upload deferred to Phase 3.
 */

import { logger } from '../../../utils/logger.js';

export interface AudioArchiveJob {
    readonly sessionId: string;
    readonly userId: string;
    readonly lessonId: string;
    readonly audioBuffer: Buffer;
    readonly mimeType: 'audio/webm' | 'audio/wav' | 'audio/ogg';
    readonly durationMs: number;
}

export interface AudioArchiveResult {
    readonly sessionId: string;
    readonly r2Key: string;
    readonly publicUrl: string;
    readonly archivedAt: number;
}

export class AudioArchiveWriter {
    /**
     * Upload a finalized session audio buffer to Cloudflare R2.
     * Phase 3: will integrate with R2 S3-compatible SDK.
     */
    async archive(job: AudioArchiveJob): Promise<AudioArchiveResult | null> {
        logger.info('[AudioArchiveWriter][STUB] Archiving audio to R2', {
            sessionId: job.sessionId,
            userId: job.userId,
            durationMs: job.durationMs,
            mimeType: job.mimeType,
        });

        // TODO(Phase 3): const r2Key = `speaking/${job.userId}/${job.sessionId}.webm`;
        // TODO(Phase 3): await r2Client.send(new PutObjectCommand({ Bucket, Key: r2Key, Body: job.audioBuffer }));
        void job;

        return null; // Phase 3 will return real result
    }
}
