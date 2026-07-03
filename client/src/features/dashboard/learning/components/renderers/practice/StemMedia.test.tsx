// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '@/config/env';
import StemMedia from './StemMedia';

class MockAudio {
    static created: MockAudio[] = [];

    public onended: (() => void) | null = null;
    public onerror: (() => void) | null = null;
    public src: string;

    constructor(src: string) {
        this.src = src;
        MockAudio.created.push(this);
    }

    pause = vi.fn();

    play = vi.fn(async () => undefined);
}

describe('StemMedia', () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        MockAudio.created = [];
    });

    it('plays practice audio through the API proxy first', async () => {
        vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

        render(
            <StemMedia
                stem={{
                    text: 'Nghe va chon tu dung:',
                    audioUrl: 'https://bucket.r2.dev/audio/vocab/hello.mp3',
                }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /phát âm thanh/i }));

        await waitFor(() => {
            expect(MockAudio.created).toHaveLength(1);
        });

        expect(MockAudio.created[0]?.src).toBe(`${env.API_URL}/audio/audio/vocab/hello.mp3`);
        expect(MockAudio.created[0]?.play).toHaveBeenCalledTimes(1);
    });
});
