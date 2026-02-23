import { memo, useRef } from 'react';
import { RefreshCw, Upload, ImageIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AudioPlayerMini } from '../../AudioPlayerMini/AudioPlayerMini';
import type { VocabItem } from '../../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    item: VocabItem;
    isRegeneratingWord: boolean;
    isRegeneratingSentence: boolean;
    onRegenerateAudio: (target: 'word' | 'sentence') => void;
    /** Called with the selected File when Admin uploads a replacement image. */
    onImageUpload: (file: File) => void;
}

// ─── SubComponent: AudioRow ───────────────────────────────────────────────────

interface AudioRowProps {
    src: string | null;
    label: string;
    ariaLabel: string;
    isRegenerating: boolean;
    onRegenerate: () => void;
}

const AudioRow = memo(function AudioRow({
    src,
    label,
    ariaLabel,
    isRegenerating,
    onRegenerate,
}: AudioRowProps) {
    return (
        <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <AudioPlayerMini src={src} label={label} />
            <span className="flex-1 truncate text-xs text-muted-foreground">
                {src ? src.split('/').pop() : 'Chưa có file âm thanh'}
            </span>
            {src && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                    TTS
                </Badge>
            )}
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        disabled={isRegenerating}
                        onClick={onRegenerate}
                        aria-label={ariaLabel}
                    >
                        <RefreshCw
                            className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
                            aria-hidden="true"
                        />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{ariaLabel}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
});

// ─── Component ────────────────────────────────────────────────────────────────

export const MultimediaBlock = memo(function MultimediaBlock({
    item,
    isRegeneratingWord,
    isRegeneratingSentence,
    onRegenerateAudio,
    onImageUpload,
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onImageUpload(file);
            // Reset input so the same file can be re-selected if needed
            e.target.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Đa phương tiện
            </h4>

            {/* Word Audio */}
            <div className="space-y-1.5">
                <Label>Âm thanh từ vựng</Label>
                <AudioRow
                    src={item.audioWordUrl}
                    label="Phát âm từ"
                    ariaLabel="Tạo lại âm thanh từ"
                    isRegenerating={isRegeneratingWord}
                    onRegenerate={() => onRegenerateAudio('word')}
                />
            </div>

            {/* Sentence Audio */}
            <div className="space-y-1.5">
                <Label>Âm thanh câu ví dụ</Label>
                <AudioRow
                    src={item.audioSentenceUrl}
                    label="Phát âm câu"
                    ariaLabel="Tạo lại âm thanh câu"
                    isRegenerating={isRegeneratingSentence}
                    onRegenerate={() => onRegenerateAudio('sentence')}
                />
            </div>

            {/* Image */}
            <div className="space-y-1.5">
                <Label>Hình ảnh minh họa</Label>
                <div className="overflow-hidden rounded-md border bg-muted/20">
                    {item.imageUrl ? (
                        <div className="relative">
                            <img
                                src={item.imageUrl}
                                alt={`Minh họa cho ${item.word}`}
                                className="h-36 w-full object-cover"
                            />
                            <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-black/40 p-2">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => fileInputRef.current?.click()}
                                    aria-label="Thay thế hình ảnh"
                                >
                                    <Upload className="mr-1.5 h-3 w-3" aria-hidden="true" />
                                    Thay thế
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex h-24 w-full flex-col items-center justify-center gap-1.5 text-muted-foreground hover:bg-muted/40 transition-colors"
                            aria-label="Tải lên hình ảnh"
                        >
                            <ImageIcon className="h-6 w-6 opacity-40" aria-hidden="true" />
                            <span className="text-xs">Nhấn để tải ảnh lên</span>
                        </button>
                    )}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden="true"
                        onChange={handleFileChange}
                    />
                </div>
            </div>
        </div>
    );
});
