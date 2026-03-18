import { useCallback, useRef } from 'react';
import { RotateCcw, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { resolveAudioUrl } from '../../../../../lib/audio.utils';
import type { VocabItem } from '../../../../../types/course.types';

interface FlashcardCardProps {
    item: VocabItem;
    isFlipped: boolean;
    onFlip: () => void;
}

export function FlashcardCard({ item, isFlipped, onFlip }: FlashcardCardProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const rawAudioWordUrl = item.audioWordUrl?.trim() ?? '';
    const hasAudio = rawAudioWordUrl.length > 0;
    const resolvedAudioWordUrl = hasAudio ? resolveAudioUrl(rawAudioWordUrl) : '';

    const handlePlayWordAudio = useCallback(() => {
        if (!hasAudio) {
            toast.error('Từ này chưa có audio mẫu.');
            return;
        }

        const audio = audioRef.current;
        if (!audio) {
            return;
        }

        audio.currentTime = 0;
        void audio.play().catch(() => {
            toast.error('Không thể phát audio. Định dạng file có thể không được hỗ trợ.');
        });
    }, [hasAudio]);

    return (
        <div className="w-full [perspective:1000px]">
            <div
                className="relative h-72 w-full transition-transform duration-500 [transform-style:preserve-3d]"
                style={{ transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
            >
                <div className="absolute inset-0 rounded-xl border bg-card p-5 shadow-sm [backface-visibility:hidden]">
                    <div className="flex h-full flex-col">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-3xl font-bold tracking-tight text-foreground">
                                    {item.word || 'Untitled'}
                                </p>
                                <p className="mt-2 text-sm font-mono text-muted-foreground">
                                    {item.ipa ? `/${item.ipa}/` : 'Chưa có IPA'}
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                size="icon"
                                onClick={handlePlayWordAudio}
                                disabled={!hasAudio}
                                aria-label="Phát âm mẫu"
                            >
                                <Volume2 className="h-4 w-4" aria-hidden="true" />
                            </Button>
                        </div>

                        <div className="mt-auto flex items-center justify-between border-t pt-3">
                            <span className="text-xs text-muted-foreground">
                                Nhấn lật thẻ để xem nghĩa
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                                onClick={onFlip}
                                aria-label="Lật thẻ từ vựng"
                            >
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                Lật
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="absolute inset-0 rounded-xl border bg-card p-5 shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)]">
                    <div className="flex h-full flex-col gap-3">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Định nghĩa tiếng Việt
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                                {item.definitionNative || 'Chưa có nội dung'}
                            </p>
                        </div>

                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Definition (English)
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                                {item.definitionEn || 'No definition'}
                            </p>
                        </div>

                        <div className="rounded-md border bg-muted/30 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Ví dụ
                            </p>
                            <p className="mt-1 text-sm text-foreground">
                                {item.exampleSentence || 'No example sentence'}
                            </p>
                        </div>

                        <div className="mt-auto flex justify-end">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5"
                                onClick={onFlip}
                                aria-label="Lật về mặt trước"
                            >
                                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                                Lật lại
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {hasAudio && <audio ref={audioRef} src={resolvedAudioWordUrl} preload="none" />}
        </div>
    );
}
