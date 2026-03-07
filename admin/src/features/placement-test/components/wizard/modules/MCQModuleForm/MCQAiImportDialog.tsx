import { useState } from 'react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormItem, FormLabel, FormControl } from '@/components/ui/form';
import { getApiErrorMessage } from '@/lib/api-error';
import { placementTestApi } from '../../../../api/placement-test.api';
import type { AiImportedQuestion } from '../../../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    partNumber: number;
    onClose: () => void;
    onApply: (questions: AiImportedQuestion[], groupPattern: number[] | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractPart7GroupPattern(rawText: string): number[] {
    const lines = rawText
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    for (const line of lines) {
        if (/^[2-7]{4,}$/.test(line)) {
            return line.split('').map((digit) => Number(digit));
        }
    }
    return [];
}

// ─── MCQAiImportDialog ────────────────────────────────────────────────────────

export function MCQAiImportDialog({ open, partNumber, onClose, onApply }: Props) {
    const [aiImportText, setAiImportText] = useState('');
    const [aiImportLoading, setAiImportLoading] = useState(false);
    const [parsedQuestions, setParsedQuestions] = useState<AiImportedQuestion[]>([]);
    const [part7Pattern, setPart7Pattern] = useState<number[] | null>(null);

    function handleOpenChange(value: boolean) {
        if (!value) {
            setParsedQuestions([]);
            setPart7Pattern(null);
            onClose();
        }
    }

    async function handleAnalyze() {
        if (!aiImportText.trim()) {
            toast.error('Vui lòng dán nội dung cần phân tích');
            return;
        }

        setAiImportLoading(true);
        try {
            const data = await placementTestApi.parseMcqContent(
                aiImportText,
                partNumber as 1 | 2 | 3 | 4 | 5 | 6 | 7,
            );

            const questions = data.questionItems ?? [];
            if (questions.length === 0) {
                toast.error('AI không trích xuất được câu hỏi hợp lệ');
                return;
            }

            const responsePattern = data.groupPattern ?? [];
            const rawPattern = extractPart7GroupPattern(aiImportText);
            const selectedPattern = responsePattern.length > 0 ? responsePattern : rawPattern;
            const normalizedPattern = selectedPattern
                .map((v) => Math.max(2, Math.min(7, Number(v))))
                .filter((v) => Number.isFinite(v));

            setPart7Pattern(partNumber === 7 && normalizedPattern.length > 0 ? normalizedPattern : null);
            setParsedQuestions(questions);
            toast.success(`AI đã phân tích ${questions.length} câu`);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Phân tích nội dung thất bại'));
        } finally {
            setAiImportLoading(false);
        }
    }

    function handleApply() {
        if (parsedQuestions.length === 0) return;
        onApply(parsedQuestions, part7Pattern);
        setParsedQuestions([]);
        setPart7Pattern(null);
        setAiImportText('');
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>AI phân tích &amp; nạp câu hỏi Part {partNumber}</DialogTitle>
                    <DialogDescription>
                        Dán nội dung câu hỏi + đáp án (nếu có). AI sẽ trả JSON chuẩn để bạn duyệt trước khi nạp vào Part đang chọn.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    <FormItem>
                        <FormLabel>Nội dung nguồn</FormLabel>
                        <FormControl>
                            <Textarea
                                rows={12}
                                placeholder="Dán nội dung câu hỏi vào đây..."
                                value={aiImportText}
                                onChange={(event) => setAiImportText(event.target.value)}
                            />
                        </FormControl>
                    </FormItem>

                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {parsedQuestions.length > 0
                                ? `AI trích xuất ${parsedQuestions.length} câu. Hãy kiểm tra trước khi nạp.`
                                : 'Chưa có kết quả phân tích.'}
                        </p>
                        <Button type="button" onClick={handleAnalyze} disabled={aiImportLoading}>
                            {aiImportLoading ? 'Đang phân tích...' : 'Phân tích'}
                        </Button>
                    </div>

                    {part7Pattern && part7Pattern.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                            Pattern cụm Part 7: <span className="font-mono">{part7Pattern.join('')}</span>
                        </p>
                    )}

                    {parsedQuestions.length > 0 && (
                        <div className="rounded-lg border p-3 bg-muted/10 space-y-2 max-h-64 overflow-y-auto">
                            {parsedQuestions.slice(0, 8).map((item, index) => (
                                <div key={`${item.question}-${index}`} className="text-sm">
                                    <p className="font-medium">{index + 1}. {item.question}</p>
                                    <p className="text-muted-foreground">Đáp án đúng: {item.correctOption}</p>
                                </div>
                            ))}
                            {parsedQuestions.length > 8 && (
                                <p className="text-xs text-muted-foreground italic">
                                    ... và {parsedQuestions.length - 8} câu nữa
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            setParsedQuestions([]);
                            onClose();
                        }}
                    >
                        Hủy
                    </Button>
                    <Button
                        type="button"
                        onClick={handleApply}
                        disabled={parsedQuestions.length === 0}
                    >
                        Chấp nhận &amp; nạp
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
