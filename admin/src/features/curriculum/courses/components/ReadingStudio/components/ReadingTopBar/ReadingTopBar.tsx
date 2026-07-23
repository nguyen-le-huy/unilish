import { memo } from 'react';
import { Save, Loader2, BookOpenText, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonTitle: string;
    isSaving: boolean;
    isGenerating: boolean;
    isGeneratingAudio: boolean;
    onSave: () => void;
    onOpenAiModal: () => void;
    onGenerateAudio: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ReadingTopBar = memo(function ReadingTopBar({
    lessonTitle,
    isSaving,
    isGenerating,
    isGeneratingAudio,
    onSave,
    onOpenAiModal,
    onGenerateAudio,
}: Props) {
    const isBusy = isSaving || isGenerating || isGeneratingAudio;

    return (
        <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-2.5">
            {/* Title + icon */}
            <BookOpenText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span
                className="max-w-52 truncate text-sm font-medium"
                title={lessonTitle}
            >
                {lessonTitle}
            </span>

            <Badge variant="secondary" className="shrink-0 text-xs">
                Đọc hiểu
            </Badge>

            <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

            <div className="ml-auto flex items-center gap-2">
                {/* Generate Audio */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onGenerateAudio}
                    disabled={isBusy}
                    aria-label="Tạo âm thanh narration cho bài đọc"
                >
                    {isGeneratingAudio ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Volume2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Tạo âm thanh
                </Button>

                <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

                {/* AI Generate Passage */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenAiModal}
                    disabled={isBusy}
                    aria-label="Dùng AI để tạo bài đọc"
                >
                    {isGenerating ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Sparkles className="mr-1.5 h-3.5 w-3.5 text-violet-500" aria-hidden="true" />
                    )}
                    AI Viết bài
                </Button>

                {/* Save */}
                <Button
                    size="sm"
                    onClick={onSave}
                    disabled={isBusy}
                    aria-label="Lưu nội dung bài đọc"
                >
                    {isSaving ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Save className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Lưu
                </Button>
            </div>
        </div>
    );
});
