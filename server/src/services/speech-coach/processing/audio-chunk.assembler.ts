/**
 * @module audio-chunk.assembler
 * @description Assembles ordered audio chunks into a complete audio buffer.
 * Handles out-of-order delivery and gap detection for reliable reassembly.
 *
 * Phase 0 skeleton — processing logic filled in Phase 2.
 */

import { logger } from '../../../utils/logger.js';

export interface AudioChunkEntry {
    readonly sequenceNumber: number;
    readonly audioData: string; // base64
    readonly durationMs: number;
    readonly isFinalChunk: boolean;
}

export interface AssembledAudio {
    readonly sessionId: string;
    readonly data: Buffer;
    readonly totalDurationMs: number;
    readonly chunkCount: number;
}

export class AudioChunkAssembler {
    private readonly chunks = new Map<number, AudioChunkEntry>();
    private expectedSequence = 0;

    constructor(private readonly sessionId: string) { }

    /**
     * Push an incoming chunk. Returns assembled audio if the final chunk is received
     * and all preceding chunks are in order; otherwise returns null.
     */
    push(chunk: AudioChunkEntry): AssembledAudio | null {
        this.chunks.set(chunk.sequenceNumber, chunk);

        if (chunk.sequenceNumber !== this.expectedSequence) {
            logger.warn('[AudioChunkAssembler] Out-of-order chunk received', {
                sessionId: this.sessionId,
                expected: this.expectedSequence,
                received: chunk.sequenceNumber,
            });
        } else {
            this.expectedSequence += 1;
        }

        if (!chunk.isFinalChunk) return null;

        return this.assemble();
    }

    private assemble(): AssembledAudio | null {
        const sortedKeys = Array.from(this.chunks.keys()).sort((a, b) => a - b);
        const buffers: Buffer[] = [];
        let totalDurationMs = 0;

        for (const key of sortedKeys) {
            const entry = this.chunks.get(key);
            if (!entry) {
                logger.warn('[AudioChunkAssembler] Missing chunk during assembly', {
                    sessionId: this.sessionId,
                    missingSequence: key,
                });
                continue;
            }
            buffers.push(Buffer.from(entry.audioData, 'base64'));
            totalDurationMs += entry.durationMs;
        }

        this.chunks.clear();
        this.expectedSequence = 0;

        return {
            sessionId: this.sessionId,
            data: Buffer.concat(buffers),
            totalDurationMs,
            chunkCount: sortedKeys.length,
        };
    }
}
