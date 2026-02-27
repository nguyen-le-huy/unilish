import { describe, expect, it } from 'vitest';

import {
    buildAudioChunkPayload,
    buildSessionEndPayload,
    buildSessionStartPayload,
} from './speaking-payload.mapper';

describe('speaking-payload.mapper', () => {
    it('builds session start payload', () => {
        const payload = buildSessionStartPayload({
            sessionId: 's1',
            userId: 'u1',
            lessonId: 'l1',
            traceId: 't1',
            nativeLanguage: 'vi',
        });

        expect(payload.sessionId).toBe('s1');
        expect(payload.nativeLanguage).toBe('vi');
        expect(payload.traceId).toBe('t1');
    });

    it('builds audio/session end payloads', () => {
        const audioPayload = buildAudioChunkPayload({
            sessionId: 's1',
            userId: 'u1',
            lessonId: 'l1',
            traceId: 't1',
            sequenceNumber: 1,
            audioData: 'abc',
            audioFormat: 'wav',
            durationMs: 1500,
            isFinalChunk: true,
        });

        const endPayload = buildSessionEndPayload({
            sessionId: 's1',
            userId: 'u1',
            lessonId: 'l1',
            traceId: 't1',
            reason: 'user_initiated',
        });

        expect(audioPayload.sequenceNumber).toBe(1);
        expect(endPayload.reason).toBe('user_initiated');
    });
});
