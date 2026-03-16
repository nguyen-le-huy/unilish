// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '@/config/env';
import { useAudioPlayer } from './use-audio-player';

type PlaybackBehavior = 'play' | 'error' | 'reject';

class MockAudio {
    static created: MockAudio[] = [];
    static behaviorBySource: Record<string, PlaybackBehavior> = {};

    public currentTime = 0;
    public onplay: (() => void) | null = null;
    public onended: (() => void) | null = null;
    public onpause: (() => void) | null = null;
    public onerror: (() => void) | null = null;
    public src: string;

    constructor(src: string) {
        this.src = src;
        MockAudio.created.push(this);
    }

    pause = vi.fn(() => {
        this.onpause?.();
    });

    play = vi.fn(async () => {
        const behavior = MockAudio.behaviorBySource[this.src] ?? 'play';
        if (behavior === 'error') {
            this.onerror?.();
            return;
        }

        if (behavior === 'reject') {
            throw new Error('play rejected');
        }

        this.onplay?.();
    });
}

afterEach(() => {
    vi.restoreAllMocks();
    MockAudio.created = [];
    MockAudio.behaviorBySource = {};
});

describe('useAudioPlayer', () => {
    it('keeps playingCode as null when greeting sound is missing', () => {
        vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

        const { result } = renderHook(() => useAudioPlayer());

        act(() => {
            result.current.playGreeting({
                _id: 'lang-1',
                code: 'en',
                name: 'English',
                nativeName: 'English',
                greetingSound: null,
                isActive: true,
            });
        });

        expect(result.current.playingCode).toBeNull();
        expect(MockAudio.created).toHaveLength(0);
    });

    it('sets playingCode when greeting sound can be played', async () => {
        vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

        const { result } = renderHook(() => useAudioPlayer());

        act(() => {
            result.current.playGreeting({
                _id: 'lang-2',
                code: 'vi',
                name: 'Vietnamese',
                nativeName: 'Tieng Viet',
                greetingSound: 'https://example.com/hello.mp3',
                isActive: true,
            });
        });

        await waitFor(() => {
            expect(result.current.playingCode).toBe('vi');
        });
    });

    it('stops current audio and resets playingCode', async () => {
        vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

        const { result } = renderHook(() => useAudioPlayer());

        act(() => {
            result.current.playGreeting({
                _id: 'lang-3',
                code: 'ja',
                name: 'Japanese',
                nativeName: 'Nihongo',
                greetingSound: 'https://example.com/konnichiwa.mp3',
                isActive: true,
            });
        });

        await waitFor(() => {
            expect(result.current.playingCode).toBe('ja');
        });

        const createdAudio = MockAudio.created[0];
        if (!createdAudio) {
            throw new Error('Expected one audio instance');
        }

        createdAudio.currentTime = 15;

        act(() => {
            result.current.stopAudio();
        });

        expect(createdAudio.pause).toHaveBeenCalledTimes(1);
        expect(createdAudio.currentTime).toBe(0);
        expect(result.current.playingCode).toBeNull();
    });

    it('falls back to secondary source when primary source errors', async () => {
        vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

        const proxySource = `${env.API_URL}/audio/hello.mp3`;
        const directSource = 'https://example.com/hello.mp3';
        MockAudio.behaviorBySource[proxySource] = 'error';
        MockAudio.behaviorBySource[directSource] = 'play';

        const { result } = renderHook(() => useAudioPlayer());

        act(() => {
            result.current.playGreeting({
                _id: 'lang-4',
                code: 'fr',
                name: 'French',
                nativeName: 'Francais',
                greetingSound: directSource,
                isActive: true,
            });
        });

        await waitFor(() => {
            expect(result.current.playingCode).toBe('fr');
        });

        expect(MockAudio.created.map((item) => item.src)).toEqual([proxySource, directSource]);
    });

    it('resolves root-relative greeting sound through API audio path', () => {
        vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

        const { result } = renderHook(() => useAudioPlayer());

        act(() => {
            result.current.playGreeting({
                _id: 'lang-5',
                code: 'de',
                name: 'German',
                nativeName: 'Deutsch',
                greetingSound: '/greetings/hallo.mp3',
                isActive: true,
            });
        });

        expect(MockAudio.created[0]?.src).toBe(`${env.API_URL}/audio/greetings/hallo.mp3`);
    });

    it('stops playing audio during unmount cleanup', async () => {
        vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

        const { result, unmount } = renderHook(() => useAudioPlayer());

        act(() => {
            result.current.playGreeting({
                _id: 'lang-6',
                code: 'es',
                name: 'Spanish',
                nativeName: 'Espanol',
                greetingSound: 'https://example.com/hola.mp3',
                isActive: true,
            });
        });

        await waitFor(() => {
            expect(result.current.playingCode).toBe('es');
        });

        const createdAudio = MockAudio.created[0];
        if (!createdAudio) {
            throw new Error('Expected one audio instance');
        }

        unmount();
        expect(createdAudio.pause).toHaveBeenCalledTimes(1);
    });
});
