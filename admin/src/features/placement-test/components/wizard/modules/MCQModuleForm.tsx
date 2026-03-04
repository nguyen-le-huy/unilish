import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { IModuleMCQ } from '../../../types';

const manualQuestionSchema = z.object({
    question: z.string().min(1, 'Nhập câu hỏi'),
    optionA: z.string().min(1, 'Nhập đáp án A'),
    optionB: z.string().min(1, 'Nhập đáp án B'),
    optionC: z.string().min(1, 'Nhập đáp án C'),
    optionD: z.string().min(1, 'Nhập đáp án D'),
    correctOption: z.enum(['A', 'B', 'C', 'D']).default('A'),
    explanation: z.string().optional().default(''),
    transcript: z.string().optional().default(''),
    mediaUrl: z.string().url('URL media không hợp lệ').optional().or(z.literal('')),
    imageUrl: z.string().url('URL ảnh không hợp lệ').optional().or(z.literal('')),
    audioUrl: z.string().url('URL audio không hợp lệ').optional().or(z.literal('')),
});

const partSchema = z.object({
    part: z.coerce.number().min(1),
    name: z.string().min(1),
    questionsCount: z.coerce.number().min(1).default(1),
    poolTag: z.string().min(1),
    excludeRecentDays: z.coerce.number().min(0).default(30),
    manualQuestions: z.array(manualQuestionSchema).default([]),
});

const mcqModuleSchema = z.object({
    name: z.string().min(1, 'Bắt buộc'),
    timeLimitMinutes: z.coerce.number().min(1),
    showCountdown: z.boolean().default(true),
    allowBackNavigation: z.boolean().default(false),
    adaptive: z.boolean().default(false),
    parts: z.array(partSchema).min(1, 'Cần ít nhất 1 part'),
});

type MCQModuleFormValues = z.infer<typeof mcqModuleSchema>;

interface Props {
    defaultValues?: Partial<IModuleMCQ>;
    order: number;
    onSave: (data: IModuleMCQ) => void;
    onCancel: () => void;
}

const TOEIC_PART_PRESETS = [
    { part: 1, name: 'Part 1 — Photographs', poolTag: 'toeic-listening-part1' },
    { part: 2, name: 'Part 2 — Question-Response', poolTag: 'toeic-listening-part2' },
    { part: 3, name: 'Part 3 — Short Conversations', poolTag: 'toeic-listening-part3' },
    { part: 4, name: 'Part 4 — Short Talks', poolTag: 'toeic-listening-part4' },
    { part: 5, name: 'Part 5 — Incomplete Sentences', poolTag: 'toeic-reading-part5' },
    { part: 6, name: 'Part 6 — Text Completion', poolTag: 'toeic-reading-part6' },
    { part: 7, name: 'Part 7 — Reading Comprehension', poolTag: 'toeic-reading-part7' },
] as const;

function createEmptyManualQuestion(): MCQModuleFormValues['parts'][number]['manualQuestions'][number] {
    return {
        question: '',
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
        transcript: '',
        mediaUrl: '',
        imageUrl: '',
        audioUrl: '',
    };
}

function createPart1Question(index: number): MCQModuleFormValues['parts'][number]['manualQuestions'][number] {
    return {
        question: `Part 1 Question ${index + 1}`,
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'D',
        correctOption: 'A',
        explanation: '',
        transcript: '',
        mediaUrl: '',
        imageUrl: '',
        audioUrl: '',
    };
}

function createPart2Question(index: number): MCQModuleFormValues['parts'][number]['manualQuestions'][number] {
    return {
        question: `Part 2 Question ${index + 1}`,
        optionA: 'A',
        optionB: 'B',
        optionC: 'C',
        optionD: 'N/A',
        correctOption: 'A',
        explanation: '',
        transcript: '',
        mediaUrl: '',
        imageUrl: '',
        audioUrl: '',
    };
}

export function MCQModuleForm({ defaultValues, order, onSave, onCancel }: Props) {
    const [uploadingField, setUploadingField] = useState<string | null>(null);

    const normalizedPartsDefaults: MCQModuleFormValues['parts'] = TOEIC_PART_PRESETS.map((preset) => {
        const existingPart = defaultValues?.parts?.find((part) => part.part === preset.part);

        return {
            part: preset.part,
            name: existingPart?.name ?? preset.name,
            questionsCount: existingPart?.questionsCount ?? 1,
            poolTag: existingPart?.poolTag ?? preset.poolTag,
            excludeRecentDays: existingPart?.excludeRecentDays ?? 30,
            manualQuestions:
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
                    audioUrl: item.audioUrl ?? '',
                })) ?? [],
        };
    });

    const form = useForm<MCQModuleFormValues>({
        resolver: zodResolver(mcqModuleSchema),
        defaultValues: {
            name: defaultValues?.name ?? 'TOEIC Compact (Listening + Reading)',
            timeLimitMinutes: defaultValues?.timeLimitMinutes ?? 45,
            showCountdown: defaultValues?.showCountdown ?? true,
            allowBackNavigation: defaultValues?.allowBackNavigation ?? false,
            adaptive: defaultValues?.adaptive ?? false,
            parts: normalizedPartsDefaults,
        },
    });

    const { fields } = useFieldArray({ control: form.control, name: 'parts' });

    async function uploadMediaFile(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'placement-tests/manual/question-items');

        const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>('/upload', formData);
        return response.data.data.url;
    }

    async function handleQuestionAssetUpload(
        partIndex: number,
        questionIndex: number,
        targetField: 'imageUrl' | 'audioUrl',
        file: File,
    ) {
        const fieldKey = `${partIndex}-${questionIndex}-${targetField}`;
        setUploadingField(fieldKey);

        try {
            const uploadedUrl = await uploadMediaFile(file);
            form.setValue(
                `parts.${partIndex}.manualQuestions.${questionIndex}.${targetField}`,
                uploadedUrl,
                { shouldDirty: true, shouldValidate: true },
            );

            if (targetField === 'imageUrl') {
                toast.success('Đã upload ảnh lên Cloudinary');
            } else {
                toast.success('Đã upload audio lên R2');
            }
        } catch {
            toast.error('Upload file thất bại');
        } finally {
            setUploadingField(null);
        }
    }

    function setPart3SharedAudio(partIndex: number, groupStartIndex: number, audioUrl: string) {
        for (let offset = 0; offset < 3; offset += 1) {
            const questionIndex = groupStartIndex + offset;
            const question = form.getValues(`parts.${partIndex}.manualQuestions.${questionIndex}`);
            if (!question) break;

            form.setValue(
                `parts.${partIndex}.manualQuestions.${questionIndex}.audioUrl`,
                audioUrl,
                { shouldDirty: true, shouldValidate: true },
            );
        }
    }

    async function handlePart3SharedAudioUpload(partIndex: number, groupStartIndex: number, file: File) {
        const fieldKey = `${partIndex}-group-${groupStartIndex}-audio`;
        setUploadingField(fieldKey);

        try {
            const uploadedUrl = await uploadMediaFile(file);
            setPart3SharedAudio(partIndex, groupStartIndex, uploadedUrl);
            toast.success('Đã upload audio chung cho cụm 3 câu (Part 3)');
        } catch {
            toast.error('Upload audio thất bại');
        } finally {
            setUploadingField(null);
        }
    }

    function addManualQuestion(partIndex: number) {
        const current = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        const partNumber = Number(form.getValues(`parts.${partIndex}.part`));
        const poolTag = (form.getValues(`parts.${partIndex}.poolTag`) ?? '').toLowerCase();
        const isPart1Listening = partNumber === 1 || poolTag.includes('toeic-listening-part1');
        const isPart2Listening = partNumber === 2 || poolTag.includes('toeic-listening-part2');

        const nextQuestion = isPart1Listening
            ? createPart1Question(current.length)
            : isPart2Listening
                ? createPart2Question(current.length)
                : createEmptyManualQuestion();

        form.setValue(`parts.${partIndex}.manualQuestions`, [...current, nextQuestion], { shouldDirty: true });
    }

    function removeManualQuestion(partIndex: number, questionIndex: number) {
        const current = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        form.setValue(
            `parts.${partIndex}.manualQuestions`,
            current.filter((_, index) => index !== questionIndex),
            { shouldDirty: true },
        );
    }

    function onSubmit(values: MCQModuleFormValues) {
        onSave({
            order,
            type: 'mcq',
            samplingMode: 'random',
            difficultyDistribution: {},
            ...values,
            parts: values.parts.map((part) => {
                const partPoolTag = part.poolTag.toLowerCase();
                const isPart1Listening = part.part === 1 || partPoolTag.includes('toeic-listening-part1');
                const isPart2Listening = part.part === 2 || partPoolTag.includes('toeic-listening-part2');

                const normalizedQuestionItems = part.manualQuestions
                    .map((question, index) => ({
                        question: isPart1Listening
                            ? (question.question.trim() || `Part 1 Question ${index + 1}`)
                            : isPart2Listening
                                ? (question.question.trim() || `Part 2 Question ${index + 1}`)
                                : question.question.trim(),
                        options: {
                            A: isPart1Listening ? (question.optionA.trim() || 'A') : question.optionA.trim(),
                            B: isPart1Listening ? (question.optionB.trim() || 'B') : question.optionB.trim(),
                            C: isPart1Listening ? (question.optionC.trim() || 'C') : question.optionC.trim(),
                            D: isPart1Listening
                                ? (question.optionD.trim() || 'D')
                                : isPart2Listening
                                    ? (question.optionD.trim() || 'N/A')
                                    : question.optionD.trim(),
                        },
                        correctOption: isPart2Listening && question.correctOption === 'D' ? 'A' : question.correctOption,
                        explanation: question.explanation?.trim() || undefined,
                        transcript: question.transcript?.trim() || undefined,
                        mediaUrl: question.mediaUrl || undefined,
                        imageUrl: question.imageUrl || undefined,
                        audioUrl: question.audioUrl || undefined,
                    }))
                    .filter((question) => question.question);

                return {
                    part: part.part,
                    name: part.name,
                    questionsCount: Math.max(1, normalizedQuestionItems.length),
                    poolTag: part.poolTag,
                    excludeRecentDays: 30,
                    difficultyDistribution: {},
                    topicFilter: [],
                    manualContent: {
                        questions: part.manualQuestions.map((question) => question.question.trim()).filter(Boolean),
                        questionItems: normalizedQuestionItems,
                    },
                };
            }),
        } as IModuleMCQ);
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel>Tên module</FormLabel>
                            <FormControl><Input className="h-11" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="timeLimitMinutes" render={({ field }) => (
                        <FormItem className="max-w-xs">
                            <FormLabel>Thời gian (phút)</FormLabel>
                            <FormControl><Input className="h-11" type="number" min={1} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="flex flex-wrap gap-6">
                    {(['showCountdown', 'allowBackNavigation', 'adaptive'] as const).map((key) => (
                        <FormField key={key} control={form.control} name={key} render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="!mt-0 text-sm">
                                    {key === 'showCountdown' ? 'Đếm ngược' : key === 'allowBackNavigation' ? 'Cho phép xem lại' : 'Adaptive'}
                                </FormLabel>
                            </FormItem>
                        )} />
                    ))}
                </div>

                <Separator />

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-base font-semibold">Parts</p>
                        <p className="text-xs text-muted-foreground">Mặc định 7 part TOEIC</p>
                    </div>

                    {fields.map((partField, partIndex) => (
                        <Card key={partField.id} className="bg-muted/20 border rounded-xl">
                            <CardHeader className="py-4 px-5 flex flex-row items-center justify-between">
                                <CardTitle className="text-lg">Part {partIndex + 1}</CardTitle>
                                <span className="text-xs text-muted-foreground">Cố định</span>
                            </CardHeader>

                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-5">
                                <FormField control={form.control} name={`parts.${partIndex}.name`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tên</FormLabel>
                                        <FormControl><Input className="h-10" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name={`parts.${partIndex}.poolTag`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Pool Tag</FormLabel>
                                        <FormControl><Input className="h-10 font-mono" placeholder="toeic-listening-part1" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm flex items-center">
                                    <span className="text-muted-foreground">Số câu: </span>
                                    <span className="ml-1 font-semibold">{(form.watch(`parts.${partIndex}.manualQuestions`) ?? []).length}</span>
                                </div>

                                <div className="md:col-span-2 mt-2 rounded-xl border bg-background p-4 space-y-4">
                                    <p className="text-sm font-semibold">Soạn đề thủ công (TOEIC Listening/Reading)</p>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">Cấu hình từng câu</p>
                                            <Button type="button" variant="outline" size="sm" onClick={() => addManualQuestion(partIndex)}>
                                                + Thêm câu
                                            </Button>
                                        </div>

                                        {(form.watch(`parts.${partIndex}.manualQuestions`) ?? []).map((_, questionIndex) => {
                                            const partNumber = Number(form.watch(`parts.${partIndex}.part`));
                                            const poolTag = (form.watch(`parts.${partIndex}.poolTag`) ?? '').toLowerCase();
                                            const isListeningPart = (partNumber >= 1 && partNumber <= 4) || poolTag.includes('toeic-listening-part');
                                            const isPart1Listening = partNumber === 1 || poolTag.includes('toeic-listening-part1');
                                            const isPart2Listening = partNumber === 2 || poolTag.includes('toeic-listening-part2');
                                            const isPart3Listening = partNumber === 3 || poolTag.includes('toeic-listening-part3');
                                            const isPart3GroupStart = isPart3Listening && questionIndex % 3 === 0;

                                            return (
                                                <div key={`${partIndex}-${questionIndex}`} className="rounded-lg border p-3 bg-muted/10 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium">Câu {questionIndex + 1}</p>
                                                        <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeManualQuestion(partIndex, questionIndex)}>
                                                            Xóa
                                                        </Button>
                                                    </div>

                                                    {!isPart1Listening && !isPart2Listening && (
                                                        <>
                                                            <FormField control={form.control} name={`parts.${partIndex}.manualQuestions.${questionIndex}.question`} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Nội dung câu hỏi</FormLabel>
                                                                    <FormControl><Textarea rows={2} placeholder="Nhập câu hỏi..." {...field} /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {([
                                                                    { key: 'optionA', label: 'Đáp án A' },
                                                                    { key: 'optionB', label: 'Đáp án B' },
                                                                    { key: 'optionC', label: 'Đáp án C' },
                                                                    { key: 'optionD', label: 'Đáp án D' },
                                                                ] as const).map((optionMeta) => (
                                                                    <FormField
                                                                        key={optionMeta.key}
                                                                        control={form.control}
                                                                        name={`parts.${partIndex}.manualQuestions.${questionIndex}.${optionMeta.key}`}
                                                                        render={({ field }) => (
                                                                            <FormItem>
                                                                                <FormLabel>{optionMeta.label}</FormLabel>
                                                                                <FormControl><Input className="h-10" {...field} /></FormControl>
                                                                                <FormMessage />
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}

                                                    {isPart2Listening && (
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

                                                    {isPart3Listening && (
                                                        <div className="rounded-lg border bg-background p-3 space-y-3">
                                                            {isPart3GroupStart && (
                                                                <>
                                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                                        Audio chung cho cụm 3 câu (Part 3)
                                                                    </p>
                                                                    <FormItem>
                                                                        <FormLabel>Audio chung cụm này (R2)</FormLabel>
                                                                        <FormControl>
                                                                            <Input
                                                                                className="h-10"
                                                                                placeholder="https://..."
                                                                                value={form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.audioUrl`) || ''}
                                                                                onChange={(event) => setPart3SharedAudio(partIndex, questionIndex, event.target.value)}
                                                                            />
                                                                        </FormControl>
                                                                    </FormItem>

                                                                    <label className="inline-flex">
                                                                        <input
                                                                            className="hidden"
                                                                            type="file"
                                                                            accept="audio/*"
                                                                            onChange={async (event) => {
                                                                                const file = event.target.files?.[0];
                                                                                if (!file) return;
                                                                                await handlePart3SharedAudioUpload(partIndex, questionIndex, file);
                                                                                event.currentTarget.value = '';
                                                                            }}
                                                                        />
                                                                        <Button
                                                                            type="button"
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-9"
                                                                            disabled={uploadingField === `${partIndex}-group-${questionIndex}-audio`}
                                                                            asChild
                                                                        >
                                                                            <span>
                                                                                {uploadingField === `${partIndex}-group-${questionIndex}-audio`
                                                                                    ? 'Đang upload audio...'
                                                                                    : 'Upload audio chung lên R2'}
                                                                            </span>
                                                                        </Button>
                                                                    </label>
                                                                </>
                                                            )}

                                                            <FormField
                                                                control={form.control}
                                                                name={`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Hình riêng câu này (tuỳ chọn)</FormLabel>
                                                                        <FormControl><Input className="h-10" placeholder="https://..." {...field} /></FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <label className="inline-flex">
                                                                <input
                                                                    className="hidden"
                                                                    type="file"
                                                                    accept="image/*"
                                                                    onChange={async (event) => {
                                                                        const file = event.target.files?.[0];
                                                                        if (!file) return;
                                                                        await handleQuestionAssetUpload(partIndex, questionIndex, 'imageUrl', file);
                                                                        event.currentTarget.value = '';
                                                                    }}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-9"
                                                                    disabled={uploadingField === `${partIndex}-${questionIndex}-imageUrl`}
                                                                    asChild
                                                                >
                                                                    <span>
                                                                        {uploadingField === `${partIndex}-${questionIndex}-imageUrl`
                                                                            ? 'Đang upload ảnh...'
                                                                            : 'Upload hình câu này'}
                                                                    </span>
                                                                </Button>
                                                            </label>
                                                        </div>
                                                    )}

                                                    {isPart1Listening && (
                                                        <div className="rounded-lg border bg-background p-3">
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                                                Preview dạng Part 1
                                                            </p>
                                                            <div className="rounded-lg border p-2 bg-muted/20 mb-3 flex justify-center">
                                                                {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`) ? (
                                                                    <img
                                                                        src={form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`)}
                                                                        alt={`Part 1 question ${questionIndex + 1}`}
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

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        <FormField control={form.control} name={`parts.${partIndex}.manualQuestions.${questionIndex}.correctOption`} render={({ field }) => (
                                                            <FormItem>
                                                                <FormLabel>Đáp án đúng</FormLabel>
                                                                <Select value={field.value} onValueChange={field.onChange}>
                                                                    <FormControl>
                                                                        <SelectTrigger className="h-10">
                                                                            <SelectValue placeholder="Chọn đáp án" />
                                                                        </SelectTrigger>
                                                                    </FormControl>
                                                                    <SelectContent>
                                                                        {(isPart2Listening ? ['A', 'B', 'C'] : ['A', 'B', 'C', 'D'] as const).map((option) => (
                                                                            <SelectItem key={option} value={option}>{option}</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                                <FormMessage />
                                                            </FormItem>
                                                        )} />

                                                        {!isListeningPart && (
                                                            <FormField control={form.control} name={`parts.${partIndex}.manualQuestions.${questionIndex}.mediaUrl`} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Media URL riêng (tuỳ chọn)</FormLabel>
                                                                    <FormControl><Input className="h-10" placeholder="https://..." {...field} /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                        )}
                                                    </div>

                                                    {isPart1Listening && (
                                                        <div className="rounded-lg border bg-background p-3 space-y-3">
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                                Media riêng cho Part 1 (Listening Photographs)
                                                            </p>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                                                                <FormField
                                                                    control={form.control}
                                                                    name={`parts.${partIndex}.manualQuestions.${questionIndex}.audioUrl`}
                                                                    render={({ field }) => (
                                                                        <FormItem>
                                                                            <FormLabel>Audio riêng câu này (R2)</FormLabel>
                                                                            <FormControl><Input className="h-10" placeholder="https://..." {...field} /></FormControl>
                                                                            <FormMessage />
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            </div>

                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                <label className="inline-flex">
                                                                    <input
                                                                        className="hidden"
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={async (event) => {
                                                                            const file = event.target.files?.[0];
                                                                            if (!file) return;
                                                                            await handleQuestionAssetUpload(partIndex, questionIndex, 'imageUrl', file);
                                                                            event.currentTarget.value = '';
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-9"
                                                                        disabled={uploadingField === `${partIndex}-${questionIndex}-imageUrl`}
                                                                        asChild
                                                                    >
                                                                        <span>
                                                                            {uploadingField === `${partIndex}-${questionIndex}-imageUrl`
                                                                                ? 'Đang upload ảnh...'
                                                                                : 'Upload ảnh lên Cloudinary'}
                                                                        </span>
                                                                    </Button>
                                                                </label>

                                                                <label className="inline-flex">
                                                                    <input
                                                                        className="hidden"
                                                                        type="file"
                                                                        accept="audio/*"
                                                                        onChange={async (event) => {
                                                                            const file = event.target.files?.[0];
                                                                            if (!file) return;
                                                                            await handleQuestionAssetUpload(partIndex, questionIndex, 'audioUrl', file);
                                                                            event.currentTarget.value = '';
                                                                        }}
                                                                    />
                                                                    <Button
                                                                        type="button"
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="h-9"
                                                                        disabled={uploadingField === `${partIndex}-${questionIndex}-audioUrl`}
                                                                        asChild
                                                                    >
                                                                        <span>
                                                                            {uploadingField === `${partIndex}-${questionIndex}-audioUrl`
                                                                                ? 'Đang upload audio...'
                                                                                : 'Upload audio lên R2'}
                                                                        </span>
                                                                    </Button>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {isListeningPart && !isPart1Listening && !isPart3Listening && (
                                                        <div className="rounded-lg border bg-background p-3 space-y-3">
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                                Audio riêng cho Listening (Part 2-4)
                                                            </p>

                                                            <FormField
                                                                control={form.control}
                                                                name={`parts.${partIndex}.manualQuestions.${questionIndex}.audioUrl`}
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel>Audio riêng câu này (R2)</FormLabel>
                                                                        <FormControl><Input className="h-10" placeholder="https://..." {...field} /></FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />

                                                            <label className="inline-flex">
                                                                <input
                                                                    className="hidden"
                                                                    type="file"
                                                                    accept="audio/*"
                                                                    onChange={async (event) => {
                                                                        const file = event.target.files?.[0];
                                                                        if (!file) return;
                                                                        await handleQuestionAssetUpload(partIndex, questionIndex, 'audioUrl', file);
                                                                        event.currentTarget.value = '';
                                                                    }}
                                                                />
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-9"
                                                                    disabled={uploadingField === `${partIndex}-${questionIndex}-audioUrl`}
                                                                    asChild
                                                                >
                                                                    <span>
                                                                        {uploadingField === `${partIndex}-${questionIndex}-audioUrl`
                                                                            ? 'Đang upload audio...'
                                                                            : 'Upload audio lên R2'}
                                                                    </span>
                                                                </Button>
                                                            </label>
                                                        </div>
                                                    )}

                                                    {isPart2Listening && (
                                                        <div className="rounded-lg border bg-background p-3 space-y-3">
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                                Preview dạng Part 2 (A/B/C)
                                                            </p>

                                                            {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.audioUrl`) ? (
                                                                <audio
                                                                    controls
                                                                    className="w-full"
                                                                    src={form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.audioUrl`) || ''}
                                                                >
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

                                                    <FormField control={form.control} name={`parts.${partIndex}.manualQuestions.${questionIndex}.explanation`} render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Giải thích (để user hiểu vì sao đúng/sai)</FormLabel>
                                                            <FormControl><Textarea rows={2} placeholder="Giải thích đáp án, mẹo làm bài, lỗi thường gặp..." {...field} /></FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )} />
                                                </div>
                                            );
                                        })}

                                        {(form.watch(`parts.${partIndex}.manualQuestions`) ?? []).length === 0 && (
                                            <p className="text-sm text-muted-foreground italic">Chưa có câu nào. Nhấn “+ Thêm câu” để cấu hình từng câu riêng.</p>
                                        )}
                                    </div>

                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
                    <Button type="submit">Lưu module</Button>
                </div>
            </form>
        </Form>
    );
}
