import { useState } from 'react';
import { useFieldArray, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { IModuleMCQ, AiImportedQuestion } from '../../../../types';
import { mcqModuleSchema, type MCQModuleFormValues } from './schema';
import { getPartFlags } from './utils/partFlags';
import { createDefaultQuestion } from './utils/questionFactory';
import { useMCQDraft } from './hooks/useMCQDraft';
import { usePart7Groups } from './hooks/usePart7Groups';
import { useGroupImages } from './hooks/useGroupImages';
import { MCQPartCard } from './MCQPartCard';
import { MCQAiImportDialog } from './MCQAiImportDialog';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOEIC_PART_PRESETS = [
    { part: 1, name: 'Part 1 — Photographs', poolTag: 'toeic-listening-part1' },
    { part: 2, name: 'Part 2 — Question-Response', poolTag: 'toeic-listening-part2' },
    { part: 3, name: 'Part 3 — Short Conversations', poolTag: 'toeic-listening-part3' },
    { part: 4, name: 'Part 4 — Short Talks', poolTag: 'toeic-listening-part4' },
    { part: 5, name: 'Part 5 — Incomplete Sentences', poolTag: 'toeic-reading-part5' },
    { part: 6, name: 'Part 6 — Text Completion', poolTag: 'toeic-reading-part6' },
    { part: 7, name: 'Part 7 — Reading Comprehension', poolTag: 'toeic-reading-part7' },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    defaultValues?: Partial<IModuleMCQ>;
    order: number;
    onSave: (data: IModuleMCQ) => void;
    onCancel: () => void;
    draftKey?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildNormalizedParts(defaultValues: Partial<IModuleMCQ> | undefined): MCQModuleFormValues['parts'] {
    return TOEIC_PART_PRESETS.map((preset) => {
        const existingPart = defaultValues?.parts?.find((p) => p.part === preset.part);
        const existingManualQuestions =
            existingPart?.manualContent?.questionItems?.map((item) => ({
                question: item.question,
                optionA: item.options.A,
                optionB: item.options.B,
                optionC: item.options.C,
                optionD: item.options.D,
                correctOption: item.correctOption,
                explanation: item.explanation ?? '',
                transcript: item.transcript ?? '',
                mediaUrl: item.mediaUrl ?? '',
                imageUrl: item.imageUrl ?? '',
                imageUrls: item.imageUrls ?? (item.imageUrl ? [item.imageUrl] : []),
                audioUrl: item.audioUrl ?? '',
            })) ?? [];

        return {
            part: preset.part,
            enabled: existingPart !== undefined,
            name: existingPart?.name ?? preset.name,
            questionsCount: existingPart?.questionsCount ?? 1,
            poolTag: existingPart?.poolTag ?? preset.poolTag,
            groupPattern: existingPart?.manualContent?.groupPattern ?? [],
            sharedAudioUrl:
                existingPart?.manualContent?.media?.audioUrl
                ?? existingPart?.manualContent?.questionItems?.find((item) => !!item.audioUrl)?.audioUrl
                ?? '',
            excludeRecentDays: existingPart?.excludeRecentDays ?? 30,
            manualQuestions: existingManualQuestions,
        };
    });
}

// ─── MCQModuleForm ─────────────────────────────────────────────────────────────

export function MCQModuleForm({ defaultValues, order, onSave, onCancel, draftKey }: Props) {
    // ── Form ──────────────────────────────────────────────────────────────────
    const form = useForm<MCQModuleFormValues>({
        resolver: zodResolver(mcqModuleSchema) as Resolver<MCQModuleFormValues>,
        defaultValues: {
            name: defaultValues?.name ?? 'TOEIC Listening + Reading',
            timeLimitMinutes: defaultValues?.timeLimitMinutes ?? 45,
            parts: buildNormalizedParts(defaultValues),
        },
    });

    const { fields } = useFieldArray({ control: form.control, name: 'parts' });

    // ── Hooks ─────────────────────────────────────────────────────────────────
    useMCQDraft(draftKey, form);
    const part7Groups = usePart7Groups(form);
    const groupImages = useGroupImages(form);

    // ── Local UI state ────────────────────────────────────────────────────────
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [questionPanels, setQuestionPanels] = useState<Partial<Record<string, 'view' | 'edit'>>>({});
    const [groupPanels, setGroupPanels] = useState<Partial<Record<string, 'view' | 'edit'>>>({});
    const [aiImportPartIndex, setAiImportPartIndex] = useState<number | null>(null);

    // ── Panel helpers ─────────────────────────────────────────────────────────

    function setQuestionPanel(partIndex: number, questionIndex: number, mode: 'view' | 'edit' | undefined): void {
        const key = `${partIndex}-${questionIndex}`;
        setQuestionPanels((prev) => {
            const next = { ...prev };
            if (mode) { next[key] = mode; } else { delete next[key]; }
            return next;
        });
    }

    function setGroupPanel(partIndex: number, groupStart: number, mode: 'view' | 'edit' | undefined): void {
        const key = `${partIndex}-${groupStart}`;
        setGroupPanels((prev) => {
            const next = { ...prev };
            if (mode) { next[key] = mode; } else { delete next[key]; }
            return next;
        });
    }

    // ── Audio helpers ─────────────────────────────────────────────────────────

    function getPartSharedAudio(partIndex: number): string {
        return form.getValues(`parts.${partIndex}.sharedAudioUrl`)
            || form.getValues(`parts.${partIndex}.manualQuestions.0.audioUrl`)
            || '';
    }

    function setSharedAudioForPart(partIndex: number, audioUrl: string): void {
        form.setValue(`parts.${partIndex}.sharedAudioUrl`, audioUrl, { shouldDirty: true, shouldValidate: true });
        const currentQuestions = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        form.setValue(
            `parts.${partIndex}.manualQuestions`,
            currentQuestions.map((q) => ({ ...q, audioUrl })),
            { shouldDirty: true, shouldValidate: true },
        );
    }

    // ── Upload helpers ────────────────────────────────────────────────────────

    async function uploadMediaFile(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'placement-tests/manual/question-items');
        const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>('/upload', formData);
        return response.data.data.url;
    }

    async function handleUploadPartAudio(partIndex: number, file: File): Promise<void> {
        const fieldKey = `${partIndex}-part-audio`;
        setUploadingField(fieldKey);
        try {
            const url = await uploadMediaFile(file);
            setSharedAudioForPart(partIndex, url);
            toast.success('Đã upload audio chung cho part');
        } catch {
            toast.error('Upload audio thất bại');
        } finally {
            setUploadingField(null);
        }
    }

    async function handleUploadQuestionImage(partIndex: number, questionIndex: number, file: File): Promise<void> {
        const fieldKey = `${partIndex}-${questionIndex}-imageUrl`;
        setUploadingField(fieldKey);
        try {
            const url = await uploadMediaFile(file);
            form.setValue(`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`, url, {
                shouldDirty: true,
                shouldValidate: true,
            });
            toast.success('Đã upload ảnh lên Cloudinary');
        } catch {
            toast.error('Upload file thất bại');
        } finally {
            setUploadingField(null);
        }
    }

    // ── Question mutation helpers ─────────────────────────────────────────────

    function addManualQuestion(partIndex: number): void {
        const current = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        const partNumber = Number(form.getValues(`parts.${partIndex}.part`));
        const poolTag = form.getValues(`parts.${partIndex}.poolTag`) ?? '';
        const flags = getPartFlags(partNumber, poolTag);
        const sharedAudio = getPartSharedAudio(partIndex).trim();

        if (flags.isGroupedPart) {
            let groupSize: number;
            if (flags.isPart6) {
                groupSize = 4;
            } else if (flags.isPart7) {
                const pattern = part7Groups.getPart7GroupPattern(partIndex);
                const defaultSize = part7Groups.getPart7GroupSize(partIndex);
                if (pattern.length > 0) {
                    let running = 0;
                    let idx = 0;
                    while (idx < pattern.length && running < current.length) {
                        running += pattern[idx] ?? defaultSize;
                        idx += 1;
                    }
                    groupSize = pattern[idx] ?? defaultSize;
                } else {
                    groupSize = defaultSize;
                }
            } else {
                groupSize = 3; // Part 3, 4
            }

            const nextGroup = Array.from({ length: groupSize }, (_, offset) =>
                createDefaultQuestion(partNumber, current.length + offset, flags.hasSharedAudio ? sharedAudio : ''),
            );
            form.setValue(`parts.${partIndex}.manualQuestions`, [...current, ...nextGroup], { shouldDirty: true });
            return;
        }

        const next = createDefaultQuestion(partNumber, current.length, flags.hasSharedAudio ? sharedAudio : '');
        form.setValue(`parts.${partIndex}.manualQuestions`, [...current, next], { shouldDirty: true });
    }

    function removeManualQuestion(partIndex: number, questionIndex: number): void {
        const current = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        form.setValue(
            `parts.${partIndex}.manualQuestions`,
            current.filter((_, i) => i !== questionIndex),
            { shouldDirty: true },
        );
        setQuestionPanel(partIndex, questionIndex, undefined);
    }

    function removeQuestionGroup(partIndex: number, groupStart: number, groupSize: number): void {
        const current = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        form.setValue(
            `parts.${partIndex}.manualQuestions`,
            current.filter((_, i) => i < groupStart || i >= groupStart + groupSize),
            { shouldDirty: true },
        );
        setGroupPanel(partIndex, groupStart, undefined);
    }

    function getGlobalQuestionNumber(partIndex: number, questionIndex: number): number {
        const allParts = form.getValues('parts') ?? [];
        const total = allParts
            .slice(0, partIndex)
            .reduce((acc, p) => acc + (p.manualQuestions?.length ?? 0), 0);
        return total + questionIndex + 1;
    }

    // ── AI import ─────────────────────────────────────────────────────────────

    function handleAiApply(questions: AiImportedQuestion[], groupPattern: number[] | null): void {
        if (aiImportPartIndex === null) return;

        const partNumber = Number(form.getValues(`parts.${aiImportPartIndex}.part`)) || 3;
        const sharedAudio = getPartSharedAudio(aiImportPartIndex).trim();

        const mapped = questions.map((item) => ({
            question: item.question,
            optionA: item.optionA,
            optionB: item.optionB,
            optionC: item.optionC,
            optionD: partNumber === 2 ? 'N/A' : item.optionD,
            correctOption: (partNumber === 2 && item.correctOption === 'D' ? 'A' : item.correctOption) as 'A' | 'B' | 'C' | 'D',
            explanation: item.explanation ?? '',
            transcript: item.transcript ?? '',
            mediaUrl: '',
            imageUrl: '',
            imageUrls: [] as string[],
            audioUrl: sharedAudio,
        }));

        form.setValue(`parts.${aiImportPartIndex}.manualQuestions`, mapped, { shouldDirty: true, shouldValidate: true });

        if (partNumber === 7 && groupPattern && groupPattern.length > 0) {
            part7Groups.setPart7GroupPattern(aiImportPartIndex, groupPattern);
        }

        setAiImportPartIndex(null);
        toast.success(`Đã nạp câu hỏi vào Part ${partNumber}`);
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    function onSubmit(values: MCQModuleFormValues): void {
        if (draftKey) {
            localStorage.removeItem(draftKey);
        }

        const enabledParts = values.parts.filter((part) => part.enabled);

        onSave({
            order,
            type: 'mcq',
            ...values,
            parts: enabledParts.map((part) => {
                const partIndex = values.parts.findIndex((candidate) => candidate.part === part.part);
                const partPoolTag = part.poolTag.toLowerCase();
                const flags = getPartFlags(part.part, partPoolTag);
                const normalizedSharedAudioUrl = part.sharedAudioUrl?.trim() || undefined;

                const normalizedQuestionItems = part.manualQuestions
                    .map((q, idx) => ({
                        question: flags.isPart1
                            ? (q.question.trim() || `Part 1 Question ${idx + 1}`)
                            : flags.isPart2
                                ? (q.question.trim() || `Part 2 Question ${idx + 1}`)
                                : q.question.trim(),
                        options: {
                            A: flags.isPart1 ? (q.optionA.trim() || 'A') : q.optionA.trim(),
                            B: flags.isPart1 ? (q.optionB.trim() || 'B') : q.optionB.trim(),
                            C: flags.isPart1 ? (q.optionC.trim() || 'C') : q.optionC.trim(),
                            D: flags.isPart1
                                ? (q.optionD.trim() || 'D')
                                : flags.isPart2
                                    ? (q.optionD.trim() || 'N/A')
                                    : q.optionD.trim(),
                        },
                        correctOption: (flags.isPart2 && q.correctOption === 'D' ? 'A' : q.correctOption) as 'A' | 'B' | 'C' | 'D',
                        explanation: q.explanation?.trim() || undefined,
                        transcript: q.transcript?.trim() || undefined,
                        mediaUrl: q.mediaUrl || undefined,
                        imageUrl: (q.imageUrls ?? []).find((u) => !!u.trim()) || q.imageUrl || undefined,
                        imageUrls: (q.imageUrls ?? []).map((u) => u.trim()).filter(Boolean),
                        audioUrl: q.audioUrl || undefined,
                    }))
                    .filter((q) => q.question);

                return {
                    part: part.part,
                    name: part.name,
                    questionsCount: Math.max(1, normalizedQuestionItems.length),
                    poolTag: part.poolTag,
                    manualContent: {
                        groupPattern: flags.isPart7
                            ? part7Groups
                                .getPart7GroupPattern(partIndex)
                                .map((v) => Math.max(2, Math.min(7, Number(v))))
                                .filter((v) => Number.isFinite(v))
                            : [],
                        questions: part.manualQuestions.map((q) => q.question.trim()).filter(Boolean),
                        questionItems: normalizedQuestionItems,
                        media: { audioUrl: normalizedSharedAudioUrl },
                    },
                };
            }),
        } as IModuleMCQ);
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* General settings */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Tên module</FormLabel>
                                <FormControl><Input className="h-11" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="timeLimitMinutes"
                        render={({ field }) => (
                            <FormItem className="max-w-xs">
                                <FormLabel>Thời gian (phút)</FormLabel>
                                <FormControl><Input className="h-11" type="number" min={1} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Separator />

                {/* Parts */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-semibold">Parts</p>
                        <p className="text-xs text-muted-foreground">Mặc định 7 part TOEIC</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {fields.map((partField, partIndex) => (
                            <FormField
                                key={`${partField.id}-enabled`}
                                control={form.control}
                                name={`parts.${partIndex}.enabled`}
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-2">
                                        <FormLabel className="!mt-0 text-xs">Part {partIndex + 1}</FormLabel>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        ))}
                    </div>

                    {fields.map((partField, partIndex) => {
                        const partNumber = Number(form.watch(`parts.${partIndex}.part`));
                        const isEnabled = form.watch(`parts.${partIndex}.enabled`);
                        const poolTag = form.watch(`parts.${partIndex}.poolTag`) ?? '';
                        const flags = getPartFlags(partNumber, poolTag);

                        if (!isEnabled) {
                            return null;
                        }

                        return (
                            <MCQPartCard
                                key={partField.id}
                                partIndex={partIndex}
                                form={form}
                                flags={flags}
                                uploadingField={uploadingField}
                                questionPanels={questionPanels}
                                groupPanels={groupPanels}
                                part7Groups={part7Groups}
                                groupImages={groupImages}
                                onSetQuestionPanel={setQuestionPanel}
                                onSetGroupPanel={setGroupPanel}
                                onAddQuestion={() => addManualQuestion(partIndex)}
                                onRemoveQuestion={(qi) => removeManualQuestion(partIndex, qi)}
                                onRemoveGroup={(start, size) => removeQuestionGroup(partIndex, start, size)}
                                onUploadPartAudio={(file) => handleUploadPartAudio(partIndex, file)}
                                onUploadQuestionImage={(qi, file) => handleUploadQuestionImage(partIndex, qi, file)}
                                onGetSharedAudio={() => getPartSharedAudio(partIndex)}
                                onSetSharedAudio={(url) => setSharedAudioForPart(partIndex, url)}
                                onGetGlobalNumber={(qi) => getGlobalQuestionNumber(partIndex, qi)}
                                onOpenAiImport={() => setAiImportPartIndex(partIndex)}
                            />
                        );
                    })}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
                    <Button type="submit">Lưu module</Button>
                </div>
            </form>

            {/* AI Import Dialog */}
            {aiImportPartIndex !== null && (
                <MCQAiImportDialog
                    open={true}
                    partNumber={Number(form.getValues(`parts.${aiImportPartIndex}.part`))}
                    onClose={() => setAiImportPartIndex(null)}
                    onApply={handleAiApply}
                />
            )}
        </Form>
    );
}
