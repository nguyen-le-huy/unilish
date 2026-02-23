import { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { VocabItem } from '../../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    item: VocabItem;
    /** Scenario string from Unit.contextSeed.scenario — used for the constraint warning */
    scenario: string;
    onChange: (field: keyof VocabItem, value: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ContextBlock = memo(function ContextBlock({ item, scenario, onChange }: Props) {
    return (
        <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Ngữ cảnh sử dụng
            </h4>

            {/* Scenario constraint banner */}
            {scenario && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 dark:border-amber-800 dark:bg-amber-950/30">
                    <AlertTriangle
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                        aria-hidden="true"
                    />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                        <strong>Ràng buộc AI:</strong> Câu ví dụ phải thuộc ngữ cảnh:{' '}
                        <em className="font-medium">{scenario}</em>
                    </p>
                </div>
            )}

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
                    placeholder="Bản dịch câu ví dụ"
                    rows={2}
                    className="resize-none text-sm"
                />
            </div>
        </div>
    );
});
