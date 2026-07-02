// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { env } from '@/config/env';
import type { LearnerVocabContent } from './renderer.types';
import VocabRenderer from './VocabRenderer';

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

    play = vi.fn(async () => {
        return undefined;
    });
}

const content: LearnerVocabContent = {
    type: 'VOCAB',
    scenario: 'Travel vocabulary',
    items: [
        {
            id: 'v-1',
            word: 'nomination',
            partOfSpeech: 'n',
            ipa: '/ˌnɒm.ɪˈneɪ.ʃən/',
            definitionNative: 'sự đề cử/sự bổ nhiệm',
            definitionEn: 'the state of being suggested for something',
            exampleSentence: 'Membership of the club is by nomination only.',
            exampleTranslation: 'Tư cách thành viên của câu lạc bộ chỉ bằng đề cử.',
            audioWordUrl: 'https://bucket.r2.dev/audio/vocab/nomination-word.mp3',
            audioSentenceUrl: 'https://bucket.r2.dev/audio/vocab/nomination-example.mp3',
            imageUrl: 'https://example.com/image.jpg',
        },
    ],
};

describe('VocabRenderer', () => {
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    MockAudio.created = [];
});

    it('renders the vocab card layout and hides the scenario context line', () => {
        render(<VocabRenderer content={content} />);

        expect(screen.queryByText('Travel vocabulary')).toBeNull();
        expect(screen.getByText('nomination')).not.toBeNull();
        expect(screen.getByText('/ˌnɒm.ɪˈneɪ.ʃən/')).not.toBeNull();
        expect(screen.getByText('(n)')).not.toBeNull();
        expect(screen.getByText('Định nghĩa:')).not.toBeNull();
        expect(screen.getByText('Ví dụ:')).not.toBeNull();
        expect(screen.getByAltText('nomination')).not.toBeNull();
    });

    it('plays audio through the API proxy first', async () => {
        vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);

        render(<VocabRenderer content={content} />);

        fireEvent.click(screen.getAllByRole('button', { name: 'Phát âm từ nomination' })[0] as HTMLElement);

        await waitFor(() => {
            expect(MockAudio.created).toHaveLength(1);
        });

        expect(MockAudio.created[0]?.src).toBe(`${env.API_URL}/audio/audio/vocab/nomination-word.mp3`);
        expect(MockAudio.created[0]?.play).toHaveBeenCalledTimes(1);
    });
});
