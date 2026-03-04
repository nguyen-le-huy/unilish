import { useFormContext, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';
import type { ICreateQuestionPayload } from '../../../types';

export function OptionsField() {
    const { control, watch, setValue } = useFormContext<ICreateQuestionPayload>();
    const { fields, append, remove } = useFieldArray({
        control,
        name: 'options',
    });

    const correctAnswer = watch('correctAnswer');

    function handleAddOption() {
        append({ key: String.fromCharCode(65 + fields.length), text: '', isCorrect: false });
    }

    function handleSetCorrect(key: string) {
        setValue('correctAnswer', key, { shouldValidate: true });
        fields.forEach((_, i) => {
            setValue(`options.${i}.isCorrect`, fields[i].key === key, { shouldValidate: false });
        });
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Đáp án</h3>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleAddOption}
                    disabled={fields.length >= 6}
                >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Thêm đáp án
                </Button>
            </div>

            <div className="flex flex-col gap-2">
                {fields.map((field, index) => {
                    const key = field.key ?? String.fromCharCode(65 + index);
                    const isCorrect = correctAnswer === key;

                    return (
                        <div
                            key={field.id}
                            className={cn(
                                'flex items-center gap-2 rounded-md border p-2 transition-colors',
                                isCorrect && 'border-green-500 bg-green-50',
                            )}
                        >
                            {/* Correct indicator / radio */}
                            <button
                                type="button"
                                onClick={() => handleSetCorrect(key)}
                                title="Đánh dấu là đáp án đúng"
                                className={cn(
                                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors',
                                    isCorrect
                                        ? 'border-green-600 bg-green-600 text-white'
                                        : 'border-muted-foreground text-muted-foreground hover:border-green-500',
                                )}
                                aria-label={`Đáp án ${key} — ${isCorrect ? 'đúng' : 'sai'}`}
                                aria-pressed={isCorrect}
                            >
                                {key}
                            </button>

                            {/* Text field */}
                            <FormField
                                control={control}
                                name={`options.${index}.text`}
                                render={({ field: f }) => (
                                    <FormItem className="flex-1 mb-0">
                                        <FormControl>
                                            <Input
                                                {...f}
                                                placeholder={`Đáp án ${key}...`}
                                                className="h-8 text-sm border-0 shadow-none focus-visible:ring-0 px-1"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Remove */}
                            {fields.length > 2 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => remove(index)}
                                    aria-label={`Xoá đáp án ${key}`}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>
                    );
                })}
            </div>

            {fields.length === 0 && (
                <p className="text-sm text-muted-foreground italic">Chưa có đáp án nào. Nhấn "Thêm đáp án".</p>
            )}
        </div>
    );
}
