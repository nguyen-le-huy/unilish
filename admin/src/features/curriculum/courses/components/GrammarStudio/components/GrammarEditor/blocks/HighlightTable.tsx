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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import type { GrammarLessonFormValues, HighlightType } from '../../../../../types/course.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const HIGHLIGHT_TYPE_LABELS: Record<HighlightType, string> = {
    regular_verb: 'Động từ thường',
    irregular_verb: 'Động từ bất quy tắc',
    grammar_particle: 'Hư từ / Trợ từ',
    other: 'Khác',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const HighlightTable = memo(function HighlightTable() {
    const { register, control, formState: { errors } } = useFormContext<GrammarLessonFormValues>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'context_story.highlights',
    });

    const handleAdd = useCallback(() => {
        append({
            id: crypto.randomUUID(),
            word: '',
            type: 'other',
            root: '',
        });
    }, [append]);

    return (
        <div className="space-y-2">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Bảng từ nổi bật</p>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdd}
                    aria-label="Thêm từ nổi bật thủ công"
                    className="h-7 gap-1.5 text-xs"
                >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    Thêm từ
                </Button>
            </div>

            {fields.length === 0 ? (
                <p className="rounded-md border border-dashed py-4 text-center text-xs text-muted-foreground">
                    Chưa có từ nào. Nhấn "Thêm từ" hoặc dùng AI để tự động trích xuất.
                </p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[30%] text-xs">Từ trong bài</TableHead>
                            <TableHead className="w-[25%] text-xs">Từ gốc (root)</TableHead>
                            <TableHead className="text-xs">Loại từ</TableHead>
                            <TableHead className="w-10" />
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.map((field, index) => (
                            <TableRow key={field.id}>
                                {/* word */}
                                <TableCell className="py-1.5">
                                    <Input
                                        {...register(`context_story.highlights.${index}.word`)}
                                        placeholder="booked"
                                        className="h-7 text-xs"
                                        aria-label={`Từ trong bài — dòng ${index + 1}`}
                                        aria-invalid={
                                            !!errors.context_story?.highlights?.[index]?.word
                                        }
                                    />
                                </TableCell>

                                {/* root */}
                                <TableCell className="py-1.5">
                                    <Input
                                        {...register(`context_story.highlights.${index}.root`)}
                                        placeholder="book"
                                        className="h-7 text-xs"
                                        aria-label={`Từ gốc — dòng ${index + 1}`}
                                    />
                                </TableCell>

                                {/* type — controlled Select via manual register trick */}
                                <TableCell className="py-1.5">
                                    <HighlightTypeSelect
                                        control={control}
                                        index={index}
                                        aria-label={`Loại từ — dòng ${index + 1}`}
                                    />
                                </TableCell>

                                {/* delete */}
                                <TableCell className="py-1.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                        onClick={() => remove(index)}
                                        aria-label={`Xoá hàng ${index + 1}`}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
});

// ─── Sub-component: Controlled Select ────────────────────────────────────────

interface HighlightTypeSelectProps {
    control: Control<GrammarLessonFormValues>;
    index: number;
    'aria-label': string;
}

const HighlightTypeSelect = memo(function HighlightTypeSelect({
    control,
    index,
    'aria-label': ariaLabel,
}: HighlightTypeSelectProps) {
    // Use Controller inline to get typed Select value

    return (
        <Controller
            control={control}
            name={`context_story.highlights.${index}.type`}
            render={({ field }: { field: { value: HighlightType; onChange: (v: HighlightType) => void } }) => (
                <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    aria-label={ariaLabel}
                >
                    <SelectTrigger className="h-7 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {(Object.keys(HIGHLIGHT_TYPE_LABELS) as HighlightType[]).map((type) => (
                            <SelectItem key={type} value={type} className="text-xs">
                                {HIGHLIGHT_TYPE_LABELS[type]}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        />
    );
});
