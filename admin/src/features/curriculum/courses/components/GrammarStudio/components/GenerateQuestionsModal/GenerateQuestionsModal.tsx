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

export interface GenerateQuestionsConfig {
    count: number;
    types: string[]; // empty = all
}

interface Props {
    open: boolean;
    isGenerating: boolean;
    onClose: () => void;
    onGenerate: (config: GenerateQuestionsConfig) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const QUESTION_TYPES = [
    { value: 'FILL_IN_BLANK',    label: 'Điền từ vào chỗ trống',  description: 'Từ bị che dựa trên câu chuyện' },
    { value: 'MULTIPLE_CHOICE',  label: 'Trắc nghiệm',             description: 'Chọn câu đúng theo cấu trúc' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export const GenerateQuestionsModal = memo(function GenerateQuestionsModal({
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
                        Tạo câu hỏi luyện tập
                    </DialogTitle>
                    <DialogDescription>
                        AI sẽ tự động tạo câu hỏi dựa trên câu chuyện và quy tắc ngữ pháp của bài học.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Count slider */}
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
                            onValueChange={([v]) => setCount(v)}
                            aria-label="Số câu hỏi cần tạo"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1</span>
                            <span>10</span>
                        </div>
                    </div>

                    {/* Type selection */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">
                            Loại câu hỏi{' '}
                            <span className="font-normal text-muted-foreground">(để trống = tất cả)</span>
                        </Label>
                        <div className="space-y-2">
                            {QUESTION_TYPES.map(({ value, label, description }) => (
                                <label
                                    key={value}
                                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                                >
                                    <Checkbox
                                        checked={selectedTypes.includes(value)}
                                        onCheckedChange={() => toggleType(value)}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium leading-none">{label}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>
                        Hủy
                    </Button>
                    <Button onClick={handleGenerate} disabled={isGenerating}>
                        {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {isGenerating ? 'Đang tạo…' : 'Tạo câu hỏi'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
