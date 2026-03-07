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
import type { UseGroupImagesReturn } from './hooks/useGroupImages';
import { MCQGroupMediaPanel } from './MCQGroupMediaPanel';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    partIndex: number;
    groupStart: number;
    groupSize: number;
    groupOrder: number;
    globalStart: number;
    globalEnd: number;
    flags: PartFlags;
    panelMode: 'view' | 'edit' | undefined;
    form: UseFormReturn<MCQModuleFormValues>;
    groupImages: UseGroupImagesReturn;
    onChangeMode: (mode: 'view' | 'edit' | undefined) => void;
    onRemoveGroup: () => void;
    getGlobalNumber: (questionIndex: number) => number;
}

const OPTIONS = [
    { key: 'optionA' as const, label: 'Đáp án A' },
    { key: 'optionB' as const, label: 'Đáp án B' },
    { key: 'optionC' as const, label: 'Đáp án C' },
    { key: 'optionD' as const, label: 'Đáp án D' },
];

// ─── MCQGroupRow ──────────────────────────────────────────────────────────────

export function MCQGroupRow({
    partIndex,
    groupStart,
    groupSize,
    groupOrder,
    globalStart,
    globalEnd,
    flags,
    panelMode,
    form,
    groupImages,
    onChangeMode,
    onRemoveGroup,
    getGlobalNumber,
}: Props) {
    const { isPart7, isListeningGroupedPart } = flags;

    const groupIndexes = Array.from({ length: groupSize }, (_, offset) => groupStart + offset).filter(
        (qi) => !!form.getValues(`parts.${partIndex}.manualQuestions.${qi}`),
    );

    const sharedImageUrls = groupImages.getSharedImages(partIndex, groupStart);

    return (
        <div className="rounded-lg border p-3 bg-muted/10 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                    Cụm {groupOrder} (Câu {globalStart}–{globalEnd})
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant={panelMode === 'view' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onChangeMode(panelMode === 'view' ? undefined : 'view')}
                    >
                        Xem
                    </Button>
                    <Button
                        type="button"
                        variant={panelMode === 'edit' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onChangeMode(panelMode === 'edit' ? undefined : 'edit')}
                    >
                        Sửa
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={onRemoveGroup}
                    >
                        Xóa cụm
                    </Button>
                </div>
            </div>

            {/* Collapsed placeholder */}
            {!panelMode && (
                <p className="text-sm text-muted-foreground">
                    Bấm "Xem" hoặc "Sửa" để mở chi tiết cụm câu.
                </p>
            )}

            {/* View mode */}
            {panelMode === 'view' && (
                <div className="space-y-3">
                    <div className="rounded-lg border bg-background p-3 text-sm space-y-2">
                        <p>
                            <span className="font-medium">Hình chung: </span>
                            {sharedImageUrls.length > 0 ? `${sharedImageUrls.length} ảnh` : 'Chưa có'}
                        </p>
                        {sharedImageUrls.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {sharedImageUrls.map((imgUrl, imgIdx) => (
                                    <div
                                        key={`${partIndex}-${groupStart}-view-img-${imgIdx}`}
                                        className="rounded-lg border p-2 bg-muted/20 flex justify-center"
                                    >
                                        <img
                                            src={imgUrl}
                                            alt={`Group ${groupOrder} preview ${imgIdx + 1}`}
                                            className="max-h-56 w-auto object-contain rounded"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {groupIndexes.map((qi) => (
                        <div key={`${partIndex}-view-${qi}`} className="rounded-lg border bg-background p-3 text-sm space-y-2">
                            <p className="font-medium">Câu {getGlobalNumber(qi)}</p>
                            <p>
                                {form.watch(`parts.${partIndex}.manualQuestions.${qi}.question`) || 'Chưa nhập nội dung câu hỏi'}
                            </p>
                            <p className="text-muted-foreground">
                                Đáp án đúng: {form.watch(`parts.${partIndex}.manualQuestions.${qi}.correctOption`) || 'A'}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit mode */}
            {panelMode === 'edit' && (
                <>
                    <MCQGroupMediaPanel
                        partIndex={partIndex}
                        groupStart={groupStart}
                        groupSize={groupSize}
                        sharedImageUrls={sharedImageUrls}
                        isPart7={isPart7}
                        uploadingKey={groupImages.uploadingImageKey}
                        onMoveImage={(from, to) => groupImages.moveGroupImage(partIndex, groupStart, from, to, groupSize)}
                        onRemoveImage={(idx) => groupImages.removeGroupImage(partIndex, groupStart, idx, groupSize)}
                        onUploadImage={(file) => groupImages.uploadGroupImage(partIndex, groupStart, file, groupSize, isPart7)}
                        onAddImageUrl={(url) => {
                            groupImages.setSharedImages(partIndex, groupStart, [...sharedImageUrls, url], groupSize);
                        }}
                        onSetSingleImageUrl={(url) => {
                            groupImages.setSharedImages(partIndex, groupStart, url ? [url] : [], groupSize);
                        }}
                    />

                    <div className="space-y-3">
                        {groupIndexes.map((qi) => (
                            <div key={`${partIndex}-${qi}`} className="rounded-lg border bg-background p-3 space-y-3">
                                <p className="text-sm font-medium">Câu {getGlobalNumber(qi)}</p>

                                <FormField
                                    control={form.control}
                                    name={`parts.${partIndex}.manualQuestions.${qi}.question`}
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

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {OPTIONS.map((opt) => (
                                        <FormField
                                            key={opt.key}
                                            control={form.control}
                                            name={`parts.${partIndex}.manualQuestions.${qi}.${opt.key}`}
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

                                <FormField
                                    control={form.control}
                                    name={`parts.${partIndex}.manualQuestions.${qi}.correctOption`}
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
                                                    {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                                                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Transcript: listening grouped parts (3, 4) */}
                                {isListeningGroupedPart && (
                                    <FormField
                                        control={form.control}
                                        name={`parts.${partIndex}.manualQuestions.${qi}.transcript`}
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

                                <FormField
                                    control={form.control}
                                    name={`parts.${partIndex}.manualQuestions.${qi}.explanation`}
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
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
