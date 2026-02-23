import { memo, useCallback } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { GrammarLessonFormValues } from '../../../../../types/course.types';

// ─── Component ────────────────────────────────────────────────────────────────

export const IrregularVerbGrid = memo(function IrregularVerbGrid() {
    const { register, control, formState: { errors } } = useFormContext<GrammarLessonFormValues>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'grammar_rule.irregular_verbs',
    });

    const handleAdd = useCallback(() => {
        append({
            id: crypto.randomUUID(),
            base: '',
            past: '',
        });
    }, [append]);

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">
                    Động từ bất quy tắc
                    <span className="ml-1.5 text-xs text-muted-foreground/60">(tuỳ chọn)</span>
                </p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdd}
                    aria-label="Thêm động từ bất quy tắc"
                    className="h-7 gap-1.5 text-xs"
                >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Thêm
                </Button>
            </div>

            {fields.length === 0 ? (
                <p className="rounded-md border border-dashed py-3 text-center text-xs text-muted-foreground">
                    Không có động từ bất quy tắc nào.
                </p>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {fields.map((field, index) => (
                        <div
                            key={field.id}
                            className="flex items-center gap-1.5 rounded-md border bg-muted/30 px-2 py-1.5"
                        >
                            {/* Base form */}
                            <Input
                                {...register(`grammar_rule.irregular_verbs.${index}.base`)}
                                placeholder="lose"
                                className="h-6 flex-1 min-w-0 font-mono text-xs"
                                aria-label={`Dạng gốc — dòng ${index + 1}`}
                                aria-invalid={
                                    !!errors.grammar_rule?.irregular_verbs?.[index]?.base
                                }
                            />

                            <span className="shrink-0 text-xs text-muted-foreground">→</span>

                            {/* Past form */}
                            <Input
                                {...register(`grammar_rule.irregular_verbs.${index}.past`)}
                                placeholder="lost"
                                className="h-6 flex-1 min-w-0 font-mono text-xs"
                                aria-label={`Dạng quá khứ — dòng ${index + 1}`}
                            />

                            {/* Delete */}
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={() => remove(index)}
                                aria-label={`Xoá động từ ${index + 1}`}
                            >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});
