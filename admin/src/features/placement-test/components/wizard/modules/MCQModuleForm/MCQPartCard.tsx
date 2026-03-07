import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import type { UseFormReturn } from 'react-hook-form';
import type { MCQModuleFormValues } from './schema';
import type { PartFlags } from './utils/partFlags';
import type { UsePart7GroupsReturn } from './hooks/usePart7Groups';
import type { UseGroupImagesReturn } from './hooks/useGroupImages';
import { MCQPartAudioSection } from './MCQPartAudioSection';
import { MCQQuestionRow } from './MCQQuestionRow';
import { MCQGroupRow } from './MCQGroupRow';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    partIndex: number;
    form: UseFormReturn<MCQModuleFormValues>;
    flags: PartFlags;
    uploadingField: string | null;
    questionPanels: Partial<Record<string, 'view' | 'edit'>>;
    groupPanels: Partial<Record<string, 'view' | 'edit'>>;
    part7Groups: UsePart7GroupsReturn;
    groupImages: UseGroupImagesReturn;
    onSetQuestionPanel: (partIndex: number, questionIndex: number, mode: 'view' | 'edit' | undefined) => void;
    onSetGroupPanel: (partIndex: number, groupStart: number, mode: 'view' | 'edit' | undefined) => void;
    onAddQuestion: () => void;
    onRemoveQuestion: (questionIndex: number) => void;
    onRemoveGroup: (groupStart: number, groupSize: number) => void;
    onUploadPartAudio: (file: File) => Promise<void>;
    onUploadQuestionImage: (questionIndex: number, file: File) => Promise<void>;
    onGetSharedAudio: () => string;
    onSetSharedAudio: (url: string) => void;
    onGetGlobalNumber: (questionIndex: number) => number;
    onOpenAiImport: () => void;
}

// ─── MCQPartCard ──────────────────────────────────────────────────────────────

export function MCQPartCard({
    partIndex,
    form,
    flags,
    uploadingField,
    questionPanels,
    groupPanels,
    part7Groups,
    groupImages,
    onSetQuestionPanel,
    onSetGroupPanel,
    onAddQuestion,
    onRemoveQuestion,
    onRemoveGroup,
    onUploadPartAudio,
    onUploadQuestionImage,
    onGetSharedAudio,
    onSetSharedAudio,
    onGetGlobalNumber,
    onOpenAiImport,
}: Props) {
    const { isPart6, isPart7, isGroupedPart, hasSharedAudio } = flags;

    const manualQuestions = form.watch(`parts.${partIndex}.manualQuestions`) ?? [];
    const part7GroupSize = part7Groups.getPart7GroupSize(partIndex);
    const part7Pattern = part7Groups.getPart7GroupPattern(partIndex);
    const sharedAudioUrl = onGetSharedAudio();

    const part7GroupsList = isPart7
        ? part7Groups.buildPart7Groups(partIndex, manualQuestions.length)
        : [];

    const addButtonLabel = isPart6
        ? '+ Thêm cụm 4 câu'
        : isPart7
            ? `+ Thêm cụm ${part7Pattern.length > 0 ? 'theo pattern' : part7GroupSize} câu`
            : isGroupedPart
                ? '+ Thêm cụm 3 câu'
                : '+ Thêm câu';

    return (
        <Card className="bg-muted/20 border rounded-xl">
            <CardHeader className="py-4 px-5 flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Part {partIndex + 1}</CardTitle>
                <span className="text-xs text-muted-foreground">Cố định</span>
            </CardHeader>

            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5">
                <FormField
                    control={form.control}
                    name={`parts.${partIndex}.name`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tên</FormLabel>
                            <FormControl><Input className="h-10" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name={`parts.${partIndex}.poolTag`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Pool Tag</FormLabel>
                            <FormControl>
                                <Input className="h-10 font-mono" placeholder="toeic-listening-part1" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm flex items-center">
                    <span className="text-muted-foreground">Số câu: </span>
                    <span className="ml-1 font-semibold">{manualQuestions.length}</span>
                </div>

                {/* Shared audio section for listening parts */}
                {hasSharedAudio && (
                    <MCQPartAudioSection
                        sharedAudioUrl={sharedAudioUrl}
                        isUploading={uploadingField === `${partIndex}-part-audio`}
                        onChangeUrl={onSetSharedAudio}
                        onUploadFile={onUploadPartAudio}
                    />
                )}

                {/* Manual questions section */}
                <div className="md:col-span-2 mt-2 rounded-xl border bg-background p-4 space-y-4">
                    <p className="text-sm font-semibold">Soạn đề thủ công (TOEIC Listening/Reading)</p>

                    <div className="space-y-3">
                        {/* Toolbar */}
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Cấu hình từng câu</p>
                            <div className="flex items-center gap-2">
                                {isPart7 && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground">Số câu/cụm</span>
                                        <Input
                                            className="h-8 w-20"
                                            type="number"
                                            min={2}
                                            max={7}
                                            value={part7GroupSize}
                                            onChange={(event) =>
                                                part7Groups.setPart7GroupSize(partIndex, Number(event.target.value || 3))
                                            }
                                        />
                                    </div>
                                )}
                                <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    onClick={onOpenAiImport}
                                >
                                    AI phân tích &amp; nạp
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={onAddQuestion}>
                                    {addButtonLabel}
                                </Button>
                            </div>
                        </div>

                        {/* Question list */}
                        {manualQuestions.map((_, questionIndex) => {
                            if (isGroupedPart) {
                                // For grouped parts, only render at group start indices
                                if (isPart7) {
                                    const group = part7GroupsList.find((g) => g.start === questionIndex);
                                    if (!group) return null;

                                    const globalStart = onGetGlobalNumber(questionIndex);
                                    const globalEnd = globalStart + group.size - 1;
                                    const groupKey = `${partIndex}-${questionIndex}`;
                                    const groupPanel = groupPanels[groupKey];

                                    return (
                                        <MCQGroupRow
                                            key={groupKey}
                                            partIndex={partIndex}
                                            groupStart={questionIndex}
                                            groupSize={group.size}
                                            groupOrder={group.order}
                                            globalStart={globalStart}
                                            globalEnd={globalEnd}
                                            flags={flags}
                                            panelMode={groupPanel}
                                            form={form}
                                            groupImages={groupImages}
                                            onChangeMode={(mode) => onSetGroupPanel(partIndex, questionIndex, mode)}
                                            onRemoveGroup={() => onRemoveGroup(questionIndex, group.size)}
                                            getGlobalNumber={onGetGlobalNumber}
                                        />
                                    );
                                }

                                // Part 3, 4, 6 — fixed group sizes
                                const groupSize = isPart6 ? 4 : 3;
                                if (questionIndex % groupSize !== 0) return null;

                                const globalStart = onGetGlobalNumber(questionIndex);
                                const actualGroupSize = Math.min(groupSize, manualQuestions.length - questionIndex);
                                const globalEnd = globalStart + actualGroupSize - 1;
                                const groupOrder = Math.floor(questionIndex / groupSize) + 1;
                                const groupKey = `${partIndex}-${questionIndex}`;
                                const groupPanel = groupPanels[groupKey];

                                return (
                                    <MCQGroupRow
                                        key={groupKey}
                                        partIndex={partIndex}
                                        groupStart={questionIndex}
                                        groupSize={actualGroupSize}
                                        groupOrder={groupOrder}
                                        globalStart={globalStart}
                                        globalEnd={globalEnd}
                                        flags={flags}
                                        panelMode={groupPanel}
                                        form={form}
                                        groupImages={groupImages}
                                        onChangeMode={(mode) => onSetGroupPanel(partIndex, questionIndex, mode)}
                                        onRemoveGroup={() => onRemoveGroup(questionIndex, groupSize)}
                                        getGlobalNumber={onGetGlobalNumber}
                                    />
                                );
                            }

                            // Non-grouped parts (1, 2, 5)
                            const questionKey = `${partIndex}-${questionIndex}`;
                            const panelMode = questionPanels[questionKey];

                            return (
                                <MCQQuestionRow
                                    key={questionKey}
                                    partIndex={partIndex}
                                    questionIndex={questionIndex}
                                    globalNumber={onGetGlobalNumber(questionIndex)}
                                    flags={flags}
                                    panelMode={panelMode}
                                    uploadingField={uploadingField}
                                    form={form}
                                    onSetPanel={(mode) => onSetQuestionPanel(partIndex, questionIndex, mode)}
                                    onRemove={() => onRemoveQuestion(questionIndex)}
                                    onUploadImage={(file) => onUploadQuestionImage(questionIndex, file)}
                                />
                            );
                        })}

                        {manualQuestions.length === 0 && (
                            <p className="text-sm text-muted-foreground italic">
                                Chưa có câu nào. Nhấn "+ Thêm câu" để cấu hình từng câu riêng.
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
