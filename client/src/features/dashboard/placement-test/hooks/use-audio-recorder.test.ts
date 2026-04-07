// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAudioRecorder } from './use-audio-recorder';

class MockMediaRecorder {
    public state: RecordingState = 'inactive';
    public ondataavailable: ((event: BlobEvent) => void) | null = null;
    public onstop: (() => void) | null = null;

    constructor(_stream: MediaStream, _options?: MediaRecorderOptions) {}

    start(): void {
        this.state = 'recording';

        const audioBlob = new Blob(['audio-bytes'], { type: 'audio/webm' });
        const event = { data: audioBlob } as BlobEvent;
        this.ondataavailable?.(event);
    }

    stop(): void {
        this.state = 'inactive';
        this.onstop?.();
    }
}

describe('useAudioRecorder', () => {
    const trackStop = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        Object.defineProperty(window, 'MediaRecorder', {
            writable: true,
            value: MockMediaRecorder,
        });

        Object.defineProperty(navigator, 'mediaDevices', {
            writable: true,
            value: {
                getUserMedia: vi.fn(async () => ({
                    getTracks: () => [{ stop: trackStop }],
                })),
            },
        });
    });

    it('sets permission state to granted when microphone permission is allowed', async () => {
        const { result } = renderHook(() => useAudioRecorder());

        await act(async () => {
            const allowed = await result.current.requestPermission();
            expect(allowed).toBe(true);
        });

        expect(result.current.permissionState).toBe('granted');
        expect(trackStop).toHaveBeenCalled();
    });

    it('records and returns audio blob on stop', async () => {
        const { result } = renderHook(() => useAudioRecorder());

        await act(async () => {
            await result.current.startRecording();
        });

        expect(result.current.isRecording).toBe(true);

        let blob: Blob | null = null;
        await act(async () => {
            blob = await result.current.stopRecording();
        });

        expect(result.current.isRecording).toBe(false);
        expect(blob).toBeInstanceOf(Blob);
        expect(blob).not.toBeNull();
    });
});
