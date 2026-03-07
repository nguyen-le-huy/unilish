import { useEffect, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import apiClient from '@/lib/axios';
import { getApiErrorMessage } from '@/lib/api-error';
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
    imageUrls: z.array(z.string().url('URL ảnh không hợp lệ')).default([]),
    audioUrl: z.string().url('URL audio không hợp lệ').optional().or(z.literal('')),
});

const partSchema = z.object({
    part: z.coerce.number().min(1),
    name: z.string().min(1),
    questionsCount: z.coerce.number().min(1).default(1),
    poolTag: z.string().min(1),
    groupPattern: z.array(z.coerce.number().int().min(2).max(7)).default([]),
    sharedAudioUrl: z.string().url('URL audio không hợp lệ').optional().or(z.literal('')).default(''),
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
    draftKey?: string;
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

type AiImportedQuestion = {
    question: string;
    optionA: string;
    optionB: string;
    optionC: string;
    optionD: string;
    correctOption: 'A' | 'B' | 'C' | 'D';
    transcript?: string;
    explanation?: string;
};

function extractPart7GroupPattern(rawText: string): number[] {
    const lines = rawText
        .replace(/\r/g, '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    for (const line of lines) {
        if (/^[2-7]{4,}$/.test(line)) {
            return line.split('').map((digit) => Number(digit));
        }
    }

    return [];
}

function resolveAudioPreviewUrl(rawUrl: string): string {
    const audioUrl = rawUrl.trim();
    if (!audioUrl) {
        return '';
    }

    const apiBaseRaw = String(import.meta.env.VITE_API_URL || 'http://localhost:5432/api');
    const apiBase = apiBaseRaw.endsWith('/') ? apiBaseRaw.slice(0, -1) : apiBaseRaw;

    if (!audioUrl.includes('.r2.dev/')) {
        return audioUrl;
    }

    try {
        const parsed = new URL(audioUrl);
        const key = parsed.pathname.replace(/^\//, '');
        if (!key) {
            return audioUrl;
        }

        return `${apiBase}/audio/${key}`;
    } catch {
        return audioUrl;
    }
}

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
        imageUrls: [],
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
        imageUrls: [],
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
        imageUrls: [],
        audioUrl: '',
    };
}

function createPart3Question(index: number): MCQModuleFormValues['parts'][number]['manualQuestions'][number] {
    return {
        question: `Part 3 Question ${index + 1}`,
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
        transcript: '',
        mediaUrl: '',
        imageUrl: '',
        imageUrls: [],
        audioUrl: '',
    };
}

function createPart4Question(index: number): MCQModuleFormValues['parts'][number]['manualQuestions'][number] {
    return {
        question: `Part 4 Question ${index + 1}`,
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
        transcript: '',
        mediaUrl: '',
        imageUrl: '',
        imageUrls: [],
        audioUrl: '',
    };
}

function createPart6Question(index: number): MCQModuleFormValues['parts'][number]['manualQuestions'][number] {
    return {
        question: `Part 6 Question ${index + 1}`,
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
        transcript: '',
        mediaUrl: '',
        imageUrl: '',
        imageUrls: [],
        audioUrl: '',
    };
}

function createPart7Question(index: number): MCQModuleFormValues['parts'][number]['manualQuestions'][number] {
    return {
        question: `Part 7 Question ${index + 1}`,
        optionA: '',
        optionB: '',
        optionC: '',
        optionD: '',
        correctOption: 'A',
        explanation: '',
        transcript: '',
        mediaUrl: '',
        imageUrl: '',
        imageUrls: [],
        audioUrl: '',
    };
}

export function MCQModuleForm({ defaultValues, order, onSave, onCancel, draftKey }: Props) {
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [part3GroupPanels, setPart3GroupPanels] = useState<Partial<Record<string, 'view' | 'edit'>>>({});
    const [questionPanels, setQuestionPanels] = useState<Partial<Record<string, 'view' | 'edit'>>>({});
    const [part7GroupSizes, setPart7GroupSizes] = useState<Partial<Record<number, number>>>({});
    const [part7GroupPatterns, setPart7GroupPatterns] = useState<Partial<Record<number, number[]>>>({});
    const [groupImageUrlDrafts, setGroupImageUrlDrafts] = useState<Partial<Record<string, string>>>({});
    const [aiImportOpen, setAiImportOpen] = useState(false);
    const [aiImportText, setAiImportText] = useState('');
    const [aiImportLoading, setAiImportLoading] = useState(false);
    const [aiImportTargetPartIndex, setAiImportTargetPartIndex] = useState<number | null>(null);
    const [aiImportParsedQuestions, setAiImportParsedQuestions] = useState<AiImportedQuestion[]>([]);
    const [aiImportPart7Pattern, setAiImportPart7Pattern] = useState<number[] | null>(null);

    function getPart3GroupKey(partIndex: number, groupStartIndex: number) {
        return `${partIndex}-${groupStartIndex}`;
    }

    function setPart3GroupPanel(partIndex: number, groupStartIndex: number, mode?: 'view' | 'edit') {
        const groupKey = getPart3GroupKey(partIndex, groupStartIndex);
        setPart3GroupPanels((previous) => {
            const next = { ...previous };
            if (mode) {
                next[groupKey] = mode;
            } else {
                delete next[groupKey];
            }
            return next;
        });
    }

    function getQuestionPanelKey(partIndex: number, questionIndex: number) {
        return `${partIndex}-${questionIndex}`;
    }

    function setQuestionPanel(partIndex: number, questionIndex: number, mode?: 'view' | 'edit') {
        const questionKey = getQuestionPanelKey(partIndex, questionIndex);
        setQuestionPanels((previous) => {
            const next = { ...previous };
            if (mode) {
                next[questionKey] = mode;
            } else {
                delete next[questionKey];
            }
            return next;
        });
    }

    function getPart7GroupSize(partIndex: number) {
        return Math.max(2, Math.min(7, Number(part7GroupSizes[partIndex] ?? 3)));
    }

    function getPart7GroupPattern(partIndex: number): number[] {
        const inMemoryPattern = part7GroupPatterns[partIndex] ?? [];
        if (inMemoryPattern.length > 0) {
            return inMemoryPattern;
        }

        return form.getValues(`parts.${partIndex}.groupPattern`) ?? [];
    }

    function setPart7GroupPattern(partIndex: number, pattern: number[]) {
        const normalizedPattern = pattern
            .map((value) => Math.max(2, Math.min(7, Number(value))))
            .filter((value) => Number.isFinite(value));

        if (normalizedPattern.length === 0) {
            setPart7GroupPatterns((previous) => {
                const next = { ...previous };
                delete next[partIndex];
                return next;
            });
            form.setValue(`parts.${partIndex}.groupPattern`, [], { shouldDirty: true, shouldValidate: true });
            return;
        }

        setPart7GroupPatterns((previous) => ({ ...previous, [partIndex]: normalizedPattern }));
        form.setValue(`parts.${partIndex}.groupPattern`, normalizedPattern, { shouldDirty: true, shouldValidate: true });
    }

    function buildPart7Groups(partIndex: number, totalQuestions: number): Array<{ start: number; size: number; order: number }> {
        const groups: Array<{ start: number; size: number; order: number }> = [];
        if (totalQuestions <= 0) {
            return groups;
        }

        const defaultGroupSize = getPart7GroupSize(partIndex);
        const pattern = getPart7GroupPattern(partIndex);

        let start = 0;
        let order = 1;

        if (pattern.length > 0) {
            for (const rawSize of pattern) {
                if (start >= totalQuestions) {
                    break;
                }

                const normalizedSize = Math.max(2, Math.min(7, Number(rawSize)));
                const size = Math.min(normalizedSize, totalQuestions - start);
                groups.push({ start, size, order });
                start += size;
                order += 1;
            }
        }

        while (start < totalQuestions) {
            const size = Math.min(defaultGroupSize, totalQuestions - start);
            groups.push({ start, size, order });
            start += size;
            order += 1;
        }

        return groups;
    }

    function setPart7GroupSize(partIndex: number, nextValue: number) {
        const normalizedValue = Math.max(2, Math.min(7, nextValue));
        setPart7GroupSizes((previous) => ({ ...previous, [partIndex]: normalizedValue }));
    }

    const normalizedPartsDefaults: MCQModuleFormValues['parts'] = TOEIC_PART_PRESETS.map((preset) => {
        const existingPart = defaultValues?.parts?.find((part) => part.part === preset.part);
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

    const form = useForm<MCQModuleFormValues>({
        resolver: zodResolver(mcqModuleSchema) as Resolver<MCQModuleFormValues>,
        defaultValues: {
            name: defaultValues?.name ?? 'TOEIC Compact (Listening + Reading)',
            timeLimitMinutes: defaultValues?.timeLimitMinutes ?? 45,
            showCountdown: defaultValues?.showCountdown ?? true,
            allowBackNavigation: defaultValues?.allowBackNavigation ?? false,
            adaptive: defaultValues?.adaptive ?? false,
            parts: normalizedPartsDefaults,
        },
    });

    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const watchedValues = useWatch({ control: form.control });

    useEffect(() => {
        if (!draftKey) {
            return;
        }

        try {
            const rawDraft = localStorage.getItem(draftKey);
            if (!rawDraft) {
                return;
            }

            const parsedDraft = JSON.parse(rawDraft) as MCQModuleFormValues;
            form.reset(parsedDraft);
        } catch {
            // ignore invalid draft
        }
    }, [draftKey, form]);

    useEffect(() => {
        if (!draftKey) {
            return;
        }

        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }

        saveTimerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(draftKey, JSON.stringify(watchedValues));
            } catch {
                // ignore storage failure
            }
        }, 500);

        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, [draftKey, watchedValues]);

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

    function getPartSharedAudio(partIndex: number) {
        return form.getValues(`parts.${partIndex}.sharedAudioUrl`)
            || form.getValues(`parts.${partIndex}.manualQuestions.0.audioUrl`)
            || '';
    }

    function setSharedAudioForPart(partIndex: number, audioUrl: string) {
        form.setValue(
            `parts.${partIndex}.sharedAudioUrl`,
            audioUrl,
            { shouldDirty: true, shouldValidate: true },
        );

        const currentQuestions = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        form.setValue(
            `parts.${partIndex}.manualQuestions`,
            currentQuestions.map((question) => ({ ...question, audioUrl })),
            { shouldDirty: true, shouldValidate: true },
        );
    }

    function setSharedImageForGroup(partIndex: number, groupStartIndex: number, imageUrl: string, groupSize = 3) {
        setSharedImagesForGroup(partIndex, groupStartIndex, [imageUrl], groupSize);
    }

    function getSharedImagesForGroup(partIndex: number, groupStartIndex: number): string[] {
        const fromImageUrls = form.getValues(`parts.${partIndex}.manualQuestions.${groupStartIndex}.imageUrls`) ?? [];
        if (fromImageUrls.length > 0) {
            return fromImageUrls.filter((url) => !!url.trim()).map((url) => url.trim());
        }

        const fallbackImageUrl = form.getValues(`parts.${partIndex}.manualQuestions.${groupStartIndex}.imageUrl`) ?? '';
        return fallbackImageUrl.trim() ? [fallbackImageUrl.trim()] : [];
    }

    function setSharedImagesForGroup(partIndex: number, groupStartIndex: number, imageUrls: string[], groupSize = 3) {
        const normalizedImageUrls = imageUrls
            .map((url) => url.trim())
            .filter((url) => !!url);
        const firstImageUrl = normalizedImageUrls[0] ?? '';

        for (let offset = 0; offset < groupSize; offset += 1) {
            const questionIndex = groupStartIndex + offset;
            const question = form.getValues(`parts.${partIndex}.manualQuestions.${questionIndex}`);
            if (!question) break;

            form.setValue(
                `parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`,
                firstImageUrl,
                { shouldDirty: true, shouldValidate: true },
            );

            form.setValue(
                `parts.${partIndex}.manualQuestions.${questionIndex}.imageUrls`,
                normalizedImageUrls,
                { shouldDirty: true, shouldValidate: true },
            );
        }
    }

    async function handlePartSharedAudioUpload(partIndex: number, file: File) {
        const fieldKey = `${partIndex}-part-audio`;
        setUploadingField(fieldKey);

        try {
            const uploadedUrl = await uploadMediaFile(file);
            setSharedAudioForPart(partIndex, uploadedUrl);
            toast.success('Đã upload audio chung cho part');
        } catch {
            toast.error('Upload audio thất bại');
        } finally {
            setUploadingField(null);
        }
    }

    async function handleSharedImageUpload(partIndex: number, groupStartIndex: number, file: File, groupSize = 3, append = false) {
        const fieldKey = `${partIndex}-group-${groupStartIndex}-image`;
        setUploadingField(fieldKey);

        try {
            const uploadedUrl = await uploadMediaFile(file);
            if (append) {
                const currentUrls = getSharedImagesForGroup(partIndex, groupStartIndex);
                setSharedImagesForGroup(partIndex, groupStartIndex, [...currentUrls, uploadedUrl], groupSize);
            } else {
                setSharedImageForGroup(partIndex, groupStartIndex, uploadedUrl, groupSize);
            }
            toast.success(`Đã upload hình chung cho cụm ${groupSize} câu`);
        } catch {
            toast.error('Upload hình thất bại');
        } finally {
            setUploadingField(null);
        }
    }

    function moveGroupImage(partIndex: number, groupStartIndex: number, fromIndex: number, toIndex: number, groupSize = 3) {
        const images = getSharedImagesForGroup(partIndex, groupStartIndex);
        if (fromIndex < 0 || toIndex < 0 || fromIndex >= images.length || toIndex >= images.length) {
            return;
        }

        const nextImages = [...images];
        const [movedItem] = nextImages.splice(fromIndex, 1);
        if (!movedItem) {
            return;
        }
        nextImages.splice(toIndex, 0, movedItem);
        setSharedImagesForGroup(partIndex, groupStartIndex, nextImages, groupSize);
    }

    function removeGroupImage(partIndex: number, groupStartIndex: number, imageIndex: number, groupSize = 3) {
        const images = getSharedImagesForGroup(partIndex, groupStartIndex);
        const nextImages = images.filter((_, index) => index !== imageIndex);
        setSharedImagesForGroup(partIndex, groupStartIndex, nextImages, groupSize);
    }

    async function handleAiAnalyzeImport() {
        if (!aiImportText.trim()) {
            toast.error('Vui lòng dán nội dung cần phân tích');
            return;
        }

        if (aiImportTargetPartIndex === null) {
            toast.error('Không xác định được part cần nạp');
            return;
        }

        const targetPartNumber = Number(form.getValues(`parts.${aiImportTargetPartIndex}.part`)) as 1 | 2 | 3 | 4 | 5 | 6 | 7;

        setAiImportLoading(true);
        try {
            const response = await apiClient.post<ApiResponse<{ questionItems: AiImportedQuestion[]; groupPattern?: number[] }>>(
                '/placement-tests/ai/parse-mcq-part3',
                { rawText: aiImportText, part: targetPartNumber },
            );

            const parsedQuestions = response.data.data.questionItems ?? [];
            if (parsedQuestions.length === 0) {
                toast.error('AI không trích xuất được câu hỏi hợp lệ');
                return;
            }

            const responsePattern = response.data.data.groupPattern ?? [];
            const rawPattern = extractPart7GroupPattern(aiImportText);
            const selectedPattern = responsePattern.length > 0 ? responsePattern : rawPattern;
            const normalizedPattern = selectedPattern
                .map((value) => Math.max(2, Math.min(7, Number(value))))
                .filter((value) => Number.isFinite(value));

            setAiImportPart7Pattern(targetPartNumber === 7 && normalizedPattern.length > 0 ? normalizedPattern : null);

            setAiImportParsedQuestions(parsedQuestions);
            toast.success(`AI đã phân tích ${parsedQuestions.length} câu`);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'Phân tích nội dung thất bại'));
        } finally {
            setAiImportLoading(false);
        }
    }

    function applyAiImportedQuestions() {
        if (aiImportTargetPartIndex === null || aiImportParsedQuestions.length === 0) {
            return;
        }

        const targetPartNumber = Number(form.getValues(`parts.${aiImportTargetPartIndex}.part`)) || 3;
        const sharedAudio = getPartSharedAudio(aiImportTargetPartIndex).trim();
        const mappedQuestions = aiImportParsedQuestions.map((item) => ({
            question: item.question,
            optionA: item.optionA,
            optionB: item.optionB,
            optionC: item.optionC,
            optionD: targetPartNumber === 2 ? 'N/A' : item.optionD,
            correctOption: targetPartNumber === 2 && item.correctOption === 'D' ? 'A' : item.correctOption,
            explanation: item.explanation ?? '',
            transcript: item.transcript ?? '',
            mediaUrl: '',
            imageUrl: '',
            imageUrls: [],
            audioUrl: sharedAudio,
        }));

        form.setValue(
            `parts.${aiImportTargetPartIndex}.manualQuestions`,
            mappedQuestions,
            { shouldDirty: true, shouldValidate: true },
        );

        if (targetPartNumber === 7) {
            const patternFromDialog = aiImportPart7Pattern ?? extractPart7GroupPattern(aiImportText);
            if (patternFromDialog.length > 0) {
                setPart7GroupPattern(aiImportTargetPartIndex, patternFromDialog);
            }
        }

        setAiImportOpen(false);
        setAiImportParsedQuestions([]);
        setAiImportPart7Pattern(null);
        setAiImportText('');
        toast.success(`Đã nạp câu hỏi vào Part ${targetPartNumber}`);
    }

    function addManualQuestion(partIndex: number) {
        const current = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        const partNumber = Number(form.getValues(`parts.${partIndex}.part`));
        const poolTag = (form.getValues(`parts.${partIndex}.poolTag`) ?? '').toLowerCase();
        const isPart1Listening = partNumber === 1 || poolTag.includes('toeic-listening-part1');
        const isPart2Listening = partNumber === 2 || poolTag.includes('toeic-listening-part2');
        const isPart3Listening = partNumber === 3 || poolTag.includes('toeic-listening-part3');
        const isPart4Listening = partNumber === 4 || poolTag.includes('toeic-listening-part4');
        const isPart6Reading = partNumber === 6 || poolTag.includes('toeic-reading-part6');
        const isPart7Reading = partNumber === 7 || poolTag.includes('toeic-reading-part7');
        const isPartLevelAudioPart = (partNumber >= 1 && partNumber <= 4) || poolTag.includes('toeic-listening-part');
        const partSharedAudio = getPartSharedAudio(partIndex).trim();
        const isGroupedListeningPart = isPart3Listening || isPart4Listening;
        const isGroupedQuestionPart = isGroupedListeningPart || isPart6Reading || isPart7Reading;
        const defaultPart7GroupSize = getPart7GroupSize(partIndex);
        const part7Pattern = getPart7GroupPattern(partIndex);
        const consumedQuestionCount = current.length;
        let nextPart7GroupSize = defaultPart7GroupSize;
        if (isPart7Reading && part7Pattern.length > 0) {
            let runningTotal = 0;
            let patternIndex = 0;
            while (patternIndex < part7Pattern.length && runningTotal < consumedQuestionCount) {
                runningTotal += part7Pattern[patternIndex] ?? defaultPart7GroupSize;
                patternIndex += 1;
            }

            nextPart7GroupSize = part7Pattern[patternIndex] ?? defaultPart7GroupSize;
        }

        const groupedQuestionCount = isPart6Reading ? 4 : isPart7Reading ? nextPart7GroupSize : 3;

        if (isGroupedQuestionPart) {
            const nextGroup = Array.from({ length: groupedQuestionCount }, (_, offset) => (
                isPart6Reading
                    ? createPart6Question(current.length + offset)
                    : isPart7Reading
                        ? createPart7Question(current.length + offset)
                        : isPart4Listening
                            ? createPart4Question(current.length + offset)
                            : createPart3Question(current.length + offset)
            )).map((question) => (
                isPartLevelAudioPart && partSharedAudio
                    ? { ...question, audioUrl: partSharedAudio }
                    : question
            ));
            form.setValue(`parts.${partIndex}.manualQuestions`, [...current, ...nextGroup], { shouldDirty: true });
            return;
        }

        const nextQuestion = isPart1Listening
            ? createPart1Question(current.length)
            : isPart2Listening
                ? createPart2Question(current.length)
                : createEmptyManualQuestion();

        const normalizedNextQuestion = isPartLevelAudioPart && partSharedAudio
            ? { ...nextQuestion, audioUrl: partSharedAudio }
            : nextQuestion;

        form.setValue(`parts.${partIndex}.manualQuestions`, [...current, normalizedNextQuestion], { shouldDirty: true });
    }

    function removeManualQuestion(partIndex: number, questionIndex: number) {
        const current = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        form.setValue(
            `parts.${partIndex}.manualQuestions`,
            current.filter((_, index) => index !== questionIndex),
            { shouldDirty: true },
        );
        setQuestionPanel(partIndex, questionIndex);
    }

    function removeQuestionGroup(partIndex: number, groupStartIndex: number, groupSize = 3) {
        const current = form.getValues(`parts.${partIndex}.manualQuestions`) ?? [];
        form.setValue(
            `parts.${partIndex}.manualQuestions`,
            current.filter((_, index) => index < groupStartIndex || index >= groupStartIndex + groupSize),
            { shouldDirty: true },
        );
        setPart3GroupPanel(partIndex, groupStartIndex);
    }

    function getGlobalQuestionNumber(partIndex: number, questionIndex: number) {
        const allParts = form.getValues('parts') ?? [];
        const previousQuestionsTotal = allParts
            .slice(0, partIndex)
            .reduce((total, part) => total + (part.manualQuestions?.length ?? 0), 0);
        return previousQuestionsTotal + questionIndex + 1;
    }

    function onSubmit(values: MCQModuleFormValues) {
        if (draftKey) {
            localStorage.removeItem(draftKey);
        }

        onSave({
            order,
            type: 'mcq',
            samplingMode: 'random',
            difficultyDistribution: {},
            ...values,
            parts: values.parts.map((part, partIndex) => {
                const partPoolTag = part.poolTag.toLowerCase();
                const isPart1Listening = part.part === 1 || partPoolTag.includes('toeic-listening-part1');
                const isPart2Listening = part.part === 2 || partPoolTag.includes('toeic-listening-part2');
                const normalizedSharedAudioUrl = part.sharedAudioUrl?.trim() || undefined;

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
                        imageUrl: (question.imageUrls ?? []).find((url) => !!url.trim()) || question.imageUrl || undefined,
                        imageUrls: (question.imageUrls ?? []).map((url) => url.trim()).filter(Boolean),
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
                        groupPattern: part.part === 7
                            ? (getPart7GroupPattern(partIndex).map((value) => Math.max(2, Math.min(7, Number(value))))
                                .filter((value) => Number.isFinite(value)))
                            : [],
                        questions: part.manualQuestions.map((question) => question.question.trim()).filter(Boolean),
                        questionItems: normalizedQuestionItems,
                        media: {
                            audioUrl: normalizedSharedAudioUrl,
                        },
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

                                {(() => {
                                    const partNumber = Number(form.watch(`parts.${partIndex}.part`));
                                    const poolTag = (form.watch(`parts.${partIndex}.poolTag`) ?? '').toLowerCase();
                                    const isPartLevelAudioPart = (partNumber >= 1 && partNumber <= 4) || poolTag.includes('toeic-listening-part');

                                    if (!isPartLevelAudioPart) {
                                        return null;
                                    }

                                    return (
                                        <div className="md:col-span-2 rounded-xl border bg-background p-3 space-y-3">
                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Audio chung cho cả Part</p>
                                            <FormItem>
                                                <FormLabel>Audio URL (R2)</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        className="h-10"
                                                        placeholder="https://..."
                                                        value={getPartSharedAudio(partIndex)}
                                                        onChange={(event) => setSharedAudioForPart(partIndex, event.target.value)}
                                                    />
                                                </FormControl>
                                            </FormItem>

                                            {getPartSharedAudio(partIndex) ? (
                                                <audio controls className="w-full" src={resolveAudioPreviewUrl(getPartSharedAudio(partIndex))}>
                                                    Trình duyệt không hỗ trợ audio.
                                                </audio>
                                            ) : (
                                                <p className="text-sm text-muted-foreground">Chưa có audio chung cho part</p>
                                            )}

                                            <label className="inline-flex">
                                                <input
                                                    className="hidden"
                                                    type="file"
                                                    accept="audio/*"
                                                    onChange={async (event) => {
                                                        const inputElement = event.currentTarget;
                                                        const file = event.target.files?.[0];
                                                        if (!file) return;
                                                        await handlePartSharedAudioUpload(partIndex, file);
                                                        inputElement.value = '';
                                                    }}
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-9"
                                                    disabled={uploadingField === `${partIndex}-part-audio`}
                                                    asChild
                                                >
                                                    <span>
                                                        {uploadingField === `${partIndex}-part-audio`
                                                            ? 'Đang upload audio...'
                                                            : 'Upload audio cho cả part'}
                                                    </span>
                                                </Button>
                                            </label>
                                        </div>
                                    );
                                })()}

                                <div className="md:col-span-2 mt-2 rounded-xl border bg-background p-4 space-y-4">
                                    <p className="text-sm font-semibold">Soạn đề thủ công (TOEIC Listening/Reading)</p>

                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm font-semibold">Cấu hình từng câu</p>
                                            {(() => {
                                                const partNumber = Number(form.watch(`parts.${partIndex}.part`));
                                                const poolTag = (form.watch(`parts.${partIndex}.poolTag`) ?? '').toLowerCase();
                                                const isPart1Listening = partNumber === 1 || poolTag.includes('toeic-listening-part1');
                                                const isPart2Listening = partNumber === 2 || poolTag.includes('toeic-listening-part2');
                                                const isPart3Listening = partNumber === 3 || poolTag.includes('toeic-listening-part3');
                                                const isPart4Listening = partNumber === 4 || poolTag.includes('toeic-listening-part4');
                                                const isPart5Reading = partNumber === 5 || poolTag.includes('toeic-reading-part5');
                                                const isPart6Reading = partNumber === 6 || poolTag.includes('toeic-reading-part6');
                                                const isPart7Reading = partNumber === 7 || poolTag.includes('toeic-reading-part7');
                                                const isGroupedListeningPart = isPart3Listening || isPart4Listening;
                                                const isGroupedQuestionPart = isGroupedListeningPart || isPart6Reading || isPart7Reading;
                                                const part7GroupSize = getPart7GroupSize(partIndex);
                                                const part7Pattern = getPart7GroupPattern(partIndex);

                                                return (
                                            <div className="flex items-center gap-2">
                                                {isPart7Reading && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-muted-foreground">Số câu/cụm</span>
                                                        <Input
                                                            className="h-8 w-20"
                                                            type="number"
                                                            min={2}
                                                            max={7}
                                                            value={part7GroupSize}
                                                            onChange={(event) => setPart7GroupSize(partIndex, Number(event.target.value || 3))}
                                                        />
                                                    </div>
                                                )}
                                                {(isPart1Listening || isPart2Listening || isPart3Listening || isPart4Listening || isPart5Reading || isPart6Reading || isPart7Reading) && (
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => {
                                                            setAiImportTargetPartIndex(partIndex);
                                                            setAiImportParsedQuestions([]);
                                                            setAiImportOpen(true);
                                                        }}
                                                    >
                                                        AI phân tích & nạp
                                                    </Button>
                                                )}
                                                <Button type="button" variant="outline" size="sm" onClick={() => addManualQuestion(partIndex)}>
                                                    {isPart6Reading
                                                        ? '+ Thêm cụm 4 câu'
                                                        : isPart7Reading
                                                            ? `+ Thêm cụm ${part7Pattern.length > 0 ? 'theo pattern' : part7GroupSize} câu`
                                                            : isGroupedQuestionPart
                                                                ? '+ Thêm cụm 3 câu'
                                                                : '+ Thêm câu'}
                                                </Button>
                                            </div>
                                                );
                                            })()}
                                        </div>

                                        {(form.watch(`parts.${partIndex}.manualQuestions`) ?? []).map((_, questionIndex) => {
                                            const partNumber = Number(form.watch(`parts.${partIndex}.part`));
                                            const poolTag = (form.watch(`parts.${partIndex}.poolTag`) ?? '').toLowerCase();
                                            const isListeningPart = (partNumber >= 1 && partNumber <= 4) || poolTag.includes('toeic-listening-part');
                                            const isPart1Listening = partNumber === 1 || poolTag.includes('toeic-listening-part1');
                                            const isPart2Listening = partNumber === 2 || poolTag.includes('toeic-listening-part2');
                                            const isPart3Listening = partNumber === 3 || poolTag.includes('toeic-listening-part3');
                                            const isPart4Listening = partNumber === 4 || poolTag.includes('toeic-listening-part4');
                                            const isPart5Reading = partNumber === 5 || poolTag.includes('toeic-reading-part5');
                                            const isPart6Reading = partNumber === 6 || poolTag.includes('toeic-reading-part6');
                                            const isPart7Reading = partNumber === 7 || poolTag.includes('toeic-reading-part7');
                                            const isGroupedListeningPart = isPart3Listening || isPart4Listening;
                                            const isGroupedQuestionPart = isGroupedListeningPart || isPart6Reading || isPart7Reading;
                                            const manualQuestions = form.watch(`parts.${partIndex}.manualQuestions`) ?? [];

                                            const part7Groups = isPart7Reading
                                                ? buildPart7Groups(partIndex, manualQuestions.length)
                                                : [];

                                            const part7CurrentGroup = isPart7Reading
                                                ? part7Groups.find((group) => group.start === questionIndex)
                                                : undefined;

                                            const groupedQuestionCount = isPart6Reading
                                                ? 4
                                                : isPart7Reading
                                                    ? (part7CurrentGroup?.size ?? getPart7GroupSize(partIndex))
                                                    : 3;
                                            const isGroupedPartStart = isGroupedQuestionPart
                                                && (
                                                    isPart7Reading
                                                        ? (!!part7CurrentGroup || (part7Groups.length === 0 && questionIndex % groupedQuestionCount === 0))
                                                        : questionIndex % groupedQuestionCount === 0
                                                );

                                            if (isGroupedQuestionPart) {
                                                if (!isGroupedPartStart) {
                                                    return null;
                                                }

                                                const groupIndexes = Array.from({ length: groupedQuestionCount }, (_, offset) => questionIndex + offset)
                                                    .filter((groupQuestionIndex) => !!form.getValues(`parts.${partIndex}.manualQuestions.${groupQuestionIndex}`));
                                                const groupPanelMode = part3GroupPanels[getPart3GroupKey(partIndex, questionIndex)];
                                                const groupKey = getPart3GroupKey(partIndex, questionIndex);
                                                const groupStartGlobalQuestion = getGlobalQuestionNumber(partIndex, questionIndex);
                                                const groupEndGlobalQuestion = groupStartGlobalQuestion + groupIndexes.length - 1;
                                                const sharedImageUrls = getSharedImagesForGroup(partIndex, questionIndex);

                                                return (
                                                    <div key={`${partIndex}-group-${questionIndex}`} className="rounded-lg border p-3 bg-muted/10 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <p className="text-sm font-medium">
                                                                Cụm {isPart7Reading && part7CurrentGroup ? part7CurrentGroup.order : (Math.floor(questionIndex / groupedQuestionCount)) + 1} (Câu {groupStartGlobalQuestion}-{groupEndGlobalQuestion})
                                                            </p>
                                                            <div className="flex items-center gap-2">
                                                                <Button
                                                                    type="button"
                                                                    variant={groupPanelMode === 'view' ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    onClick={() => setPart3GroupPanel(partIndex, questionIndex, groupPanelMode === 'view' ? undefined : 'view')}
                                                                >
                                                                    Xem
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant={groupPanelMode === 'edit' ? 'default' : 'outline'}
                                                                    size="sm"
                                                                    onClick={() => setPart3GroupPanel(partIndex, questionIndex, groupPanelMode === 'edit' ? undefined : 'edit')}
                                                                >
                                                                    Sửa
                                                                </Button>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-destructive"
                                                                    onClick={() => removeQuestionGroup(partIndex, questionIndex, groupedQuestionCount)}
                                                                >
                                                                    Xóa cụm
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {!groupPanelMode && (
                                                            <p className="text-sm text-muted-foreground">
                                                                Bấm “Xem” hoặc “Sửa” để mở chi tiết cụm câu.
                                                            </p>
                                                        )}

                                                        {groupPanelMode === 'view' && (
                                                            <div className="space-y-3">
                                                                <div className="rounded-lg border bg-background p-3 text-sm space-y-2">
                                                                    <p><span className="font-medium">Hình chung:</span> {sharedImageUrls.length > 0 ? `${sharedImageUrls.length} ảnh` : 'Chưa có'}</p>
                                                                    {sharedImageUrls.length > 0 ? (
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                            {sharedImageUrls.map((imageUrl, imageIndex) => (
                                                                                <div key={`${groupKey}-view-image-${imageIndex}`} className="rounded-lg border p-2 bg-muted/20 flex justify-center">
                                                                                    <img
                                                                                        src={imageUrl}
                                                                                        alt={`Group ${partIndex + 1}-${Math.floor(questionIndex / groupedQuestionCount) + 1} preview ${imageIndex + 1}`}
                                                                                        className="max-h-56 w-auto object-contain rounded"
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : null}
                                                                </div>

                                                                {groupIndexes.map((groupQuestionIndex) => (
                                                                    <div key={`${partIndex}-view-${groupQuestionIndex}`} className="rounded-lg border bg-background p-3 text-sm space-y-2">
                                                                        <p className="font-medium">Câu {getGlobalQuestionNumber(partIndex, groupQuestionIndex)}</p>
                                                                        <p>{form.watch(`parts.${partIndex}.manualQuestions.${groupQuestionIndex}.question`) || 'Chưa nhập nội dung câu hỏi'}</p>
                                                                        <p className="text-muted-foreground">
                                                                            Đáp án đúng: {form.watch(`parts.${partIndex}.manualQuestions.${groupQuestionIndex}.correctOption`) || 'A'}
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {groupPanelMode === 'edit' && (
                                                            <>
                                                                <div className="rounded-lg border bg-background p-3 space-y-3">
                                                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                                        Media chung cho cụm {groupedQuestionCount} câu (Part {partNumber})
                                                                    </p>

                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                        {isPart7Reading ? (
                                                                            <FormItem className="sm:col-span-2">
                                                                                <FormLabel>Thêm URL ảnh chung (Cloudinary)</FormLabel>
                                                                                <div className="flex items-center gap-2">
                                                                                    <Input
                                                                                        className="h-10"
                                                                                        placeholder="https://..."
                                                                                        value={groupImageUrlDrafts[groupKey] ?? ''}
                                                                                        onChange={(event) => setGroupImageUrlDrafts((previous) => ({
                                                                                            ...previous,
                                                                                            [groupKey]: event.target.value,
                                                                                        }))}
                                                                                    />
                                                                                    <Button
                                                                                        type="button"
                                                                                        variant="outline"
                                                                                        onClick={() => {
                                                                                            const draft = (groupImageUrlDrafts[groupKey] ?? '').trim();
                                                                                            if (!draft) {
                                                                                                return;
                                                                                            }
                                                                                            setSharedImagesForGroup(partIndex, questionIndex, [...sharedImageUrls, draft], groupedQuestionCount);
                                                                                            setGroupImageUrlDrafts((previous) => ({ ...previous, [groupKey]: '' }));
                                                                                        }}
                                                                                    >
                                                                                        + Thêm
                                                                                    </Button>
                                                                                </div>
                                                                            </FormItem>
                                                                        ) : (
                                                                            <FormItem>
                                                                                <FormLabel>{isPart6Reading || isPart7Reading ? 'Hình đề bài chung (Cloudinary)' : 'Hình chung (Cloudinary)'}</FormLabel>
                                                                                <FormControl>
                                                                                    <Input
                                                                                        className="h-10"
                                                                                        placeholder="https://..."
                                                                                        value={form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`) || ''}
                                                                                        onChange={(event) => setSharedImageForGroup(partIndex, questionIndex, event.target.value, groupedQuestionCount)}
                                                                                    />
                                                                                </FormControl>
                                                                            </FormItem>
                                                                        )}
                                                                    </div>

                                                                    {sharedImageUrls.length > 0 ? (
                                                                        <div className="space-y-2">
                                                                            <p className="text-xs text-muted-foreground">Thứ tự ảnh hiển thị</p>
                                                                            <div className="space-y-2">
                                                                                {sharedImageUrls.map((imageUrl, imageIndex) => (
                                                                                    <div key={`${groupKey}-edit-image-${imageIndex}`} className="rounded-lg border p-2 bg-muted/20 space-y-2">
                                                                                        <div className="flex items-center justify-between gap-2">
                                                                                            <span className="text-xs text-muted-foreground">Ảnh {imageIndex + 1}</span>
                                                                                            {isPart7Reading && (
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <Button
                                                                                                        type="button"
                                                                                                        variant="outline"
                                                                                                        size="sm"
                                                                                                        disabled={imageIndex === 0}
                                                                                                        onClick={() => moveGroupImage(partIndex, questionIndex, imageIndex, imageIndex - 1, groupedQuestionCount)}
                                                                                                    >
                                                                                                        Lên
                                                                                                    </Button>
                                                                                                    <Button
                                                                                                        type="button"
                                                                                                        variant="outline"
                                                                                                        size="sm"
                                                                                                        disabled={imageIndex === sharedImageUrls.length - 1}
                                                                                                        onClick={() => moveGroupImage(partIndex, questionIndex, imageIndex, imageIndex + 1, groupedQuestionCount)}
                                                                                                    >
                                                                                                        Xuống
                                                                                                    </Button>
                                                                                                    <Button
                                                                                                        type="button"
                                                                                                        variant="ghost"
                                                                                                        size="sm"
                                                                                                        className="text-destructive"
                                                                                                        onClick={() => removeGroupImage(partIndex, questionIndex, imageIndex, groupedQuestionCount)}
                                                                                                    >
                                                                                                        Xóa
                                                                                                    </Button>
                                                                                                </div>
                                                                                            )}
                                                                                        </div>

                                                                                        <div className="rounded-lg border p-2 bg-background flex justify-center">
                                                                                            <img
                                                                                                src={imageUrl}
                                                                                                alt={`Group ${partIndex + 1}-${Math.floor(questionIndex / groupedQuestionCount) + 1} edit preview ${imageIndex + 1}`}
                                                                                                className="max-h-56 w-auto object-contain rounded"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : null}

                                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                                        <label className="inline-flex">
                                                                            <input
                                                                                className="hidden"
                                                                                type="file"
                                                                                accept="image/*"
                                                                                onChange={async (event) => {
                                                                                    const inputElement = event.currentTarget;
                                                                                    const file = event.target.files?.[0];
                                                                                    if (!file) return;
                                                                                    await handleSharedImageUpload(
                                                                                        partIndex,
                                                                                        questionIndex,
                                                                                        file,
                                                                                        groupedQuestionCount,
                                                                                        isPart7Reading,
                                                                                    );
                                                                                    inputElement.value = '';
                                                                                }}
                                                                            />
                                                                            <Button
                                                                                type="button"
                                                                                variant="outline"
                                                                                size="sm"
                                                                                className="h-9"
                                                                                disabled={uploadingField === `${partIndex}-group-${questionIndex}-image`}
                                                                                asChild
                                                                            >
                                                                                <span>
                                                                                    {uploadingField === `${partIndex}-group-${questionIndex}-image`
                                                                                        ? 'Đang upload ảnh...'
                                                                                        : isPart6Reading || isPart7Reading
                                                                                            ? 'Upload hình đề bài lên Cloudinary'
                                                                                            : 'Upload hình chung lên Cloudinary'}
                                                                                </span>
                                                                            </Button>
                                                                        </label>
                                                                    </div>
                                                                </div>

                                                                <div className="space-y-3">
                                                                    {groupIndexes.map((groupQuestionIndex) => (
                                                                        <div key={`${partIndex}-${groupQuestionIndex}`} className="rounded-lg border bg-background p-3 space-y-3">
                                                                            <p className="text-sm font-medium">Câu {getGlobalQuestionNumber(partIndex, groupQuestionIndex)}</p>

                                                                            <FormField control={form.control} name={`parts.${partIndex}.manualQuestions.${groupQuestionIndex}.question`} render={({ field }) => (
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
                                                                                        name={`parts.${partIndex}.manualQuestions.${groupQuestionIndex}.${optionMeta.key}`}
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

                                                                            <FormField control={form.control} name={`parts.${partIndex}.manualQuestions.${groupQuestionIndex}.correctOption`} render={({ field }) => (
                                                                                <FormItem>
                                                                                    <FormLabel>Đáp án đúng</FormLabel>
                                                                                    <Select value={field.value} onValueChange={field.onChange}>
                                                                                        <FormControl>
                                                                                            <SelectTrigger className="h-10">
                                                                                                <SelectValue placeholder="Chọn đáp án" />
                                                                                            </SelectTrigger>
                                                                                        </FormControl>
                                                                                        <SelectContent>
                                                                                            {(['A', 'B', 'C', 'D'] as const).map((option) => (
                                                                                                <SelectItem key={option} value={option}>{option}</SelectItem>
                                                                                            ))}
                                                                                        </SelectContent>
                                                                                    </Select>
                                                                                    <FormMessage />
                                                                                </FormItem>
                                                                            )} />

                                                                            {isGroupedListeningPart && (
                                                                                <FormField
                                                                                    control={form.control}
                                                                                    name={`parts.${partIndex}.manualQuestions.${groupQuestionIndex}.transcript`}
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

                                                                            <FormField control={form.control} name={`parts.${partIndex}.manualQuestions.${groupQuestionIndex}.explanation`} render={({ field }) => (
                                                                                <FormItem>
                                                                                    <FormLabel>Giải thích (để user hiểu vì sao đúng/sai)</FormLabel>
                                                                                    <FormControl><Textarea rows={2} placeholder="Giải thích đáp án, mẹo làm bài, lỗi thường gặp..." {...field} /></FormControl>
                                                                                    <FormMessage />
                                                                                </FormItem>
                                                                            )} />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={`${partIndex}-${questionIndex}`} className="rounded-lg border p-3 bg-muted/10 space-y-3">
                                                    {(() => {
                                                        const isSpecialSingleQuestionPart = isPart1Listening || isPart2Listening || isPart5Reading;
                                                        const questionPanelMode = questionPanels[getQuestionPanelKey(partIndex, questionIndex)];
                                                        const isQuestionDetailsVisible = !isSpecialSingleQuestionPart || questionPanelMode === 'edit';

                                                        return (
                                                            <>
                                                    <div className="flex items-center justify-between">
                                                        <p className="text-sm font-medium">Câu {getGlobalQuestionNumber(partIndex, questionIndex)}</p>
                                                        <div className="flex items-center gap-2">
                                                            {isSpecialSingleQuestionPart && (
                                                                <>
                                                                    <Button
                                                                        type="button"
                                                                        variant={questionPanelMode === 'view' ? 'default' : 'outline'}
                                                                        size="sm"
                                                                        onClick={() => setQuestionPanel(partIndex, questionIndex, questionPanelMode === 'view' ? undefined : 'view')}
                                                                    >
                                                                        Xem
                                                                    </Button>
                                                                    <Button
                                                                        type="button"
                                                                        variant={questionPanelMode === 'edit' ? 'default' : 'outline'}
                                                                        size="sm"
                                                                        onClick={() => setQuestionPanel(partIndex, questionIndex, questionPanelMode === 'edit' ? undefined : 'edit')}
                                                                    >
                                                                        Sửa
                                                                    </Button>
                                                                </>
                                                            )}
                                                            <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeManualQuestion(partIndex, questionIndex)}>
                                                                Xóa
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {isSpecialSingleQuestionPart && !questionPanelMode && (
                                                        <p className="text-sm text-muted-foreground">Bấm “Xem” hoặc “Sửa” để mở chi tiết câu.</p>
                                                    )}

                                                    {isSpecialSingleQuestionPart && questionPanelMode === 'view' && (
                                                        <div className="rounded-lg border bg-background p-3 space-y-2 text-sm">
                                                            <p><span className="font-medium">Câu hỏi:</span> {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.question`) || 'Chưa có nội dung'}</p>
                                                            {isPart5Reading && (
                                                                <ul className="space-y-1 text-muted-foreground">
                                                                    <li>A. {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.optionA`) || '-'}</li>
                                                                    <li>B. {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.optionB`) || '-'}</li>
                                                                    <li>C. {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.optionC`) || '-'}</li>
                                                                    <li>D. {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.optionD`) || '-'}</li>
                                                                </ul>
                                                            )}
                                                            <p><span className="font-medium">Đáp án đúng:</span> {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.correctOption`) || 'A'}</p>
                                                            {(isPart1Listening || isPart2Listening) && (
                                                                <>
                                                                    {isPart1Listening && (
                                                                        <p><span className="font-medium">Ảnh:</span> {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`) || 'Chưa có'}</p>
                                                                    )}
                                                                    <p><span className="font-medium">Audio chung part:</span> {getPartSharedAudio(partIndex) || 'Chưa có'}</p>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}

                                                    {isQuestionDetailsVisible && (
                                                        <>

                                                    {isPart5Reading && (
                                                        <>
                                                            <FormField control={form.control} name={`parts.${partIndex}.manualQuestions.${questionIndex}.question`} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Câu Part 5 (điền từ vào chỗ trống)</FormLabel>
                                                                    <FormControl><Textarea rows={2} placeholder="Ví dụ: The report must be ----- by Friday." {...field} /></FormControl>
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

                                                    {!isPart1Listening && !isPart2Listening && !isPart5Reading && (
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

                                                    {isPart1Listening && (
                                                        <div className="rounded-lg border bg-background p-3">
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                                                Preview dạng Part 1
                                                            </p>
                                                            <div className="rounded-lg border p-2 bg-muted/20 mb-3 flex justify-center">
                                                                {form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`) ? (
                                                                    <img
                                                                        src={form.watch(`parts.${partIndex}.manualQuestions.${questionIndex}.imageUrl`)}
                                                                        alt={`Part 1 question ${getGlobalQuestionNumber(partIndex, questionIndex)}`}
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
                                                            !isPart5Reading && (
                                                            <FormField control={form.control} name={`parts.${partIndex}.manualQuestions.${questionIndex}.mediaUrl`} render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel>Media URL riêng (tuỳ chọn)</FormLabel>
                                                                    <FormControl><Input className="h-10" placeholder="https://..." {...field} /></FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )} />
                                                            )
                                                        )}
                                                    </div>

                                                    {isPart1Listening && (
                                                        <div className="rounded-lg border bg-background p-3 space-y-3">
                                                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                                Media cho Part 1 (Listening Photographs)
                                                            </p>

                                                            <div className="grid grid-cols-1 gap-3">
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
                                                            </div>

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
                                                                            await handleQuestionAssetUpload(partIndex, questionIndex, 'imageUrl', file);
                                                                            inputElement.value = '';
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
                                                            </div>
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
                                                        </>
                                                    )}
                                                            </>
                                                        );
                                                    })()}
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

            <Dialog
                open={aiImportOpen}
                onOpenChange={(open) => {
                    setAiImportOpen(open);
                    if (!open) {
                        setAiImportParsedQuestions([]);
                        setAiImportPart7Pattern(null);
                    }
                }}
            >
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            AI phân tích & nạp câu hỏi Part {aiImportTargetPartIndex !== null
                                ? (Number(form.getValues(`parts.${aiImportTargetPartIndex}.part`)) || '?')
                                : '?'}
                        </DialogTitle>
                        <DialogDescription>
                            Dán nội dung câu hỏi + đáp án (nếu có). AI sẽ trả JSON chuẩn để bạn duyệt trước khi nạp vào Part đang chọn.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <FormItem>
                            <FormLabel>Nội dung nguồn</FormLabel>
                            <FormControl>
                                <Textarea
                                    rows={12}
                                    placeholder="Dán nội dung câu hỏi vào đây..."
                                    value={aiImportText}
                                    onChange={(event) => setAiImportText(event.target.value)}
                                />
                            </FormControl>
                        </FormItem>

                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                {aiImportParsedQuestions.length > 0
                                    ? `AI trích xuất ${aiImportParsedQuestions.length} câu. Hãy kiểm tra trước khi nạp.`
                                    : 'Chưa có kết quả phân tích.'}
                            </p>
                            <Button type="button" onClick={handleAiAnalyzeImport} disabled={aiImportLoading}>
                                {aiImportLoading ? 'Đang phân tích...' : 'Phân tích'}
                            </Button>
                        </div>

                        {aiImportPart7Pattern && aiImportPart7Pattern.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                                Pattern cụm Part 7: <span className="font-mono">{aiImportPart7Pattern.join('')}</span>
                            </p>
                        )}

                        {aiImportParsedQuestions.length > 0 && (
                            <div className="rounded-lg border p-3 bg-muted/10 space-y-2 max-h-64 overflow-y-auto">
                                {aiImportParsedQuestions.slice(0, 8).map((item, index) => (
                                    <div key={`${item.question}-${index}`} className="text-sm">
                                        <p className="font-medium">{index + 1}. {item.question}</p>
                                        <p className="text-muted-foreground">Đáp án đúng: {item.correctOption}</p>
                                    </div>
                                ))}
                                {aiImportParsedQuestions.length > 8 && (
                                    <p className="text-xs text-muted-foreground italic">
                                        ... và {aiImportParsedQuestions.length - 8} câu nữa
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setAiImportOpen(false);
                                setAiImportParsedQuestions([]);
                            }}
                        >
                            Hủy
                        </Button>
                        <Button type="button" onClick={applyAiImportedQuestions} disabled={aiImportParsedQuestions.length === 0}>
                            Chấp nhận & nạp
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Form>
    );
}
