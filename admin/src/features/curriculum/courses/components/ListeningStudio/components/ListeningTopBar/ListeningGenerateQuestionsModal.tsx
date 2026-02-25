import { memo, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

export interface ListeningQuestionDistribution {
    multipleChoice: number;
    fillInBlank: number;
    trueFalse: number;
}

interface Props {
    open: boolean;
    isGenerating: boolean;
    onClose: () => void;
    onGenerate: (distribution: ListeningQuestionDistribution) => void;
}

export const ListeningGenerateQuestionsModal = memo(function ListeningGenerateQuestionsModal({
    open,
    isGenerating,
    onClose,
    onGenerate,
}: Props) {
    const [distribution, setDistribution] = useState<ListeningQuestionDistribution>({
        multipleChoice: 2,
        fillInBlank: 2,
        trueFalse: 2,
    });

    const total = useMemo(
        () => distribution.multipleChoice + distribution.fillInBlank + distribution.trueFalse,
        [distribution],
    );

    const canGenerate = total > 0;

    const setValue = (key: keyof ListeningQuestionDistribution, value: number) => {
        setDistribution((prev) => ({ ...prev, [key]: value }));
    };

    const handleGenerate = () => {
        onGenerate(distribution);
    };

    return (
        <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                        Cấu hình tạo câu hỏi listening
                    </DialogTitle>
                    <DialogDescription>
                        Chọn số lượng từng loại câu hỏi. Tổng hiện tại: {total} câu.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Trắc nghiệm (MCQ)</Label>
                            <span className="text-sm font-semibold tabular-nums">{distribution.multipleChoice}</span>
                        </div>
                        <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[distribution.multipleChoice]}
                            onValueChange={([value]) => setValue('multipleChoice', value ?? 0)}
                            aria-label="Số câu trắc nghiệm"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Điền từ (Gap-fill)</Label>
                            <span className="text-sm font-semibold tabular-nums">{distribution.fillInBlank}</span>
                        </div>
                        <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[distribution.fillInBlank]}
                            onValueChange={([value]) => setValue('fillInBlank', value ?? 0)}
                            aria-label="Số câu điền từ"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm">Đúng / Sai</Label>
                            <span className="text-sm font-semibold tabular-nums">{distribution.trueFalse}</span>
                        </div>
                        <Slider
                            min={0}
                            max={10}
                            step={1}
                            value={[distribution.trueFalse]}
                            onValueChange={([value]) => setValue('trueFalse', value ?? 0)}
                            aria-label="Số câu đúng sai"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isGenerating}>
                        Huỷ
                    </Button>
                    <Button onClick={handleGenerate} disabled={isGenerating || !canGenerate}>
                        {isGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                        )}
                        {isGenerating ? 'Đang tạo…' : `Tạo ${total} câu hỏi`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
