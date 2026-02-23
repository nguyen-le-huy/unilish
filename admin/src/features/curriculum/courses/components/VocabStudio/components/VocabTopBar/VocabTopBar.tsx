import { memo } from 'react';
import { Save, Loader2, BookOpen, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AiAssistantSheet } from '../AiAssistantSheet/AiAssistantSheet';
import { GenerateQuestionsPopover } from '../GenerateQuestionsPopover/GenerateQuestionsPopover';
import { PracticeSheet } from '../PracticeSheet/PracticeSheet';
import type { VocabGenerationStatus } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────────────────

interface Props {
    lessonId: string;
    lessonTitle: string;
    itemCount: number;
    passingScore: number;
    generationStatus: VocabGenerationStatus;
    isSaving: boolean;
    isGeneratingAudio: boolean;
    onSave: () => void;
    onGenerateVocab: (config: { wordCount: number; wordList?: string[] }) => void;
    onGenerateAllAudio: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<VocabGenerationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    IDLE: { label: 'Trống', variant: 'outline' },
    GENERATING: { label: 'Đang tạo…', variant: 'secondary' },
    GENERATING_AUDIO: { label: 'Tạo âm thanh…', variant: 'secondary' },
    DONE: { label: 'Hoàn tất', variant: 'default' },
    ERROR: { label: 'Lỗi', variant: 'destructive' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export const VocabTopBar = memo(function VocabTopBar({
    lessonId,
    lessonTitle,
    itemCount,
    passingScore,
    generationStatus,
    isSaving,
    isGeneratingAudio,
    onSave,
    onGenerateVocab,
    onGenerateAllAudio,
}: Props) {
    const isGenerating =
        generationStatus === 'GENERATING' || generationStatus === 'GENERATING_AUDIO';

    const badge = STATUS_BADGE[generationStatus];

    return (
        <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-2.5">
            {/* Title + icon */}
            <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm font-medium truncate max-w-52" title={lessonTitle}>
                {lessonTitle}
            </span>

            <Badge variant={badge.variant} className="shrink-0 text-xs">
                {badge.label}
            </Badge>

            {itemCount > 0 && (
                <span className="text-xs text-muted-foreground shrink-0">{itemCount} từ</span>
            )}

            <Separator orientation="vertical" className="h-5 mx-1 shrink-0" />

            <div className="ml-auto flex items-center gap-2">
                {/* Generate All Audio */}
                {itemCount > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onGenerateAllAudio}
                        disabled={isGenerating || isGeneratingAudio}
                        aria-label="Tạo âm thanh cho tất cả từ vựng"
                    >
                        {isGeneratingAudio ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                            <Volume2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Tạo âm thanh
                    </Button>
                )}

                {/* AI Assistant Sheet */}
                <AiAssistantSheet
                    isVocabGenerating={isGenerating}
                    onGenerateVocab={onGenerateVocab}
                />

                {/* Generate Questions Popover */}
                <GenerateQuestionsPopover lessonId={lessonId} vocabItemCount={itemCount} />

                {/* Practice Sheet */}
                <PracticeSheet lessonId={lessonId} passingScore={passingScore} />

                {/* Save */}
                <Button size="sm" onClick={onSave} disabled={isSaving}>
                    {isSaving ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isSaving ? 'Đang lưu…' : 'Lưu'}
                </Button>
            </div>
        </div>
    );
});
