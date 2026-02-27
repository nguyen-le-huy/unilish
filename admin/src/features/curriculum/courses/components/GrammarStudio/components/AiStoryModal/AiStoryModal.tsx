import { memo, useState, useCallback } from 'react';
import { Sparkles, Loader2, RotateCcw, CheckCheck, ChevronRight } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import type {
    GenerateGrammarStoryResponse,
} from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalStep = 'config' | 'loading' | 'preview';

interface Props {
    open: boolean;
    isGenerating: boolean;
    onClose: () => void;
    onGenerate: (grammarName: string, selectedVocab: string[]) => void;
    generatedData: GenerateGrammarStoryResponse | null;
    onConfirm: (data: GenerateGrammarStoryResponse) => void;
}

// ─── Loading messages ─────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
    'Đang phân tích ngữ cảnh unit…',
    'Đang viết câu chuyện ngữ cảnh…',
    'Đang bóc tách từ nổi bật…',
    'Đang xây dựng quy tắc ngữ pháp…',
    'Đang hoàn thiện nội dung…',
];

// ─── Component ────────────────────────────────────────────────────────────────

export const AiStoryModal = memo(function AiStoryModal({
    open,
    isGenerating,
    onClose,
    onGenerate,
    generatedData,
    onConfirm,
}: Props) {
    // ── Config Step State ────────────────────────────────────────────────────
    const [grammarName, setGrammarName] = useState('');
    const [rawVocabList, setRawVocabList] = useState('');
    const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
    const [step, setStep] = useState<ModalStep>('config');

    // ── Derived: progress ────────────────────────────────────────────────────
    const progressValue =
        step === 'loading'
            ? Math.min(((loadingMsgIndex + 1) / LOADING_MESSAGES.length) * 85, 85)
            : step === 'preview'
              ? 100
              : 0;

    // ── Handlers ─────────────────────────────────────────────────────────────

    const handleGenerate = useCallback(() => {
        const vocab = rawVocabList
            .split(/[\n,]+/)
            .map((w) => w.trim())
            .filter(Boolean);

        setStep('loading');
        setLoadingMsgIndex(0);

        // Cycle through loading messages every 1.5 s for UX feel
        let idx = 0;
        const interval = setInterval(() => {
            idx++;
            if (idx < LOADING_MESSAGES.length) {
                setLoadingMsgIndex(idx);
            } else {
                clearInterval(interval);
            }
        }, 1500);

        onGenerate(grammarName.trim(), vocab);
    }, [grammarName, rawVocabList, onGenerate]);

    // Advance to preview when data arrives (parent sets generatedData after mutation)
    const prevStep = step;
    if (prevStep === 'loading' && generatedData && !isGenerating) {
        setStep('preview');
    }

    const handleConfirm = useCallback(() => {
        if (!generatedData) return;
        onConfirm(generatedData);
        handleReset();
        onClose();
    }, [generatedData, onConfirm, onClose]);

    const handleRetry = useCallback(() => {
        setStep('config');
    }, []);

    const handleReset = useCallback(() => {
        setGrammarName('');
        setRawVocabList('');
        setLoadingMsgIndex(0);
        setStep('config');
    }, []);

    const handleClose = useCallback(() => {
        if (isGenerating) return; // block close during generation
        handleReset();
        onClose();
    }, [isGenerating, handleReset, onClose]);

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-500" aria-hidden="true" />
                        Trợ lý AI — Tạo câu chuyện ngữ pháp
                    </DialogTitle>
                    <DialogDescription>
                        AI sẽ viết câu chuyện ngữ cảnh phù hợp điểm ngữ pháp và từ vựng của unit.
                    </DialogDescription>
                </DialogHeader>

                {/* ── Step 1: Config ──────────────────────────────────────── */}
                {step === 'config' && (
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="grammar-name">
                                Tên điểm ngữ pháp{' '}
                                <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="grammar-name"
                                placeholder="Past Simple, Present Perfect, …"
                                value={grammarName}
                                onChange={(e) => setGrammarName(e.target.value)}
                                aria-required="true"
                                autoFocus
                            />
                            <p className="text-xs text-muted-foreground">
                                AI sẽ dùng tên này để đặt trọng tâm câu chuyện.
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="vocab-list">
                                Từ vựng cần xuất hiện trong truyện{' '}
                                <span className="font-normal text-muted-foreground">(tuỳ chọn)</span>
                            </Label>
                            <Textarea
                                id="vocab-list"
                                placeholder="Nhập từng từ trên một dòng hoặc phân cách bằng dấu phẩy&#10;Ví dụ: airport, passport, departure"
                                value={rawVocabList}
                                onChange={(e) => setRawVocabList(e.target.value)}
                                rows={4}
                                className="resize-none text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                                AI sẽ cố gắng tích hợp các từ vựng này vào câu chuyện ngữ cảnh.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Step 2: Loading ─────────────────────────────────────── */}
                {step === 'loading' && (
                    <div className="flex flex-col items-center gap-5 py-6">
                        <Loader2
                            className="h-10 w-10 animate-spin text-primary"
                            aria-hidden="true"
                        />
                        <div className="w-full space-y-2">
                            <Progress value={progressValue} className="h-1.5" aria-label="Tiến độ tạo nội dung" />
                            <p
                                className="text-center text-sm text-muted-foreground"
                                aria-live="polite"
                                aria-atomic="true"
                            >
                                {LOADING_MESSAGES[loadingMsgIndex]}
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Quá trình này thường mất 5 – 15 giây…
                        </p>
                    </div>
                )}

                {/* ── Step 3: Preview ─────────────────────────────────────── */}
                {step === 'preview' && generatedData && (
                    <ScrollArea className="max-h-96 pr-1">
                        <div className="space-y-4 py-2">
                            {/* Story preview */}
                            <div className="space-y-1.5">
                                <p className="text-sm font-semibold">🧭 Hero Hook</p>
                                <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed">
                                    {generatedData.hero.hook}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <p className="text-sm font-semibold">🧩 Blocks</p>
                                <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                                    Tổng số block: {generatedData.blocks.length}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter className="gap-2">
                    {step === 'config' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleClose}
                                aria-label="Đóng modal"
                            >
                                Huỷ
                            </Button>
                            <Button
                                onClick={handleGenerate}
                                disabled={!grammarName.trim() || isGenerating}
                                aria-label="Bắt đầu tạo nội dung bằng AI"
                            >
                                <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                Tạo với AI
                                <ChevronRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                        </>
                    )}

                    {step === 'loading' && (
                        <Button variant="outline" disabled>
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                            Đang tạo…
                        </Button>
                    )}

                    {step === 'preview' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={handleRetry}
                                aria-label="Tạo lại nội dung"
                            >
                                <RotateCcw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                Tạo lại
                            </Button>
                            <Button
                                onClick={handleConfirm}
                                aria-label="Áp dụng nội dung đã tạo vào form"
                            >
                                <CheckCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                                Áp dụng
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

