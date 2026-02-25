import { memo } from 'react';
import { Trash2, GripVertical } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form';
import type { ListeningLessonFormValues } from '../../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    index: number;
    onRemove: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────
// Using uncontrolled register() for text inputs — avoids re-render on keystroke.
// react-hook-form's FormField (Controller) is only used for selects/checkboxes.

export const TranscriptLineItem = memo(function TranscriptLineItem({ index, onRemove }: Props) {
    const { register, control, formState: { errors } } = useFormContext<ListeningLessonFormValues>();

    const lineErrors = errors.transcript?.[index];

    return (
        <div className="group relative flex gap-3 rounded-lg border bg-background p-3">
            {/* Drag handle (visual only — DnD to be added in Phase 4) */}
            <div className="mt-2 shrink-0 cursor-grab text-muted-foreground/40 hover:text-muted-foreground">
                <GripVertical className="h-4 w-4" aria-hidden="true" />
            </div>

            <div className="flex flex-1 flex-col gap-2">
                {/* Row 1: Speaker + Role */}
                <div className="grid grid-cols-2 gap-2">
                    <FormItem>
                        <FormControl>
                            <Input
                                {...register(`transcript.${index}.speaker`)}
                                placeholder="Tên nhân vật (VD: Adam)"
                                aria-label={`Nhân vật dòng ${index + 1}`}
                                className="h-8 text-sm"
                            />
                        </FormControl>
                        {lineErrors?.speaker && (
                            <FormMessage>{lineErrors.speaker.message}</FormMessage>
                        )}
                    </FormItem>

                    <FormItem>
                        <FormControl>
                            <Input
                                {...register(`transcript.${index}.role`)}
                                placeholder="Vai trò (VD: Airport Staff)"
                                aria-label={`Vai trò dòng ${index + 1}`}
                                className="h-8 text-sm"
                            />
                        </FormControl>
                        {lineErrors?.role && (
                            <FormMessage>{lineErrors.role.message}</FormMessage>
                        )}
                    </FormItem>
                </div>

                {/* Row 2: Dialogue text */}
                <FormItem>
                    <FormControl>
                        <Textarea
                            {...register(`transcript.${index}.text`)}
                            placeholder="Nội dung thoại..."
                            aria-label={`Nội dung dòng ${index + 1}`}
                            rows={2}
                            className="resize-none text-sm"
                        />
                    </FormControl>
                    {lineErrors?.text && (
                        <FormMessage>{lineErrors.text.message}</FormMessage>
                    )}
                </FormItem>

                {/* Row 3: Translation */}
                <FormItem>
                    <FormControl>
                        <Textarea
                            {...register(`transcript.${index}.translation`)}
                            placeholder="Bản dịch hội thoại (tuỳ chọn)..."
                            aria-label={`Bản dịch dòng ${index + 1}`}
                            rows={2}
                            className="resize-none text-sm"
                        />
                    </FormControl>
                    {lineErrors?.translation && (
                        <FormMessage>{lineErrors.translation.message}</FormMessage>
                    )}
                </FormItem>
            </div>

            {/* Remove button */}
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onRemove}
                aria-label={`Xóa dòng thoại ${index + 1}`}
                className="absolute right-2 top-2 h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
            >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
        </div>
    );
});
