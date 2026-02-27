import { describe, expect, it } from 'vitest';

import {
    buildAudioChunkPayload,
    buildSessionEndPayload,
    buildSessionStartPayload,
    buildUserMessagePayload,
    resolvePersonaId,
} from './speaking-payload.mapper';

describe('speaking-payload.mapper', () => {
    it('resolves persona from role name', () => {
        expect(resolvePersonaId('IELTS examiner')).toBe('ielts-examiner');
        expect(resolvePersonaId('Airport support')).toBe('airport-staff');
        expect(resolvePersonaId('Business client')).toBe('business-client');
        expect(resolvePersonaId('Daily friend')).toBe('casual-friend');
    });

    it('builds session start payload', () => {
        const payload = buildSessionStartPayload({
            sessionId: 's1',
            userId: 'u1',
            lessonId: 'l1',
            traceId: 't1',
            roleName: 'IELTS examiner',
        });

        expect(payload.sessionId).toBe('s1');
        expect(payload.contractVersion).toBe(1);
        expect(payload.personaId).toBe('ielts-examiner');
    });

    it('builds user message payload', () => {
        const payload = buildUserMessagePayload({
            sessionId: 's1',
            userId: 'u1',
            lessonId: 'l1',
            traceId: 't1',
            message: 'hello',
            missionTitle: 'Mission',
            missionDescription: '  context  ',
            aiConfig: {
                roleName: 'Teacher',
                firstMessage: ' Hi ',
                systemInstruction: ' Speak slow ',
            },
        });

        expect(payload.message).toBe('hello');
        expect(payload.missionDescription).toBe('context');
        expect(payload.firstMessage).toBe('Hi');
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
