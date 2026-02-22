import { memo, useRef, useState, useCallback } from 'react';
import { Volume2, Square, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Accepts either:
 * - An R2 object key: "audio/vocab/lessonId/item-word.mp3"
 * - A legacy r2.dev URL: "https://unilish.r2.dev/audio/..."
 * Returns a URL routed through the server proxy.
 */
function resolveAudioUrl(src: string): string {
    const apiBase = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5432/api';
    const base = apiBase.replace(/\/api$/, '');

    // Already a proxy URL — return as-is
    if (src.includes('/api/audio/')) return src;

    // Legacy r2.dev full URL — extract the key
    if (src.startsWith('http')) {
        try {
            const url = new URL(src);
            return `${base}/api/audio${url.pathname}`;
        } catch {
            return src;
        }
    }

    // Plain key (new format)
    return `${base}/api/audio/${src}`;
}

interface Props {
    src: string | null;
    label?: string;
    className?: string;
}

type PlayState = 'idle' | 'loading' | 'playing' | 'error';

// ─── Component ────────────────────────────────────────────────────────────────

export const AudioPlayerMini = memo(function AudioPlayerMini({
    src,
    label,
    className = '',
}: Props) {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [state, setState] = useState<PlayState>('idle');

    const resolvedSrc = src ? resolveAudioUrl(src) : null;

    const handleClick = useCallback(() => {
        if (!resolvedSrc || !audioRef.current) return;

        if (state === 'playing') {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setState('idle');
            return;
        }

        setState('loading');
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setState('error'));
    }, [resolvedSrc, state]);

    const icon = {
        idle: <Volume2 className="h-4 w-4" />,
        loading: <Loader2 className="h-4 w-4 animate-spin" />,
        playing: <Square className="h-3.5 w-3.5 fill-current" />,
        error: <AlertCircle className="h-4 w-4 text-destructive" />,
    }[state];

    const tooltipText = !resolvedSrc
        ? 'Chưa có file âm thanh'
        : state === 'playing'
          ? 'Dừng'
          : state === 'error'
            ? 'Lỗi phát âm thanh'
            : `Nghe${label ? ` ${label}` : ''}`;

    return (
        <div className={`flex items-center ${className}`}>
            {resolvedSrc && (
                <audio
                    ref={audioRef}
                    src={resolvedSrc}
                    preload="none"
                    onCanPlay={() => setState((s) => (s === 'loading' ? 'loading' : s))}
                    onPlaying={() => setState('playing')}
                    onEnded={() => setState('idle')}
                    onPause={() => setState((s) => (s === 'playing' ? 'idle' : s))}
                    onError={() => setState('error')}
                />
            )}

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant={state === 'playing' ? 'secondary' : 'ghost'}
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={!resolvedSrc || state === 'loading'}
                        onClick={handleClick}
                        aria-label={tooltipText}
                    >
                        {icon}
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{tooltipText}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
});
