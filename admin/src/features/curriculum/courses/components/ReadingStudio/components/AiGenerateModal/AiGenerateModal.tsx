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
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { ReadingGenerationPayload, CEFRLevel } from '../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    isGenerating: boolean;
    courseLevel: CEFRLevel;
    onClose: () => void;
    onGenerate: (payload: ReadingGenerationPayload) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TEXT_TYPES = [
    { value: 'story',  label: 'Truyện ngắn' },
    { value: 'news',   label: 'Tin tức' },
    { value: 'email',  label: 'Email' },
    { value: 'report', label: 'Báo cáo' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export const AiGenerateModal = memo(function AiGenerateModal({
    open,
    isGenerating,
    courseLevel,
    onClose,
    onGenerate,
}: Props) {
    const [textType, setTextType] = useState<ReadingGenerationPayload['textType']>('story');
    const [wordCount, setWordCount] = useState(200);
    const [topic, setTopic] = useState('');

    const handleGenerate = () => {
        onGenerate({ level: courseLevel, textType, wordCount, topic: topic.trim() || undefined });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        AI Tạo bài đọc
                    </DialogTitle>
                    <DialogDescription>
                        AI sẽ tạo bài đọc và đánh dấu từ vựng tự động dựa trên ngữ cảnh của Unit.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* CEFR Level — read-only, sourced from course */}
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Trình độ CEFR</Label>
                        <span className="rounded-full bg-violet-100 px-3 py-0.5 text-sm font-semibold text-violet-700">
                            {courseLevel}
                        </span>
                    </div>

                    {/* Text Type */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Thể loại văn bản</Label>
                        <Select
                            value={textType}
                            onValueChange={(v) =>
                                setTextType(v as ReadingGenerationPayload['textType'])
                            }
                        >
                            <SelectTrigger aria-label="Chọn thể loại văn bản">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {TEXT_TYPES.map(({ value, label }) => (
                                    <SelectItem key={value} value={value}>
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Topic / Desired Content */}
                    <div className="space-y-2">
                        <Label htmlFor="reading-topic" className="text-sm font-medium">
                            Nội dung mong muốn{' '}
                            <span className="font-normal text-muted-foreground">(tùy chọn)</span>
                        </Label>
                        <Textarea
                            id="reading-topic"
                            rows={3}
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="VD: Một câu chuyện về chuyến du lịch lần đầu đến Nhật Bản…"
                            maxLength={300}
                            className="resize-none text-sm"
                        />
                        <p className="text-right text-xs text-muted-foreground">
                            {topic.length}/300
                        </p>
                    </div>

                    {/* Word Count */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-medium">Số từ mục tiêu</Label>
                            <span className="tabular-nums text-sm font-semibold text-primary">
                                ~{wordCount} từ
                            </span>
                        </div>
                        <Slider
                            min={50}
                            max={600}
                            step={50}
                            value={[wordCount]}
                            onValueChange={([v]) => setWordCount(v ?? 200)}
                            aria-label="Số từ mục tiêu"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>50</span>
                            <span>600</span>
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
                        aria-label="Bắt đầu tạo bài đọc bằng AI"
                    >
                        {isGenerating ? (
                            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        ) : (
                            <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        )}
                        Tạo bài đọc
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
