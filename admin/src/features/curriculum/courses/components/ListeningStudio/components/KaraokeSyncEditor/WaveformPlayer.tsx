import { memo, useRef, useCallback, useState, useEffect } from 'react';
import { Play, Pause, AlertCircle, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    audioUrl: string;
    onTimeUpdate?: (currentTime: number) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Relative paths like /api/... must be resolved against the server origin, not
// the admin app's dev-server origin (they run on different ports).
const API_ORIGIN = new URL(
    import.meta.env.VITE_API_URL as string || 'http://localhost:5432/api',
).origin; // e.g. 'http://localhost:5432'

function resolveAudioUrl(url: string): string {
    if (!url) return url;
    // Legacy format stored when R2_PUBLIC_DOMAIN was unset:
    // /audio/listening/<lessonId>/dialogue.mp3 → rewrite to proxy endpoint
    const r2Match = url.match(/^\/audio\/listening\/([^/]+)\/dialogue\.mp3$/);
    if (r2Match) {
        return `${API_ORIGIN}/api/curriculum/lessons/${r2Match[1]}/listening/audio`;
    }
    // New format: /api/curriculum/lessons/<id>/listening/audio
    return url.startsWith('/') ? `${API_ORIGIN}${url}` : url;
}

// ─── Component ────────────────────────────────────────────────────────────────
// Native audio-based player.

export const WaveformPlayer = memo(function WaveformPlayer({ audioUrl, onTimeUpdate }: Props) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const handlePlayPause = useCallback(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;

        if (audioEl.paused) {
            audioEl
                .play()
                .then(() => {
                    setIsPlaying(true);
                })
                .catch(() => {
                    setLoadError('Không thể phát audio. Hãy kiểm tra file đã được tạo.');
                });
            return;
        }

        audioEl.pause();
        setIsPlaying(false);
    }, []);

    const handleAudioError = useCallback(() => {
        setIsPlaying(false);
        setLoadError('File audio chưa được tạo. Hãy chạy "Mix Audio & Sync" trước.');
    }, []);

    const handleLoaded = useCallback(() => {
        setLoadError(null);
    }, []);

    const handleTimeUpdate = useCallback(() => {
        const audioEl = audioRef.current;
        if (!audioEl) return;
        onTimeUpdate?.(audioEl.currentTime);
    }, [onTimeUpdate]);

    useEffect(() => {
        return () => {
            const audioEl = audioRef.current;
            if (!audioEl) return;
            audioEl.pause();
            audioEl.removeAttribute('src');
            audioEl.load();
        };
    }, []);

    return (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 p-3">
            {loadError && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{loadError}</span>
                </div>
            )}

            <div className="flex items-center gap-3">
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={handlePlayPause}
                    aria-label={isPlaying ? 'Tạm dừng' : 'Phát'}
                    className="h-8 w-8 shrink-0"
                >
                    {isPlaying ? (
                        <Pause className="h-4 w-4" aria-hidden="true" />
                    ) : (
                        <Play className="h-4 w-4" aria-hidden="true" />
                    )}
                </Button>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <audio
                        ref={audioRef}
                        className="w-full"
                        preload="none"
                        src={resolveAudioUrl(audioUrl)}
                        onError={handleAudioError}
                        onLoadedData={handleLoaded}
                        onEnded={() => setIsPlaying(false)}
                        onPause={() => setIsPlaying(false)}
                        onPlay={() => setIsPlaying(true)}
                        onTimeUpdate={handleTimeUpdate}
                        controls
                        aria-label="Audio player của bài nghe"
                    />
                </div>
            </div>

            <div className="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                Chế độ đơn giản: dùng audio player mặc định.
            </div>
        </div>
    );
});
