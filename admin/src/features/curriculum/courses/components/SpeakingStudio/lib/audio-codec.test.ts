import { describe, expect, it } from 'vitest';

import { decodePcm16Base64, resolveAudioFormat } from './audio-codec';

describe('audio-codec', () => {
    it('resolves audio format from mime type', () => {
        expect(resolveAudioFormat('audio/webm;codecs=opus')).toBe('webm');
        expect(resolveAudioFormat('audio/ogg;codecs=opus')).toBe('ogg');
        expect(resolveAudioFormat('audio/mpeg')).toBe('mp3');
        expect(resolveAudioFormat('audio/unknown')).toBe('wav');
    });

    it('decodes pcm16 base64 to normalized float samples', () => {
        const bytes = new Uint8Array([0x00, 0x00, 0xff, 0x7f]);
        const binary = String.fromCharCode(...bytes);
        const base64 = btoa(binary);

        const decoded = decodePcm16Base64(base64);

        expect(decoded.length).toBe(2);
        expect(decoded[0]).toBeCloseTo(0, 5);
        expect(decoded[1]).toBeCloseTo(0.99997, 4);
    });
});
