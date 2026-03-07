import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { UseFormReturn } from 'react-hook-form';
import type { MCQModuleFormValues } from './schema';
import type { PartFlags } from './utils/partFlags';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    partIndex: number;
    questionIndex: number;
    globalNumber: number;
    flags: PartFlags;
    panelMode: 'view' | 'edit' | undefined;
    uploadingField: string | null;
    form: UseFormReturn<MCQModuleFormValues>;
    onSetPanel: (mode: 'view' | 'edit' | undefined) => void;
    onRemove: () => void;
    onUploadImage: (file: File) => Promise<void>;
}

const OPTION_OPTIONS = [
    { key: 'optionA' as const, label: 'Đáp án A' },
    { key: 'optionB' as const, label: 'Đáp án B' },
    { key: 'optionC' as const, label: 'Đáp án C' },
    { key: 'optionD' as const, label: 'Đáp án D' },
];

// ─── MCQQuestionRow ───────────────────────────────────────────────────────────

export function MCQQuestionRow({
    partIndex,
    questionIndex,
    globalNumber,
    flags,
    panelMode,
    uploadingField,
    form,
    onSetPanel,
    onRemove,
    onUploadImage,
}: Props) {
    const { isPart1, isPart2, isPart5, isListeningPart } = flags;
    const isSpecialSingle = isPart1 || isPart2 || isPart5;
    const isDetailsVisible = !isSpecialSingle || panelMode === 'edit';
    const imgUploadKey = `${partIndex}-${questionIndex}-imageUrl`;

    const imageUrl = form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`) ?? '';
    const audioUrl = form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.audioUrl`) ?? '';

    return (
        <div className="rounded-lg border p-3 bg-muted/10 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Câu {globalNumber}</p>
                <div className="flex items-center gap-2">
                    {isSpecialSingle && (
                        <>
                            <Button
                                type="button"
                                variant={panelMode === 'view' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onSetPanel(panelMode === 'view' ? undefined : 'view')}
                            >
                                Xem
                            </Button>
                            <Button
                                type="button"
                                variant={panelMode === 'edit' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => onSetPanel(panelMode === 'edit' ? undefined : 'edit')}
                            >
                                Sửa
                            </Button>
                        </>
                    )}
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={onRemove}
                    >
                        Xóa
                    </Button>
                </div>
            </div>

            {/* Collapsed placeholder */}
            {isSpecialSingle && !panelMode && (
                <p className="text-sm text-muted-foreground">
                    Bấm "Xem" hoặc "Sửa" để mở chi tiết câu.
                </p>
            )}

            {/* View mode */}
            {isSpecialSingle && panelMode === 'view' && (
                <div className="rounded-lg border bg-background p-3 space-y-2 text-sm">
                    <p>
                        <span className="font-medium">Câu hỏi: </span>
                        {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.question`) || 'Chưa có nội dung'}
                    </p>
                    {isPart5 && (
                        <ul className="space-y-1 text-muted-foreground">
                            {(['A', 'B', 'C', 'D'] as const).map((letter) => (
                                <li key={letter}>
                                    {letter}.{' '}
                                    {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.option${letter}` as `parts.${number}.manualQuestions.${number}.optionA`) || '-'}
                                </li>
                            ))}
                        </ul>
                    )}
                    <p>
                        <span className="font-medium">Đáp án đúng: </span>
                        {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.correctOption`) || 'A'}
                    </p>
                    {(isPart1 || isPart2) && (
                        <>
                            {isPart1 && (
                                <p>
                                    <span className="font-medium">Ảnh: </span>
                                    {imageUrl || 'Chưa có'}
                                </p>
                            )}
                            <p>
                                <span className="font-medium">Audio chung part: </span>
                                {audioUrl || 'Chưa có'}
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Edit / always-visible details */}
            {isDetailsVisible && (
                <>
                    {/* Part 5 question input */}
                    {isPart5 && (
                        <>
                            <FormField
                                control={form.control}
                                name={`parts.${partIndex}.manualQuestions.${questionIndex}.question`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Câu Part 5 (điền từ vào chỗ trống)</FormLabel>
                                        <FormControl>
                                            <Textarea rows={2} placeholder="Ví dụ: The report must be ----- by Friday." {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {OPTION_OPTIONS.map((opt) => (
                                    <FormField
                                        key={opt.key}
                                        control={form.control}
                                        name={`parts.${partIndex}.manualQuestions.${questionIndex}.${opt.key}`}
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>{opt.label}</FormLabel>
                                                <FormControl><Input className="h-10" {...field} /></FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* Part 1 / Part 2 question input */}
                    {(isPart1 || isPart2) && (
                        <FormField
                            control={form.control}
                            name={`parts.${partIndex}.manualQuestions.${questionIndex}.question`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nội dung câu hỏi</FormLabel>
                                    <FormControl>
                                        <Textarea rows={2} placeholder="Nhập câu hỏi..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Part 2 — fixed A/B/C preview */}
                    {isPart2 && (
                        <div className="rounded-lg border bg-background p-3 space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Dạng Part 2 dùng đáp án cố định A/B/C
                            </p>
                            <div className="rounded-lg border bg-muted/20 p-3">
                                <ul className="space-y-1 text-sm">
                                    {(['A', 'B', 'C'] as const).map((choice) => (
                                        <li key={choice} className="flex items-center gap-2">
                                            <span className="h-4 w-4 rounded-full border border-foreground/40" />
                                            <span>{choice}.</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Part 1 — image preview */}
                    {isPart1 && (
                        <div className="rounded-lg border bg-background p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Preview dạng Part 1
                            </p>
                            <div className="rounded-lg border p-2 bg-muted/20 mb-3 flex justify-center">
                                {imageUrl ? (
                                    <img
                                        src={imageUrl}
                                        alt={`Part 1 question ${globalNumber}`}
                                        className="max-h-56 w-auto object-contain rounded"
                                    />
                                ) : (
                                    <p className="text-sm text-muted-foreground py-12">Chưa có ảnh cho câu này</p>
                                )}
                            </div>
                            <ul className="space-y-1 text-sm">
                                {(['A', 'B', 'C', 'D'] as const).map((choice) => (
                                    <li key={choice} className="flex items-center gap-2">
                                        <span className="h-4 w-4 rounded-full border border-foreground/40" />
                                        <span>{choice}.</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Correct option + optional media URL */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name={`parts.${partIndex}.manualQuestions.${questionIndex}.correctOption`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Đáp án đúng</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger className="h-10">
                                                <SelectValue placeholder="Chọn đáp án" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {(isPart2 ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D']).map((option) => (
                                                <SelectItem key={option} value={option}>{option}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {!isListeningPart && !isPart5 && (
                            <FormField
                                control={form.control}
                                name={`parts.${partIndex}.manualQuestions.${questionIndex}.mediaUrl`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Media URL riêng (tuỳ chọn)</FormLabel>
                                        <FormControl><Input className="h-10" placeholder="https://..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                    </div>

                    {/* Part 1 — image upload */}
                    {isPart1 && (
                        <div className="rounded-lg border bg-background p-3 space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Media cho Part 1 (Listening Photographs)
                            </p>
                            <FormField
                                control={form.control}
                                name={`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Ảnh riêng câu này (Cloudinary)</FormLabel>
                                        <FormControl><Input className="h-10" placeholder="https://..." {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 gap-2">
                                <label className="inline-flex">
                                    <input
                                        className="hidden"
                                        type="file"
                                        accept="image/*"
                                        onChange={async (event) => {
                                            const inputElement = event.currentTarget;
                                            const file = event.target.files?.[0];
                                            if (!file) return;
                                            await onUploadImage(file);
                                            inputElement.value = '';
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-9"
                                        disabled={uploadingField === imgUploadKey}
                                        asChild
                                    >
                                        <span>
                                            {uploadingField === imgUploadKey
                                                ? 'Đang upload ảnh...'
                                                : 'Upload ảnh lên Cloudinary'}
                                        </span>
                                    </Button>
                                </label>
                            </div>
                        </div>
                    )}

                    {/* Part 2 — audio preview */}
                    {isPart2 && (
                        <div className="rounded-lg border bg-background p-3 space-y-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                Preview dạng Part 2 (A/B/C)
                            </p>
                            {audioUrl ? (
                                <audio controls className="w-full" src={audioUrl}>
                                    Trình duyệt không hỗ trợ audio.
                                </audio>
                            ) : (
                                <p className="text-sm text-muted-foreground">Chưa có audio cho câu này</p>
                            )}
                            <ul className="space-y-1 text-sm">
                                {(['A', 'B', 'C'] as const).map((choice) => (
                                    <li key={choice} className="flex items-center gap-2">
                                        <span className="h-4 w-4 rounded-full border border-foreground/40" />
                                        <span>{choice}.</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Transcript for listening parts */}
                    {isListeningPart && (
                        <FormField
                            control={form.control}
                            name={`parts.${partIndex}.manualQuestions.${questionIndex}.transcript`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transcript (để user review)</FormLabel>
                                    <FormControl>
                                        <Textarea rows={3} placeholder="Nhập transcript của audio câu này..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {/* Explanation */}
                    <FormField
                        control={form.control}
                        name={`parts.${partIndex}.manualQuestions.${questionIndex}.explanation`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Giải thích (để user hiểu vì sao đúng/sai)</FormLabel>
                                <FormControl>
                                    <Textarea rows={2} placeholder="Giải thích đáp án, mẹo làm bài, lỗi thường gặp..." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </>
            )}
        </div>
    );
}
