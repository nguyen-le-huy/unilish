import { memo, useState, useCallback, Component, type ReactNode } from 'react';
import { useWatch, useFormContext } from 'react-hook-form';
import { AudioLines } from 'lucide-react';
import { WaveformPlayer } from './WaveformPlayer';
import { InteractiveTranscript } from './InteractiveTranscript';
import type { ListeningLessonFormValues } from '../../../../types/course.types';

interface WaveformErrorBoundaryProps {
    children: ReactNode;
}

interface WaveformErrorBoundaryState {
    hasError: boolean;
}

class WaveformErrorBoundary extends Component<WaveformErrorBoundaryProps, WaveformErrorBoundaryState> {
    state: WaveformErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): WaveformErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(): void {
        // no-op: keep fallback UI minimal for admin workflow
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    Không thể khởi tạo audio player. Vui lòng tải lại trang.
                </div>
            );
        }

        return this.props.children;
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const KaraokeSyncEditor = memo(function KaraokeSyncEditor() {
    const { control } = useFormContext<ListeningLessonFormValues>();

    const audioUrl = useWatch({ control, name: 'media.audioUrl' });
    const transcript = useWatch({ control, name: 'transcript' });

    const [currentTime, setCurrentTime] = useState(0);

    const handleTimeUpdate = useCallback((time: number) => {
        setCurrentTime(time);
    }, []);

    // ── Empty state ───────────────────────────────────────────────────────────
    if (!audioUrl) {
        return (
            <div className="flex min-h-[400px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed bg-muted/10 p-8 text-center">
                <AudioLines className="h-10 w-10 text-muted-foreground/40" aria-hidden="true" />
                <p className="text-sm font-medium text-muted-foreground">
                    Chưa có file audio
                </p>
                <p className="max-w-xs text-xs text-muted-foreground/70">
                    Nhập đường dẫn audio hoặc chạy pipeline "Mix Audio &amp; Sync" để
                    tự động tạo và đồng bộ transcript.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            {/* Waveform player */}
            <WaveformErrorBoundary>
                <WaveformPlayer audioUrl={audioUrl} onTimeUpdate={handleTimeUpdate} />
            </WaveformErrorBoundary>

            {/* Karaoke transcript — word-level highlighting */}
            <div className="rounded-lg border bg-card">
                <div className="border-b px-4 py-2.5">
                    <h3 className="text-sm font-medium">Karaoke Transcript</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Nhấp vào từ để đánh dấu làm từ mục tiêu. Từ được tô sáng khi phát.
                    </p>
                </div>
                <div className="p-4">
                    <InteractiveTranscript
                        lines={transcript ?? []}
                        currentTime={currentTime}
                    />
                </div>
            </div>
        </div>
    );
});
