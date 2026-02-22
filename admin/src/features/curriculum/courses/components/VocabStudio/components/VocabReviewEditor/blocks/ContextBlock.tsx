import { memo } from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { VocabItem } from '../../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    item: VocabItem;
    onChange: (field: keyof VocabItem, value: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ContextBlock = memo(function ContextBlock({ item, onChange }: Props) {
    return (
        <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ngữ cảnh sử dụng
            </h4>

            {/* Example Sentence */}
            <div className="space-y-1.5">
                <Label htmlFor="exampleSentence">Câu ví dụ</Label>
                <Textarea
                    id="exampleSentence"
                    value={item.exampleSentence}
                    onChange={(e) => onChange('exampleSentence', e.target.value)}
                    placeholder="Câu ví dụ bằng ngôn ngữ đang học"
                    rows={3}
                    className="resize-none text-sm"
                />
            </div>

            {/* Example Translation */}
            <div className="space-y-1.5">
                <Label htmlFor="exampleTranslation">Dịch nghĩa câu ví dụ</Label>
                <Textarea
                    id="exampleTranslation"
                    value={item.exampleTranslation}
                    onChange={(e) => onChange('exampleTranslation', e.target.value)}
                    placeholder="English translation of the example"
                    rows={2}
                    className="resize-none text-sm"
                />
            </div>
        </div>
    );
});
