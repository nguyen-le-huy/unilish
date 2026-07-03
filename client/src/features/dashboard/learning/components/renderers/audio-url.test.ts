import { describe, expect, it } from 'vitest';
import { env } from '@/config/env';
import { getPlayableAudioSources } from './audio-url';

describe('getPlayableAudioSources', () => {
    it('routes relative API media URLs through the configured backend', () => {
        const sources = getPlayableAudioSources(
            '/api/curriculum/lessons/lesson-1/listening/audio?v=123',
        );

        expect(sources).toEqual([
            `${env.API_URL.replace(/\/api$/, '')}/api/curriculum/lessons/lesson-1/listening/audio?v=123`,
        ]);
    });
});
