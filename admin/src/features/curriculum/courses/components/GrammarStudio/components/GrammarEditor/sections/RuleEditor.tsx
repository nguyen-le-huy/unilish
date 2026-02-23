import { memo } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FormulaList } from '../blocks/FormulaList';
import { IrregularVerbGrid } from '../blocks/IrregularVerbGrid';
import type { GrammarLessonFormValues } from '../../../../../types/course.types';

// ─── Component ────────────────────────────────────────────────────────────────

export const RuleEditor = memo(function RuleEditor() {
    const { register, formState: { errors } } = useFormContext<GrammarLessonFormValues>();

    return (
        <div className="space-y-5 p-4">
            {/* ── Rule name ──────────────────────────────────────────────── */}
            <div className="space-y-1.5">
                <Label htmlFor="rule-name" className="text-sm font-medium">
                    Tên điểm ngữ pháp
                </Label>
                <Input
                    id="rule-name"
                    {...register('grammar_rule.name')}
                    placeholder="Past Simple Tense"
                    aria-invalid={!!errors.grammar_rule?.name}
                    className="text-sm"
                />
                {errors.grammar_rule?.name && (
                    <p className="text-xs text-destructive" role="alert">
                        {errors.grammar_rule.name.message}
                    </p>
                )}
            </div>

            {/* ── Usage note ─────────────────────────────────────────────── */}
            <div className="space-y-1.5">
                <Label htmlFor="rule-usage" className="text-sm font-medium">
                    Cách dùng
                </Label>
                <Textarea
                    id="rule-usage"
                    {...register('grammar_rule.usage')}
                    placeholder="Diễn tả hành động đã xảy ra và kết thúc trong quá khứ…"
                    rows={4}
                    className="resize-none text-sm"
                />
            </div>

            {/* ── Formula list ───────────────────────────────────────────── */}
            <FormulaList />

            {/* ── Irregular verb grid ────────────────────────────────────── */}
            <IrregularVerbGrid />
        </div>
    );
});
