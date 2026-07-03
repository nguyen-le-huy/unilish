// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import ListeningRenderer from './ListeningRenderer';

beforeAll(() => {
    Element.prototype.scrollIntoView = vi.fn();
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
});
