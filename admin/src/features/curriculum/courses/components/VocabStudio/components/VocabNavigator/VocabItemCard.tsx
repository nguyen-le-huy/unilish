import { memo } from 'react';
import { cn } from '@/lib/utils';
import { Volume2, Image as ImageIcon, GripVertical, AlertCircle } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { VocabItem } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VocabItemCardProps {
    item: VocabItem;
    isSelected: boolean;
    index: number;
    /** Validation error flag — drives the red dot indicator. */
    hasError: boolean;
    onSelect: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const VocabItemCard = memo(function VocabItemCard({
    item,
    isSelected,
    index,
    hasError,
    onSelect,
}: VocabItemCardProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : undefined,
    } as React.CSSProperties;

    const hasAudio = !!item.audioWordUrl;
    const hasImage = !!item.imageUrl;

    return (
        <div ref={setNodeRef} style={style}>
            <button
                type="button"
                className={cn(
                    'group w-full text-left rounded-lg border px-2 py-2.5 transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    isSelected && 'border-primary bg-primary/5 font-medium',
                    hasError && 'border-destructive/40',
                )}
                onClick={() => onSelect(item.id)}
                aria-selected={isSelected}
                aria-label={`Từ ${index + 1}: ${item.word}`}
            >
                <div className="flex items-start gap-1">
                    {/* Drag handle */}
                    <span
                        className="mt-0.5 shrink-0 cursor-grab text-muted-foreground/40 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
                        aria-hidden="true"
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                    </span>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground tabular-nums w-4 shrink-0">
                                {index + 1}.
                            </span>
                            <span className="truncate text-sm font-medium">{item.word || <em className="text-muted-foreground">Chưa có từ</em>}</span>
                            {item.ipa && (
                                <span className="shrink-0 text-xs text-muted-foreground font-mono">
                                    /{item.ipa}/
                                </span>
                            )}
                        </div>
                        <p className="mt-0.5 truncate pl-5 text-xs text-muted-foreground">
                            {item.definitionNative || item.definitionEn || '\u00a0'}
                        </p>
                    </div>

                    {/* Status indicators */}
                    <div className="flex shrink-0 items-center gap-1 pt-0.5">
                        {hasError && (
                            <AlertCircle
                                className="h-3 w-3 text-destructive"
                                aria-label="Từ này có lỗi cần sửa"
                            />
                        )}
                        {hasAudio && !hasError && (
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
        </div>
    );
});
