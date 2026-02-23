import { memo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateReadingQuestionsConfig {
    count: number;
    types: string[]; // empty = all types
}

interface Props {
    open: boolean;
    isGenerating: boolean;
    onClose: () => void;
    onGenerate: (config: GenerateReadingQuestionsConfig) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTION_TYPES = [
    { value: 'FILL_IN_BLANK',   label: 'Điền từ vào chỗ trống',   description: 'Từ bị che trong câu' },
    { value: 'MULTIPLE_CHOICE', label: 'Trắc nghiệm',              description: 'Chọn đáp án đúng' },
    { value: 'TRUE_FALSE',      label: 'Đúng / Sai',               description: 'Đánh giá tính đúng sai' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export const ReadingGenerateQuestionsModal = memo(function ReadingGenerateQuestionsModal({
    open,
    isGenerating,
    onClose,
    onGenerate,
}: Props) {
    const [count, setCount] = useState(5);
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

    const toggleType = (value: string) => {
        setSelectedTypes((prev) =>
            prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value],
        );
    };

    const handleGenerate = () => {
        onGenerate({ count, types: selectedTypes });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Tạo câu hỏi đọc hiểu
                    </DialogTitle>
                    <DialogDescription>
                        AI sẽ tự động tạo câu hỏi comprehension dựa trên nội dung bài đọc.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Count Slider */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Số câu hỏi</Label>
                            <span className="tabular-nums text-sm font-semibold text-primary">
                                {count} câu
                            </span>
                        </div>
                        <Slider
                            min={1}
                            max={10}
                            step={1}
                            value={[count]}
                            onValueChange={([v]) => setCount(v ?? 5)}
                            aria-label="Số câu hỏi cần tạo"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1</span>
                            <span>10</span>
                        </div>
                    </div>

                    {/* Question Types */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Loại câu hỏi{' '}
                            <span className="font-normal text-muted-foreground">(bỏ trống = tất cả)</span>
                        </Label>
                        <div className="space-y-2.5">
                            {QUESTION_TYPES.map(({ value, label, description }) => {
                                const checked = selectedTypes.includes(value);
                                return (
                                    <label
                                        key={value}
                                        className="flex cursor-pointer items-start gap-3 rounded-md border p-2.5 hover:bg-muted/50"
                                        htmlFor={`reading-qtype-${value}`}
                                    >
                                        <Checkbox
                                            id={`reading-qtype-${value}`}
                                            checked={checked}
                                            onCheckedChange={() => toggleType(value)}
                                            className="mt-0.5 shrink-0"
                                            aria-label={label}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium leading-none">{label}</p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {description}
                                            </p>
                                        </div>
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        disabled={isGenerating}
                    >
                        Huỷ
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        aria-label="Bắt đầu tạo câu hỏi"
                    >
                        {isGenerating ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Tạo câu hỏi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
