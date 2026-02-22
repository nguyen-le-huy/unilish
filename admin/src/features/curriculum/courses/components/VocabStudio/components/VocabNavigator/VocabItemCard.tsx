import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Volume2, Image as ImageIcon } from 'lucide-react';
import type { VocabItem } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VocabItemCardProps {
    item: VocabItem;
    isSelected: boolean;
    index: number;
    onSelect: (id: string) => void;
}

// ─── Sub-component ────────────────────────────────────────────────────────────

export const VocabItemCard = memo(function VocabItemCard({
    item,
    isSelected,
    index,
    onSelect,
}: VocabItemCardProps) {
    const hasAudio = !!item.audioWordUrl;
    const hasImage = !!item.imageUrl;

    return (
        <button
            type="button"
            className={cn(
                'w-full text-left rounded-lg border px-3 py-2.5 transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isSelected && 'border-primary bg-primary/5 font-medium',
            )}
            onClick={() => onSelect(item.id)}
            aria-selected={isSelected}
            aria-label={`Từ ${index + 1}: ${item.word}`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground tabular-nums w-4 shrink-0">
                            {index + 1}.
                        </span>
                        <span className="truncate text-sm font-medium">{item.word}</span>
                        {item.ipa && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                                /{item.ipa}/
                            </span>
                        )}
                    </div>
                    <p className="mt-0.5 truncate pl-5 text-xs text-muted-foreground">
                        {item.definitionNative || item.definitionEn}
                    </p>
                </div>

                {/* Media indicators */}
                <div className="flex shrink-0 items-center gap-1">
                    {hasAudio && (
                        <Volume2
                            className="h-3 w-3 text-green-500"
                            aria-label="Có âm thanh"
                        />
                    )}
                    {hasImage && (
                        <ImageIcon
                            className="h-3 w-3 text-blue-500"
                            aria-label="Có hình ảnh"
                        />
                    )}
                </div>
            </div>
        </button>
    );
});
