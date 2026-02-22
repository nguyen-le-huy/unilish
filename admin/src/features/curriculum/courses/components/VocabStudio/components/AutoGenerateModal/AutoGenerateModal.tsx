import { memo, useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    open: boolean;
    isLoading: boolean;
    onClose: () => void;
    onGenerate: (config: { wordCount: number; wordList?: string[] }) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AutoGenerateModal = memo(function AutoGenerateModal({
    open,
    isLoading,
    onClose,
    onGenerate,
}: Props) {
    const [wordCount, setWordCount] = useState(10);
    const [rawWordList, setRawWordList] = useState('');

    const handleSubmit = () => {
        const wordList = rawWordList
            .split(/[\n,]+/)
            .map((w) => w.trim())
            .filter(Boolean);

        onGenerate({
            wordCount: wordList.length > 0 ? wordList.length : wordCount,
            wordList: wordList.length > 0 ? wordList : undefined,
        });
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-purple-500" aria-hidden="true" />
                        Tự động tạo từ vựng bằng AI
                    </DialogTitle>
                    <DialogDescription>
                        GPT sẽ tạo từ vựng dựa trên ngữ cảnh của unit. Bạn có thể chỉ định danh
                        sách từ cụ thể hoặc để AI chọn.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Word Count Slider */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Số lượng từ</Label>
                            <span className="text-sm font-medium text-primary">{wordCount}</span>
                        </div>
                        <Slider
                            min={3}
                            max={20}
                            step={1}
                            value={[wordCount]}
                            onValueChange={([v]) => setWordCount(v)}
                            disabled={rawWordList.trim().length > 0}
                            aria-label="Số lượng từ"
                        />
                        <p className="text-xs text-muted-foreground">3 – 20 từ</p>
                    </div>

                    {/* Custom Word List */}
                    <div className="space-y-2">
                        <Label htmlFor="word-list">
                            Danh sách từ tùy chỉnh{' '}
                            <span className="font-normal text-muted-foreground">(tuỳ chọn)</span>
                        </Label>
                        <Textarea
                            id="word-list"
                            placeholder="Nhập từng từ trên một dòng hoặc phân cách bằng dấu phẩy&#10;Ví dụ: airport, passport, departure"
                            value={rawWordList}
                            onChange={(e) => setRawWordList(e.target.value)}
                            rows={4}
                            className="resize-none text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Nếu nhập danh sách từ, số lượng slider sẽ bị bỏ qua.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Huỷ
                    </Button>
                    <Button onClick={handleSubmit} disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                                Đang tạo…
                            </>
                        ) : (
                            <>
                                <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
                                Tạo từ vựng
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});
