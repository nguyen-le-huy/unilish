import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { diffWords } from 'diff';
import { AlertTriangle, Sparkles, Save, CheckCircle2, Circle } from 'lucide-react';
import { FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

import { notification } from '@/lib/notification';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';

import { useWritingContent } from '../../hooks/useWritingContent';
import {
    useGenerateWritingMission,
    useSaveWritingContent,
    useTestDriveGrade,
} from '../../hooks/useWritingMutations';
import type {
    LessonSummary,
    WritingLessonFormValues,
    WritingFormat,
    WritingTone,
} from '../../types/course.types';

interface Props {
    lesson: LessonSummary;
}

export interface WritingStudioRef {
    saveWritingContent: () => Promise<void>;
    openTestDrive: () => void;
}

const writingSchema = z.object({
    prompt: z.string().min(1, 'Prompt không được để trống'),
    promptTranslation: z.string(),
    config: z
        .object({
            minWords: z.number().int().min(1),
            maxWords: z.number().int().min(1),
            format: z.enum(['EMAIL', 'ESSAY', 'STORY', 'CHAT']),
            tone: z.enum(['FORMAL', 'CASUAL', 'NEUTRAL']),
        })
        .refine((value) => value.minWords <= value.maxWords, {
            path: ['minWords'],
            message: 'minWords không được lớn hơn maxWords',
        }),
    requiredConcepts: z.array(
        z.object({
            id: z.string(),
            conceptId: z.string().min(1, 'Concept ID bắt buộc'),
            keyword: z.string().min(1, 'Keyword bắt buộc'),
            points: z.number().int().min(0),
        }),
    ),
    requiredGrammar: z.string(),
    sentenceStarters: z.array(z.string()),
    warmupTasks: z.array(
        z.object({
            id: z.string(),
            type: z.literal('UNSCRAMBLE'),
            words: z.array(z.string()),
            correct: z.string().min(1, 'Câu correct bắt buộc'),
        }),
    ),
    taughtConcepts: z.array(z.string()),
});

const DEFAULT_VALUES: WritingLessonFormValues = {
    prompt: '',
    promptTranslation: '',
    config: {
        minWords: 120,
        maxWords: 180,
        format: 'EMAIL',
        tone: 'FORMAL',
    },
    requiredConcepts: [],
    requiredGrammar: '',
    sentenceStarters: [],
    warmupTasks: [],
    taughtConcepts: [],
};

type SectionKey = 'warmup' | 'prompt-constraints' | 'scaffolding';

const shuffleWords = (text: string): string[] => {
    const words = text
        .replace(/[.,!?;:]/g, '')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 0);

    const cloned = [...words];
    for (let i = cloned.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [cloned[i], cloned[j]] = [cloned[j]!, cloned[i]!];
    }
    return cloned;
};

const normalizeWords = (words: string[]) => words.map((word) => word.trim().toLowerCase());

const ensureShuffledWords = (words: string[], correct: string): string[] => {
    const orderedWords = correct
        .replace(/[.,!?;:]/g, '')
        .split(/\s+/)
        .map((word) => word.trim())
        .filter((word) => word.length > 0);

    if (words.length === 0) {
        return shuffleWords(correct);
    }

    const normalizedCurrent = normalizeWords(words);
    const normalizedOrdered = normalizeWords(orderedWords);
    const sameOrder =
        normalizedCurrent.length === normalizedOrdered.length
        && normalizedCurrent.every((word, index) => word === normalizedOrdered[index]);

    if (!sameOrder) {
        return words;
    }

    if (words.length <= 1) {
        return words;
    }

    return [words[words.length - 1]!, ...words.slice(0, words.length - 1)];
};

export const WritingStudio = forwardRef<WritingStudioRef, Props>(function WritingStudio({ lesson }: Props, ref) {
    const lessonId = lesson._id;

    const { data: content, isLoading, isError } = useWritingContent(lessonId);
    const saveMutation = useSaveWritingContent(lessonId);
    const generateMutation = useGenerateWritingMission(lessonId);
    const testDriveMutation = useTestDriveGrade(lessonId);

    const [activeSection, setActiveSection] = useState<SectionKey>('warmup');
    const [isTestDriveOpen, setIsTestDriveOpen] = useState(false);
    const [studentSubmission, setStudentSubmission] = useState('');
    const [warmupAnswers, setWarmupAnswers] = useState<Record<string, string>>({});

    const methods = useForm<WritingLessonFormValues>({
        resolver: zodResolver(writingSchema),
        defaultValues: DEFAULT_VALUES,
        mode: 'onChange',
    });

    const { control, reset, getValues, setValue, trigger } = methods;

    const warmupFields = useFieldArray({ control, name: 'warmupTasks' });
    const requiredConceptFields = useFieldArray({ control, name: 'requiredConcepts' });

    const requiredConcepts = useWatch({ control, name: 'requiredConcepts' }) ?? [];
    const prompt = useWatch({ control, name: 'prompt' }) ?? '';
    const promptTranslation = useWatch({ control, name: 'promptTranslation' }) ?? '';
    const minWords = useWatch({ control, name: 'config.minWords' });
    const maxWords = useWatch({ control, name: 'config.maxWords' });
    const format = useWatch({ control, name: 'config.format' }) ?? 'EMAIL';
    const tone = useWatch({ control, name: 'config.tone' }) ?? 'FORMAL';
    const requiredGrammar = useWatch({ control, name: 'requiredGrammar' }) ?? '';
    const warmupTasks = useWatch({ control, name: 'warmupTasks' }) ?? [];
    const sentenceStarters = useWatch({ control, name: 'sentenceStarters' }) ?? [];

    useEffect(() => {
        if (!content) return;
        reset(content, { keepDirtyValues: false });
    }, [content, reset]);

    useEffect(() => {
        const taughtConcepts = Array.from(
            new Set((requiredConcepts ?? []).map((item) => item.conceptId).filter((id) => id.trim().length > 0)),
        );
        setValue('taughtConcepts', taughtConcepts, { shouldDirty: true, shouldValidate: false });
    }, [requiredConcepts, setValue]);

    const keywordHits = useMemo(() => {
        const normalized = studentSubmission;
        return requiredConcepts.map((item) => {
            const pattern = new RegExp(`\\b${item.keyword.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
            return {
                keyword: item.keyword,
                hit: pattern.test(normalized),
            };
        });
    }, [requiredConcepts, studentSubmission]);

    const progress = keywordHits.length === 0
        ? 0
        : Math.round((keywordHits.filter((item) => item.hit).length / keywordHits.length) * 100);

    const normalizeSentence = (value: string) => value
        .trim()
        .toLowerCase()
        .replace(/[.,!?;:]/g, '')
        .replace(/\s+/g, ' ');

    const warmupChecks = useMemo(() => warmupTasks.map((task) => {
        const answer = warmupAnswers[task.id] ?? '';
        const isCorrect = answer.length > 0 && normalizeSentence(answer) === normalizeSentence(task.correct);
        const displayWords = ensureShuffledWords(task.words, task.correct);

        return {
            id: task.id,
            words: displayWords,
            correct: task.correct,
            answer,
            isCorrect,
        };
    }), [warmupAnswers, warmupTasks]);

    const solvedWarmups = warmupChecks.filter((task) => task.isCorrect).length;

    const renderDiff = (source: string, target: string) => {
        const chunks = diffWords(source, target);
        return chunks.map((chunk, idx) => {
            if (chunk.added) {
                return (
                    <ins key={`${idx}-${chunk.value}`} className="bg-emerald-100 px-0.5 no-underline">
                        {chunk.value}
                    </ins>
                );
            }
            if (chunk.removed) {
                return (
                    <del key={`${idx}-${chunk.value}`} className="bg-red-100 px-0.5 text-red-700">
                        {chunk.value}
                    </del>
                );
            }
            return <span key={`${idx}-${chunk.value}`}>{chunk.value}</span>;
        });
    };

    const handleSave = async () => {
        const isValid = await trigger();
        if (!isValid) {
            notification.warning('Nội dung Writing chưa hợp lệ.');
            return;
        }

        await saveMutation.mutateAsync(getValues());
        notification.success('Đã lưu nội dung Writing.');
    };

    const handleGenerate = async () => {
        const values = getValues();
        const payload = {
            level: 'A2' as const,
            format: values.config.format,
            tone: values.config.tone,
            minWords: values.config.minWords,
            maxWords: values.config.maxWords,
            topic: lesson.title,
        };

        try {
            const generated = await generateMutation.mutateAsync(payload);
            reset(generated, { keepDirtyValues: false });
            notification.success('Đã tạo nội dung Writing bằng AI.');
        } catch {
            notification.error('Không thể tạo nội dung Writing bằng AI.');
        }
    };

    const handleWarmupBlur = (index: number) => {
        const value = getValues(`warmupTasks.${index}.correct`)?.trim();
        if (!value) return;
        setValue(`warmupTasks.${index}.words`, shuffleWords(value), { shouldDirty: true });
    };

    useImperativeHandle(ref, () => ({
        saveWritingContent: handleSave,
        openTestDrive: () => setIsTestDriveOpen(true),
    }));

    if (isLoading) {
        return <Skeleton className="h-full w-full" />;
    }

    if (isError) {
        return (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <div className="space-y-2 text-center">
                    <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
                    <p>Không tải được nội dung Writing.</p>
                </div>
            </div>
        );
    }

    return (
        <FormProvider {...methods}>
            <div className="flex h-full flex-col overflow-hidden">
                <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
                    <div>
                        <p className="text-xs text-muted-foreground">WRITING STUDIO</p>
                        <h3 className="text-base font-semibold">{lesson.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={handleGenerate} disabled={generateMutation.isPending}>
                            <Sparkles className="mr-2 h-4 w-4" />
                            {generateMutation.isPending ? 'Đang tạo...' : 'AI Soạn Đề'}
                        </Button>
                        <Button type="button" onClick={() => void handleSave()} disabled={saveMutation.isPending}>
                            <Save className="mr-2 h-4 w-4" />
                            {saveMutation.isPending ? 'Đang lưu...' : 'Lưu & Xuất bản'}
                        </Button>
                    </div>
                </div>

                <div className="flex min-h-0 flex-1 overflow-hidden">
                    <aside className="w-1/5 border-r bg-muted/20 p-3 text-sm">
                        <p className="font-semibold">Curriculum Context</p>
                        <p className="mt-2 text-muted-foreground">Bài học: {lesson.title}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Read-only pane.</p>
                    </aside>

                    <aside className="w-1/4 border-r p-3">
                        <p className="mb-3 text-sm font-semibold">Writing Process</p>
                        <div className="space-y-2">
                            <button
                                type="button"
                                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${activeSection === 'warmup' ? 'bg-primary/10 border-primary' : ''}`}
                                onClick={() => setActiveSection('warmup')}
                            >
                                🧩 Khởi động
                                {warmupFields.fields.length === 0 && <span className="ml-2 text-xs text-destructive">Thiếu dữ liệu</span>}
                            </button>
                            <button
                                type="button"
                                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${activeSection === 'prompt-constraints' ? 'bg-primary/10 border-primary' : ''}`}
                                onClick={() => setActiveSection('prompt-constraints')}
                            >
                                ✍️ Đề bài & Ràng buộc
                                {(!prompt.trim() || (minWords ?? 0) > (maxWords ?? 0)) && (
                                    <span className="ml-2 text-xs text-destructive">Thiếu dữ liệu</span>
                                )}
                            </button>
                            <button
                                type="button"
                                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${activeSection === 'scaffolding' ? 'bg-primary/10 border-primary' : ''}`}
                                onClick={() => setActiveSection('scaffolding')}
                            >
                                💡 Giàn giáo hỗ trợ
                            </button>
                        </div>
                    </aside>

                    <section className="min-h-0 flex-1 overflow-y-auto p-4">
                        {activeSection === 'warmup' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold">Warm-up Tasks</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => warmupFields.append({ id: crypto.randomUUID(), type: 'UNSCRAMBLE', words: [], correct: '' })}
                                    >
                                        + Thêm
                                    </Button>
                                </div>
                                {warmupFields.fields.map((field, index) => (
                                    <div key={field.id} className="rounded-md border p-3 space-y-2">
                                        <Label>Câu chuẩn</Label>
                                        <Input
                                            value={warmupTasks[index]?.correct ?? ''}
                                            onChange={(event) => setValue(`warmupTasks.${index}.correct`, event.target.value, { shouldDirty: true })}
                                            onBlur={() => handleWarmupBlur(index)}
                                            placeholder="Ví dụ: I lost my luggage at the airport."
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Words: {(warmupTasks[index]?.words ?? []).join(' | ')}
                                        </p>
                                        <div className="flex justify-end">
                                            <Button type="button" variant="ghost" size="sm" onClick={() => warmupFields.remove(index)}>
                                                Xóa
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeSection === 'prompt-constraints' && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                        <Label>Format</Label>
                                        <Select
                                            value={format as WritingFormat}
                                            onValueChange={(value) => setValue('config.format', value as WritingFormat, { shouldDirty: true })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="EMAIL">EMAIL</SelectItem>
                                                <SelectItem value="ESSAY">ESSAY</SelectItem>
                                                <SelectItem value="STORY">STORY</SelectItem>
                                                <SelectItem value="CHAT">CHAT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Tone</Label>
                                        <Select
                                            value={tone as WritingTone}
                                            onValueChange={(value) => setValue('config.tone', value as WritingTone, { shouldDirty: true })}
                                        >
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="FORMAL">FORMAL</SelectItem>
                                                <SelectItem value="CASUAL">CASUAL</SelectItem>
                                                <SelectItem value="NEUTRAL">NEUTRAL</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Min words</Label>
                                        <Input
                                            type="number"
                                            value={minWords ?? 0}
                                            onChange={(event) => setValue('config.minWords', Number(event.target.value), { shouldDirty: true })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label>Max words</Label>
                                        <Input
                                            type="number"
                                            value={maxWords ?? 0}
                                            onChange={(event) => setValue('config.maxWords', Number(event.target.value), { shouldDirty: true })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <Label>Prompt</Label>
                                    <Textarea
                                        rows={5}
                                        value={prompt}
                                        onChange={(event) => setValue('prompt', event.target.value, { shouldDirty: true })}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label>Dịch tiếng Việt</Label>
                                    <Textarea
                                        rows={4}
                                        value={promptTranslation}
                                        onChange={(event) => setValue('promptTranslation', event.target.value, { shouldDirty: true })}
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label>Required Grammar</Label>
                                    <Input
                                        value={requiredGrammar}
                                        onChange={(event) => setValue('requiredGrammar', event.target.value, { shouldDirty: true })}
                                        placeholder="Ví dụ: Past Simple"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="font-semibold">Required Concepts</p>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => requiredConceptFields.append({ id: crypto.randomUUID(), conceptId: '', keyword: '', points: 10 })}
                                        >
                                            + Thêm
                                        </Button>
                                    </div>
                                    {requiredConceptFields.fields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-12 gap-2 rounded-md border p-2">
                                            <Input
                                                className="col-span-4"
                                                placeholder="Keyword"
                                                value={requiredConcepts[index]?.keyword ?? ''}
                                                onChange={(event) => setValue(`requiredConcepts.${index}.keyword`, event.target.value, { shouldDirty: true })}
                                            />
                                            <Input
                                                className="col-span-5"
                                                placeholder="Concept ID"
                                                value={requiredConcepts[index]?.conceptId ?? ''}
                                                onChange={(event) => setValue(`requiredConcepts.${index}.conceptId`, event.target.value, { shouldDirty: true })}
                                            />
                                            <Input
                                                className="col-span-2"
                                                type="number"
                                                value={requiredConcepts[index]?.points ?? 0}
                                                onChange={(event) => setValue(`requiredConcepts.${index}.points`, Number(event.target.value), { shouldDirty: true })}
                                            />
                                            <Button className="col-span-1" type="button" variant="ghost" size="icon" onClick={() => requiredConceptFields.remove(index)}>
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeSection === 'scaffolding' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold">Sentence Starters</p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setValue('sentenceStarters', [...sentenceStarters, ''], { shouldDirty: true })}
                                    >
                                        + Thêm
                                    </Button>
                                </div>
                                {sentenceStarters.map((_, index) => (
                                    <div key={`starter-${index}`} className="flex gap-2">
                                        <Input
                                            value={sentenceStarters[index] ?? ''}
                                            onChange={(event) => setValue(`sentenceStarters.${index}`, event.target.value, { shouldDirty: true })}
                                            placeholder="Ví dụ: Dear Customer Service Team,"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const next = sentenceStarters.filter((__, itemIndex) => itemIndex !== index);
                                                setValue('sentenceStarters', next, { shouldDirty: true });
                                            }}
                                        >
                                            Xóa
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <Dialog
                open={isTestDriveOpen}
                onOpenChange={(open) => {
                    setIsTestDriveOpen(open);
                    if (!open) {
                        setWarmupAnswers({});
                    }
                }}
            >
                <DialogContent className="h-[100vh] max-h-[100vh] w-screen max-w-none overflow-hidden rounded-none p-0">
                    <DialogHeader className="border-b px-6 py-4 text-left">
                        <DialogTitle>Test Drive — Writing Sandbox</DialogTitle>
                        <DialogDescription>
                            Mô phỏng học viên làm bài và kiểm tra luồng chấm điểm AI.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid h-full min-h-0 grid-cols-2 divide-x">
                        <div className="flex min-h-0 flex-col overflow-hidden">
                            <div className="border-b px-6 py-4">
                                <p className="text-sm text-muted-foreground">Prompt</p>
                                <p className="mt-1 text-sm font-medium whitespace-pre-wrap">{getValues('prompt') || '—'}</p>
                                <p className="mt-3 text-sm text-muted-foreground">Bản dịch tiếng Việt</p>
                                <p className="mt-1 text-sm whitespace-pre-wrap">{getValues('promptTranslation') || '—'}</p>
                                <p className="mt-3 text-xs text-muted-foreground">
                                    Warm-up solved: {solvedWarmups}/{warmupChecks.length}
                                </p>
                                <div className="mt-3 h-2 w-full rounded bg-muted">
                                    <div className="h-full rounded bg-emerald-500" style={{ width: `${progress}%` }} />
                                </div>
                            </div>

                            <div className="grid min-h-0 flex-1 grid-cols-[240px_1fr] overflow-hidden">
                                <aside className="border-r p-4 overflow-y-auto">
                                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Required Keywords</p>
                                    <div className="space-y-2">
                                        {keywordHits.map((item) => (
                                            <div key={item.keyword} className="flex items-center gap-2 text-sm">
                                                {item.hit ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
                                                <span>{item.keyword}</span>
                                            </div>
                                        ))}
                                    </div>
                                </aside>

                                <div className="flex min-h-0 flex-col p-4">
                                    {warmupChecks.length > 0 && (
                                        <div className="mb-3 max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Warm-up Test (Unscramble)
                                            </p>
                                            {warmupChecks.map((task, index) => (
                                                <div key={task.id} className="space-y-1 rounded border bg-muted/20 p-2">
                                                    <p className="text-xs text-muted-foreground">
                                                        Câu {index + 1}: {task.words.join(' · ')}
                                                    </p>
                                                    <Input
                                                        value={task.answer}
                                                        onChange={(event) => {
                                                            const nextValue = event.target.value;
                                                            setWarmupAnswers((prev) => ({
                                                                ...prev,
                                                                [task.id]: nextValue,
                                                            }));
                                                        }}
                                                        placeholder="Nhập câu đúng..."
                                                    />
                                                    {task.answer.trim().length > 0 && (
                                                        <p className={`text-xs ${task.isCorrect ? 'text-emerald-600' : 'text-destructive'}`}>
                                                            {task.isCorrect ? '✅ Correct' : '❌ Chưa đúng'}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <Textarea
                                        className="min-h-0 flex-1"
                                        value={studentSubmission}
                                        onChange={(event) => setStudentSubmission(event.target.value)}
                                        placeholder="Type student's submission here..."
                                    />
                                    <div className="mt-3 flex justify-end">
                                        <Button
                                            type="button"
                                            disabled={!studentSubmission.trim() || testDriveMutation.isPending}
                                            onClick={() => testDriveMutation.mutate({ submission: studentSubmission })}
                                        >
                                            {testDriveMutation.isPending ? 'Đang gửi bài cho giám khảo AI...' : 'Submit'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="min-h-0 overflow-y-auto p-6">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">AI Grader Console</p>

                            {testDriveMutation.isPending && (
                                <div className="mt-4 rounded-md border p-4 text-sm text-muted-foreground">
                                    Đang gửi bài cho giám khảo AI...
                                </div>
                            )}

                            {testDriveMutation.data && (
                                <div className="mt-4 space-y-4">
                                    <div className="rounded-md border p-4">
                                        <p className="text-sm font-semibold">Mức độ hoàn thành nhiệm vụ</p>
                                        <p className="text-2xl font-bold">{testDriveMutation.data.taskCompletionScore}/10</p>
                                        <p className="mt-2 text-sm text-muted-foreground">{testDriveMutation.data.grammarFeedback}</p>
                                    </div>

                                    <div className="rounded-md border p-4 space-y-3">
                                        <p className="text-sm font-semibold">Diff View (Native Rewrite)</p>
                                        <div className="rounded bg-muted/50 p-3 text-sm leading-7">
                                            {renderDiff(studentSubmission, testDriveMutation.data.nativeRewrite)}
                                        </div>
                                        <p className="text-sm text-muted-foreground">{testDriveMutation.data.explanation}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </FormProvider>
    );
});
