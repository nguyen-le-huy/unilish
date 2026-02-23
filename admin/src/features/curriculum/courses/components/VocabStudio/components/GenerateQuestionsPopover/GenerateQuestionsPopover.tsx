import { memo, useState } from 'react';
import { HelpCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { notification } from '@/lib/notification';
import { useGenerateVocabQuestions } from '../../../../hooks/useVocabQuestions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonId: string;
    vocabItemCount: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_PER_TYPE = 30;

// ─── Sub-component: type slider row ──────────────────────────────────────────

function TypeSlider({
    icon,
    label,
    value,
    max,
    disabled,
    onChange,
}: {
    icon: string;
    label: string;
    value: number;
    max: number;
    disabled?: boolean;
    onChange: (v: number) => void;
}) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-xs">
                    <span>{icon}</span>
                    {label}
                    {disabled && (
                        <span className="text-[10px] text-muted-foreground">(cần ≥ 4 từ)</span>
                    )}
                </Label>
                <span
                    className={`text-sm font-medium tabular-nums ${value === 0 ? 'text-muted-foreground' : 'text-primary'}`}
                >
                    {value}
                </span>
            </div>
            <Slider
                min={0}
                max={Math.max(1, max)}
                step={1}
                value={[value]}
                onValueChange={([v = 0]) => onChange(v)}
                disabled={disabled || max === 0}
                aria-label={label}
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0</span>
                <span>{Math.max(1, max)}</span>
            </div>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export const GenerateQuestionsPopover = memo(function GenerateQuestionsPopover({
    lessonId,
    vocabItemCount,
}: Props) {
    const [mc, setMc] = useState(4);
    const [fill, setFill] = useState(4);
    const [match, setMatch] = useState(2);
    const [open, setOpen] = useState(false);

    const total = mc + fill + match;
    const canGenerate = total >= 3 && vocabItemCount > 0;
    const generateMutation = useGenerateVocabQuestions(lessonId);

    const handleGenerate = () => {
        generateMutation.mutate(
            { distribution: { mc, fill, match } },
            {
                onSuccess: (data) => {
                    notification.success(`Đã tạo ${data.length} câu hỏi luyện tập`);
                    setOpen(false);
                },
                onError: () =>
                    notification.error(
                        'Lỗi khi tạo câu hỏi. Hãy đảm bảo từ vựng đã được lưu trước.',
                    ),
            },
        );
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    aria-label="Tạo câu hỏi luyện tập"
                >
                    <HelpCircle className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                    Tạo câu hỏi
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" className="w-80 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
                        <span className="text-sm font-semibold">Tạo câu hỏi luyện tập</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        Tổng:
                        <span
                            className={`font-semibold tabular-nums ${canGenerate ? 'text-primary' : 'text-destructive'}`}
                        >
                            {total}
                        </span>
                        câu
                    </div>
                </div>

                {vocabItemCount === 0 ? (
                    <div className="rounded-lg border border-dashed p-3 text-center">
                        <p className="text-xs text-muted-foreground">
                            Chưa có từ vựng. Hãy tạo hoặc thêm từ vựng trước.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <TypeSlider
                            icon="🔊"
                            label="Nghe & Chọn"
                            value={mc}
                            max={MAX_PER_TYPE}
                            disabled={vocabItemCount < 4}
                            onChange={setMc}
                        />
                        <TypeSlider
                            icon="✏️"
                            label="Điền từ"
                            value={fill}
                            max={MAX_PER_TYPE}
                            onChange={setFill}
                        />
                        <TypeSlider
                            icon="🔗"
                            label="Nối nghĩa"
                            value={match}
                            max={MAX_PER_TYPE}
                            onChange={setMatch}
                        />

                        {!canGenerate && (
                            <p className="text-[11px] text-destructive">
                                Tổng phải ít nhất 3 câu.
                            </p>
                        )}

                        <Button
                            className="w-full gap-2"
                            onClick={handleGenerate}
                            disabled={generateMutation.isPending || !canGenerate}
                        >
                            {generateMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            ) : (
                                <Sparkles className="h-4 w-4" aria-hidden="true" />
                            )}
                            {generateMutation.isPending ? 'Đang tạo câu hỏi…' : `Tạo ${total} câu hỏi`}
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
});

