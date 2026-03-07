import { useEffect, useMemo, useState } from 'react';
import { useForm, FormProvider, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Eye, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { StemField } from './fields/StemField';
import { OptionsField } from './fields/OptionsField';
import { TagsField } from './fields/TagsField';
import { QuestionPreview } from '../QuestionPreview/QuestionPreview';
import type { IQuestion, ICreateQuestionPayload } from '../../types';
import {
    QUESTION_TYPE_LABELS,
    QUESTION_SKILL_LABELS,
    QUESTION_SOURCE_LABELS,
    QUESTION_DIFFICULTY_COLORS,
} from '../../types';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const optionSchema = z.object({
    key: z.string().min(1),
    text: z.string().min(1, 'Vui lòng nhập nội dung đáp án'),
    isCorrect: z.boolean().default(false),
});

const formSchema = z.object({
    languageId: z.string().min(1, 'Cần chọn ngôn ngữ'),
    testedConcept: z.string().min(2, 'Tối thiểu 2 ký tự'),
    source: z.enum(['placement_test', 'course', 'practice'] as const),
    skill: z.enum(['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocabulary'] as const),
    part: z.coerce.number().int().min(1).max(7).optional().or(z.literal('')),
    difficulty: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const),
    difficultyLevel: z.coerce.number().int().min(1).max(10),
    type: z.enum([
        'MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'ERROR_CORRECTION',
        'TRUE_FALSE', 'MATCHING', 'PRONUNCIATION', 'ESSAY',
    ] as const),
    stem: z.object({
        text: z.string().optional(),
        audioUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
        imageUrl: z.string().url('URL không hợp lệ').optional().or(z.literal('')),
    }).refine(
        (v) => v.text || v.audioUrl || v.imageUrl,
        { message: 'Cần ít nhất một trường stem (text, audio, hoặc image)' },
    ),
    options: z.array(optionSchema).min(2, 'Cần tối thiểu 2 đáp án').max(6).optional().default([]),
    correctAnswer: z.string().optional().default(''),
    content: z.record(z.string(), z.unknown()).optional().default({}),
    explanation: z.string().optional(),
    tags: z.array(z.string()).max(20).default([]),
});

type FormValues = z.infer<typeof formSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Map FormValues → ICreateQuestionPayload (fold options into content) */
function toPayload(values: FormValues): ICreateQuestionPayload {
    const { options, correctAnswer, content, part, ...rest } = values;
    const resolvedContent: Record<string, unknown> =
        values.type === 'MULTIPLE_CHOICE'
            ? { options: options ?? [], correctAnswer }
            : content ?? {};
    return {
        ...rest,
        part: part === '' ? undefined : Number(part),
        content: resolvedContent,
        options: options ?? [],
        correctAnswer: correctAnswer ?? '',
    };
}

/** Map IQuestion → default FormValues for edit mode */
function toFormValues(q: IQuestion): Partial<FormValues> {
    const mc = q.content as Record<string, unknown>;
    return {
        ...q,
        languageId: q.languageId,
        difficultyLevel: q.difficultyLevel ?? 1,
        options: (mc?.options as FormValues['options']) ?? [],
        correctAnswer: (mc?.correctAnswer as string) ?? '',
        content: mc ?? {},
        explanation: q.explanation ?? '',
        tags: q.tags ?? [],
    };
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    defaultValues?: IQuestion;
    prefillValues?: Partial<ICreateQuestionPayload>;
    isSubmitting: boolean;
    onSaveDraft: (payload: ICreateQuestionPayload) => void;
    onSubmitForReview: (payload: ICreateQuestionPayload) => void;
    onAutoSave?: (payload: ICreateQuestionPayload) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuestionForm({ defaultValues, prefillValues, isSubmitting, onSaveDraft, onSubmitForReview, onAutoSave }: Props) {
    const [isAutoSaving, setIsAutoSaving] = useState(false);
    const [lastAutoSavedAt, setLastAutoSavedAt] = useState<Date | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as Resolver<FormValues>,
        defaultValues: defaultValues
            ? (toFormValues(defaultValues) as FormValues)
            : {
                languageId: (prefillValues?.languageId as FormValues['languageId']) ?? '',
                testedConcept: (prefillValues?.testedConcept as FormValues['testedConcept']) ?? '',
                source: (prefillValues?.source as FormValues['source']) ?? 'course',
                skill: (prefillValues?.skill as FormValues['skill']) ?? 'grammar',
                difficulty: 'B1',
                difficultyLevel: 5,
                type: 'MULTIPLE_CHOICE',
                stem: {},
                part: (prefillValues?.part as FormValues['part']) ?? '',
                options: [
                    { key: 'A', text: '', isCorrect: false },
                    { key: 'B', text: '', isCorrect: false },
                    { key: 'C', text: '', isCorrect: false },
                    { key: 'D', text: '', isCorrect: false },
                ],
                correctAnswer: '',
                content: {},
                tags: [],
            },
    });

    const watchedValues = form.watch();
    const questionType = form.watch('type');
    const isMC = questionType === 'MULTIPLE_CHOICE';

    const checklist = useMemo(() => {
        const values = watchedValues;
        const hasClassification = Boolean(values.languageId && values.source && values.skill && values.difficulty && values.type);
        const hasStem = Boolean(values.stem?.text || values.stem?.audioUrl || values.stem?.imageUrl);
        const hasAudioForListening = values.skill !== 'listening' || Boolean(values.stem?.audioUrl);
        const hasTranscriptForListening = values.skill !== 'listening' || Boolean((values.content as Record<string, unknown> | undefined)?.transcript);
        const hasOptions = values.type !== 'MULTIPLE_CHOICE' || (values.options?.length ?? 0) >= 2;
        const hasCorrectAnswer = values.type !== 'MULTIPLE_CHOICE' || Boolean(values.correctAnswer);
        const hasExplanation = Boolean(values.explanation && values.explanation.trim().length >= 20);

        const items = [
            { label: 'Phân loại đầy đủ', done: hasClassification },
            { label: 'Có stem (text/audio/image)', done: hasStem },
            { label: 'Listening có audio', done: hasAudioForListening },
            { label: 'Listening có transcript', done: hasTranscriptForListening },
            { label: 'Đủ options', done: hasOptions },
            { label: 'Đã chọn đáp án đúng', done: hasCorrectAnswer },
            { label: 'Giải thích >= 20 ký tự', done: hasExplanation },
        ];

        const doneCount = items.filter((item) => item.done).length;
        return { items, doneCount, total: items.length };
    }, [watchedValues]);

    const canSubmitForReview = checklist.doneCount >= 6;

    const quality = useMemo(() => {
        const optionCount = watchedValues.options?.length ?? 0;
        const score = Math.min(100, Math.round((checklist.doneCount / checklist.total) * 100 + (optionCount >= 4 ? 10 : 0)));
        return {
            score,
            mismatchDifficulty: watchedValues.difficulty !== 'B1' && watchedValues.skill === 'listening',
        };
    }, [checklist.doneCount, checklist.total, watchedValues.options, watchedValues.difficulty, watchedValues.skill]);

    const previewValues = useMemo<Partial<ICreateQuestionPayload>>(
        () => toPayload(watchedValues as FormValues),
        [watchedValues],
    );

    useEffect(() => {
        if (!onAutoSave) return;

        const interval = setInterval(() => {
            if (isSubmitting || isAutoSaving || !form.formState.isDirty) {
                return;
            }

            void form.handleSubmit(async (values) => {
                setIsAutoSaving(true);
                try {
                    await onAutoSave(toPayload(values));
                    setLastAutoSavedAt(new Date());
                    form.reset(values);
                } finally {
                    setIsAutoSaving(false);
                }
            })();
        }, 30000);

        return () => clearInterval(interval);
    }, [form, isAutoSaving, isSubmitting, onAutoSave]);

    return (
        <FormProvider {...form}>
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                    <div>
                        <h1 className="text-lg font-semibold">Tạo câu hỏi mới</h1>
                        <p className="text-xs text-muted-foreground">v1 · Draft</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                            {isAutoSaving
                                ? '💾 Đang tự lưu...'
                                : lastAutoSavedAt
                                    ? `💾 Đã tự lưu lúc ${lastAutoSavedAt.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
                                    : '💾 Auto-save mỗi 30 giây'}
                        </span>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={form.handleSubmit((v) => onSaveDraft(toPayload(v)))}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Lưu nháp
                        </Button>
                        <Button type="button" variant="outline">
                            <Eye className="mr-2 h-4 w-4" />
                            Xem trước
                        </Button>
                        <Button
                            type="button"
                            onClick={form.handleSubmit((v) => onSubmitForReview(toPayload(v)))}
                            disabled={isSubmitting || !canSubmitForReview}
                        >
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Gửi duyệt
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-[1.8fr_1fr] gap-6">
                {/* ── Left: Form ── */}
                <Form {...form}>
                    <div className="flex flex-col gap-6">
                        {/* Meta */}
                        <div className="flex flex-col gap-4">
                            <h2 className="text-base font-semibold">Thông tin câu hỏi</h2>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Source */}
                                <FormField
                                    control={form.control}
                                    name="source"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nguồn</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn nguồn" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(QUESTION_SOURCE_LABELS).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Skill */}
                                <FormField
                                    control={form.control}
                                    name="skill"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Kỹ năng</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn kỹ năng" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(QUESTION_SKILL_LABELS).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Difficulty */}
                                <FormField
                                    control={form.control}
                                    name="difficulty"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Độ khó (CEFR)</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn cấp độ" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.keys(QUESTION_DIFFICULTY_COLORS).map((level) => (
                                                        <SelectItem key={level} value={level}>{level}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Type */}
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Dạng câu hỏi</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Chọn dạng" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Part */}
                                <FormField
                                    control={form.control}
                                    name="part"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Part (tuỳ chọn)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    min={1}
                                                    max={7}
                                                    placeholder="1–7"
                                                    value={field.value ?? ''}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {/* Difficulty level */}
                                <FormField
                                    control={form.control}
                                    name="difficultyLevel"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Điểm khó (1–10)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    placeholder="5"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Tested concept + languageId */}
                            <div className="grid grid-cols-2 gap-3">
                                <FormField
                                    control={form.control}
                                    name="testedConcept"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Khái niệm kiểm tra</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="e.g. present perfect" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="languageId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Language ID</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="MongoDB ObjectId" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <Separator />

                        {/* Stem */}
                        <StemField />

                        <Separator />

                        {/* Options (MC only) */}
                        {isMC && (
                            <>
                                <OptionsField />
                                <Separator />
                            </>
                        )}

                        {/* Explanation */}
                        <FormField
                            control={form.control}
                            name="explanation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Giải thích đáp án (tuỳ chọn)</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Vì sao đáp án này đúng..."
                                            rows={2}
                                            className="resize-none"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Separator />

                        {/* Tags */}
                        <TagsField />

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={form.handleSubmit((v) => onSaveDraft(toPayload(v)))}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Lưu nháp
                            </Button>
                            <Button
                                type="button"
                                onClick={form.handleSubmit((v) => onSubmitForReview(toPayload(v)))}
                                disabled={isSubmitting || !canSubmitForReview}
                                className="flex-1"
                            >
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Gửi duyệt
                            </Button>
                        </div>
                    </div>
                </Form>

                {/* ── Right: Live preview ── */}
                <div className="flex flex-col gap-4">
                    <QuestionPreview formValues={previewValues} />

                    <div className="rounded-xl border bg-card p-4 space-y-3">
                        <p className="text-sm font-semibold">Trạng thái & Workflow</p>
                        <div className="text-xs text-muted-foreground">Draft → In Review → Published</div>
                        <div className="space-y-2">
                            {checklist.items.map((item) => (
                                <div key={item.label} className="flex items-center justify-between text-xs">
                                    <span>{item.label}</span>
                                    <span className={item.done ? 'text-green-600' : 'text-muted-foreground'}>{item.done ? '✅' : '⬜'}</span>
                                </div>
                            ))}
                        </div>
                        <div className="text-xs font-medium">Checklist: {checklist.doneCount}/{checklist.total}</div>
                    </div>

                    <div className="rounded-xl border bg-card p-4 space-y-2">
                        <p className="text-sm font-semibold">AI Quality Check</p>
                        <div className="text-xs">Chất lượng ước tính: <span className="font-semibold">{quality.score}/100</span></div>
                        <div className="text-xs text-muted-foreground">
                            {quality.mismatchDifficulty
                                ? '⚠️ Difficulty có thể chưa khớp với độ phức tạp listening hiện tại.'
                                : '✅ Difficulty và cấu trúc hiện tại đang hợp lý.'}
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </FormProvider>
    );
}
