import { memo } from 'react';
import { Save, Loader2, BookText, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonTitle: string;
    isSaving: boolean;
    isGeneratingAudio: boolean;
    onSave: () => void;
    onOpenAiModal: () => void;
    onGenerateAudio: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const GrammarTopBar = memo(function GrammarTopBar({
    lessonTitle,
    isSaving,
    isGeneratingAudio,
    onSave,
    onOpenAiModal,
    onGenerateAudio,
}: Props) {
    const isBusy = isSaving || isGeneratingAudio;

    return (
        <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-2.5">
            {/* Title + icon */}
            <BookText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span
                className="max-w-52 truncate text-sm font-medium"
                title={lessonTitle}
            >
                {lessonTitle}
            </span>

            <Badge variant="secondary" className="shrink-0 text-xs">
                Ngữ pháp
            </Badge>

            <Separator orientation="vertical" className="mx-1 h-5 shrink-0" />

            <div className="ml-auto flex items-center gap-2">
                {/* Generate Grammar Audio */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onGenerateAudio}
                    disabled={isBusy}
                    aria-label="Tạo âm thanh cho câu chuyện ngữ pháp"
                >
                    {isGeneratingAudio ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Volume2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    Tạo âm thanh
                </Button>

                {/* AI Story Generator */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onOpenAiModal}
                    disabled={isBusy}
                    aria-label="Mở trợ lý AI để tạo câu chuyện ngữ cảnh"
                >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                    Trợ lý AI
                </Button>

                {/* Save */}
                <Button
                    size="sm"
                    onClick={onSave}
                    disabled={isSaving}
                    aria-label="Lưu nội dung bài học ngữ pháp"
                >
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
