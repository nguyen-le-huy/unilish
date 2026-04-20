import { memo, useState } from 'react';
import {
    BookCopy,
    Loader2,
    Sparkles,
    Wand2,
} from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    isVocabGenerating: boolean;
    onGenerateVocab: (config: { wordCount: number; wordList?: string[] }) => Promise<boolean>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AiAssistantSheet = memo(function AiAssistantSheet({
    isVocabGenerating,
    onGenerateVocab,
}: Props) {
    // ── Vocab gen state ──────────────────────────────────────────────────────
    const [isOpen, setIsOpen] = useState(false);
    const [wordCount, setWordCount] = useState(10);
    const [rawWordList, setRawWordList] = useState('');

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleGenerateVocab = async () => {
        const wordList = rawWordList
            .split(/[\n,]+/)
            .map((w) => w.trim())
            .filter(Boolean);

        const isSuccess = await onGenerateVocab({
            wordCount: wordList.length > 0 ? wordList.length : wordCount,
            wordList: wordList.length > 0 ? wordList : undefined,
        });

        if (isSuccess) {
            setIsOpen(false);
            setWordCount(10);
            setRawWordList('');
        }
    };

    const customWords = rawWordList
        .split(/[\n,]+/)
        .map((w) => w.trim())
        .filter(Boolean);

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    aria-label="Mở trợ lý AI"
                >
                    <Sparkles className="h-3.5 w-3.5 text-purple-500" aria-hidden="true" />
                    Trợ lý AI
                </Button>
            </SheetTrigger>

            <SheetContent side="right" className="flex w-[340px] flex-col overflow-y-auto sm:w-[380px]">
                <SheetHeader className="shrink-0">
                    <SheetTitle className="flex items-center gap-2 text-base">
                        <Sparkles className="h-4 w-4 text-purple-500" aria-hidden="true" />
                        Trợ lý AI
                    </SheetTitle>
                </SheetHeader>

                <div className="mt-4 flex flex-1 flex-col gap-6">
                    {/* ── Section 1: Vocab Generation ────────────────────────── */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <BookCopy
                                className="h-4 w-4 shrink-0 text-muted-foreground"
                                aria-hidden="true"
                            />
                            <span className="text-sm font-semibold">Tạo từ vựng AI</span>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            GPT sẽ tạo từ vựng dựa trên ngữ cảnh của unit. Nhập danh sách từ tùy
                            chỉnh hoặc để AI chọn.
                        </p>

                        {/* Word Count Slider */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs">Số lượng từ</Label>
                                <span className="text-sm font-medium text-primary tabular-nums">
                                    {customWords.length > 0 ? customWords.length : wordCount}
                                </span>
                            </div>
                            <Slider
                                min={3}
                                max={20}
                                step={1}
                                value={[wordCount]}
                                onValueChange={([v = 10]) => setWordCount(v)}
                                disabled={customWords.length > 0 || isVocabGenerating}
                                aria-label="Số lượng từ"
                            />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>3</span>
                                <span>20</span>
                            </div>
                        </div>

                        {/* Custom Word List */}
                        <div className="space-y-1.5">
                            <Label htmlFor="ai-word-list" className="text-xs">
                                Danh sách từ tùy chỉnh{' '}
                                <span className="font-normal text-muted-foreground">(tuỳ chọn)</span>
                            </Label>
                            <Textarea
                                id="ai-word-list"
                                placeholder={'airport, passport, departure\ncheck-in, boarding pass'}
                                value={rawWordList}
                                onChange={(e) => setRawWordList(e.target.value)}
                                rows={4}
                                className="resize-none text-xs"
                                disabled={isVocabGenerating}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Mỗi từ trên một dòng hoặc phân cách bằng dấu phẩy.
                                {customWords.length > 0 && (
                                    <> Đã nhận <strong>{customWords.length}</strong> từ.</>
                                )}
                            </p>
                        </div>

                        <Button
                            className="w-full gap-2"
                            onClick={handleGenerateVocab}
                            disabled={isVocabGenerating}
                        >
                            {isVocabGenerating ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <Wand2 className="h-4 w-4" aria-hidden="true" />
                            )}
                            {isVocabGenerating ? 'Đang tạo từ vựng…' : 'Tạo từ vựng'}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
});
