// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { VocabPronunciationPractice } from './VocabPronunciationPractice';

const { scoreBlobMock } = vi.hoisted(() => ({ scoreBlobMock: vi.fn() }));

vi.mock('@/features/dashboard/shadowing', async () => {
    const React = await import('react');

    return {
        useShadowingRecorder: () => {
            const [isRecording, setIsRecording] = React.useState(false);
            return {
                isRecording,
                startRecording: async () => setIsRecording(true),
                stopRecording: async () => {
                    setIsRecording(false);
                    return new Blob(['audio'], { type: 'audio/webm' });
                },
            };
        },
        useAzurePronunciation: () => ({
            scoreBlob: scoreBlobMock,
            isScoring: false,
            error: null,
            clearError: vi.fn(),
        }),
    };
});

describe('VocabPronunciationPractice', () => {
    it('records the word and shows the Azure score', async () => {
        scoreBlobMock.mockResolvedValueOnce({
            overallScore: 92,
            words: [{ word: 'hello', accuracyScore: 92, errorType: 'None' }],
        });

        render(<VocabPronunciationPractice word="hello" />);

        fireEvent.click(screen.getByRole('button', { name: 'Luyện phát âm từ hello' }));
        expect(await screen.findByRole('button', { name: 'Dừng ghi âm và chấm từ hello' })).not.toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Dừng ghi âm và chấm từ hello' }));

        await waitFor(() => expect(scoreBlobMock).toHaveBeenCalledWith(expect.any(Blob), 'hello'));
        expect(await screen.findByText('92')).not.toBeNull();
        expect(screen.getByText('Phát âm rất tốt!')).not.toBeNull();
        expect(screen.getByText('Azure không phát hiện lỗi nổi bật.')).not.toBeNull();
    });
});
