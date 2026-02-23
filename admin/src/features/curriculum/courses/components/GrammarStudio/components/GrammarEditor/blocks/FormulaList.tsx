import { memo, useCallback } from 'react';
import { useFieldArray, useFormContext, Controller, type Control } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { GrammarLessonFormValues, FormulaType } from '../../../../../types/course.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const FORMULA_TYPE_LABELS: Record<FormulaType, string> = {
    positive: 'Khẳng định',
    negative: 'Phủ định',
    question: 'Câu hỏi',
    other: 'Khác',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const FormulaList = memo(function FormulaList() {
    const { register, control, formState: { errors } } = useFormContext<GrammarLessonFormValues>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'grammar_rule.formulas',
    });

    const handleAdd = useCallback(() => {
        append({
            id: crypto.randomUUID(),
            type: 'positive',
            structure: '',
            example: '',
        });
    }, [append]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Công thức ngữ pháp</p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdd}
                    aria-label="Thêm công thức ngữ pháp"
                    className="h-7 gap-1.5 text-xs"
                >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Thêm công thức
                </Button>
            </div>

            {fields.length === 0 ? (
                <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                    Chưa có công thức. Nhấn "Thêm công thức" để bắt đầu.
                </p>
            ) : (
                <div className="space-y-2">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="flex items-start gap-2 rounded-md border bg-muted/30 p-2"
                        >
                            {/* Formula type */}
                            <div className="w-32 shrink-0">
                                <FormulaTypeSelect
                                    control={control}
                                    index={index}
                                    aria-label={`Loại công thức — dòng ${index + 1}`}
                                />
                            </div>

                            {/* Structure */}
                            <div className="flex-1 min-w-0">
                                <Input
                                    {...register(`grammar_rule.formulas.${index}.structure`)}
                                    placeholder="S + V-ed / V2"
                                    className="h-7 font-mono text-xs"
                                    aria-label={`Cấu trúc — dòng ${index + 1}`}
                                    aria-invalid={
                                        !!errors.grammar_rule?.formulas?.[index]?.structure
                                    }
                                />
                            </div>

                            {/* Example */}
                            <div className="flex-1 min-w-0">
                                <Input
                                    {...register(`grammar_rule.formulas.${index}.example`)}
                                    placeholder="She worked hard."
                                    className="h-7 text-xs"
                                    aria-label={`Ví dụ — dòng ${index + 1}`}
                                />
                            </div>

                            {/* Delete */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => remove(index)}
                                aria-label={`Xoá công thức ${index + 1}`}
                            >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

// ─── Sub-component: Controlled Select ────────────────────────────────────────

interface FormulaTypeSelectProps {
    control: Control<GrammarLessonFormValues>;
    index: number;
    'aria-label': string;
}

const FormulaTypeSelect = memo(function FormulaTypeSelect({
    control,
    index,
    'aria-label': ariaLabel,
}: FormulaTypeSelectProps) {
    return (
        <Controller
            control={control}
            name={`grammar_rule.formulas.${index}.type`}
            render={({ field }: { field: { value: FormulaType; onChange: (v: FormulaType) => void } }) => (
                <Select value={field.value} onValueChange={field.onChange} aria-label={ariaLabel}>
                    <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(FORMULA_TYPE_LABELS) as FormulaType[]).map((type) => (
                            <SelectItem key={type} value={type} className="text-xs">
                                {FORMULA_TYPE_LABELS[type]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        />
    );
});
