// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import ListeningRenderer from './ListeningRenderer';

beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
});

const playMock = vi.fn().mockResolvedValue(undefined);
const pauseMock = vi.fn();
const loadMock = vi.fn();

beforeEach(() => {
    playMock.mockClear();
    pauseMock.mockClear();
    loadMock.mockClear();
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(playMock);
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pauseMock);
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(loadMock);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('ListeningRenderer', () => {
    it('highlights the transcript line matching the audio time', () => {
        render(
            <ListeningRenderer content={{
                type: 'LISTENING',
                media: { audioUrl: '/api/listening.mp3', duration: 8, accent: 'en-US' },
                transcript: [
                    {
                        id: 'line-1', speaker: 'Emily', role: 'Tourist', text: 'Hello',
                        translation: 'Xin chào', startTime: 0, endTime: 4, words: [],
                    },
                    {
                        id: 'line-2', speaker: 'Daniel', role: 'Tourist', text: 'Nice to meet you',
                        translation: 'Rất vui được gặp bạn', startTime: 4, endTime: 8, words: [],
                    },
                ],
                interactiveConfig: { mode: 'GAP_FILL', hidePercentage: 20, allowSlowSpeed: true },
            }} />,
        );

        const audio = screen.getByLabelText('Phát âm thanh bài nghe');
        Object.defineProperty(audio, 'currentTime', { configurable: true, value: 5 });
        fireEvent.timeUpdate(audio);

        expect(screen.getByText('Nice to meet you').parentElement?.getAttribute('aria-current')).toBe('true');
        expect(screen.getByText('Hello').parentElement?.getAttribute('aria-current')).toBeNull();
    });

    it('plays only the selected transcript segment', () => {
        render(
            <ListeningRenderer content={{
                type: 'LISTENING',
                media: { audioUrl: '/api/listening.mp3', duration: 8, accent: 'en-US' },
                transcript: [
                    {
                        id: 'line-1', speaker: 'Emily', role: 'Tourist', text: 'Hello',
                        translation: 'Xin chào', startTime: 1.5, endTime: 4, words: [],
                    },
                    {
                        id: 'line-2', speaker: 'Daniel', role: 'Tourist', text: 'Nice to meet you',
                        translation: 'Rất vui được gặp bạn', startTime: 4, endTime: 8, words: [],
                    },
                ],
                interactiveConfig: { mode: 'GAP_FILL', hidePercentage: 20, allowSlowSpeed: true },
            }} />,
        );

        const audio = screen.getByLabelText('Phát âm thanh bài nghe') as HTMLAudioElement;
        fireEvent.click(screen.getByRole('button', { name: /Phát đoạn hội thoại của Emily/i }));
        fireEvent.loadedMetadata(audio);

        expect(audio.currentTime).toBe(1.5);
        expect(playMock).toHaveBeenCalledTimes(1);
        expect(screen.getByText('Hello').parentElement?.getAttribute('aria-current')).toBe('true');

        audio.currentTime = 4;
        fireEvent.timeUpdate(audio);

        expect(pauseMock).toHaveBeenCalledTimes(2);
        expect(screen.getByText('Hello').parentElement?.getAttribute('aria-current')).toBeNull();
    });

    it('falls back to word timestamps when line timestamps are not synchronized', () => {
        render(
            <ListeningRenderer content={{
                type: 'LISTENING',
                media: { audioUrl: '/api/listening.mp3', duration: 9, accent: 'en-US' },
                transcript: [
                    {
                        id: 'line-1', speaker: 'Emily', role: 'Tourist', text: 'First line',
                        startTime: 0, endTime: 0,
                        words: [{ word: 'First', start: 0, end: 1, isTargetVocab: false }],
                    },
                    {
                        id: 'line-3', speaker: 'Daniel', role: 'Tourist', text: 'Third line',
                        startTime: 0, endTime: 0,
                        words: [{ word: 'Third', start: 6, end: 8, isTargetVocab: false }],
                    },
                ],
                interactiveConfig: { mode: 'GAP_FILL', hidePercentage: 20, allowSlowSpeed: true },
            }} />,
        );

        const audio = screen.getByLabelText('Phát âm thanh bài nghe') as HTMLAudioElement;
        fireEvent.click(screen.getByRole('button', { name: /Phát đoạn hội thoại của Daniel/i }));
        fireEvent.loadedMetadata(audio);

        expect(audio.currentTime).toBe(6);
        expect(playMock).toHaveBeenCalledTimes(1);
    });
});
