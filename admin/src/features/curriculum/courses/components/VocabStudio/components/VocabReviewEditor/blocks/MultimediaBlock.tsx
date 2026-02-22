import { memo } from 'react';
import { RefreshCw } from 'lucide-react';
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
}

// ─── Component ────────────────────────────────────────────────────────────────

export const MultimediaBlock = memo(function MultimediaBlock({
    item,
    isRegeneratingWord,
    isRegeneratingSentence,
    onRegenerateAudio,
}: Props) {
    return (
        <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Đa phương tiện
            </h4>

            {/* Word Audio */}
            <div className="space-y-1.5">
                <Label>Âm thanh từ vựng</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    <AudioPlayerMini src={item.audioWordUrl} label="Phát âm từ" />
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                        {item.audioWordUrl ? item.audioWordUrl.split('/').pop() : 'Chưa có file âm thanh'}
                    </span>
                    {item.audioWordUrl && (
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
                                disabled={isRegeneratingWord}
                                onClick={() => onRegenerateAudio('word')}
                                aria-label="Tạo lại âm thanh từ"
                            >
                                <RefreshCw
                                    className={`h-3.5 w-3.5 ${isRegeneratingWord ? 'animate-spin' : ''}`}
                                    aria-hidden="true"
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Tạo lại âm thanh từ</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>

            {/* Sentence Audio */}
            <div className="space-y-1.5">
                <Label>Âm thanh câu ví dụ</Label>
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
                    <AudioPlayerMini src={item.audioSentenceUrl} label="Phát âm câu" />
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                        {item.audioSentenceUrl
                            ? item.audioSentenceUrl.split('/').pop()
                            : 'Chưa có file âm thanh'}
                    </span>
                    {item.audioSentenceUrl && (
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
                                disabled={isRegeneratingSentence}
                                onClick={() => onRegenerateAudio('sentence')}
                                aria-label="Tạo lại âm thanh câu"
                            >
                                <RefreshCw
                                    className={`h-3.5 w-3.5 ${isRegeneratingSentence ? 'animate-spin' : ''}`}
                                    aria-hidden="true"
                                />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Tạo lại âm thanh câu</p>
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
});
