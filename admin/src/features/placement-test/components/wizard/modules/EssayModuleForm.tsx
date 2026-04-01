import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
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
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import apiClient from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { IModuleEssay } from '../../../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const essaySchema = z.object({
    name: z.string().min(1, 'Bắt buộc'),
    timeLimitMinutes: z.coerce.number().min(1),
    aiModel: z.string().min(1),
    wordLimit: z.coerce.number().min(1).default(250),
    topicsText: z.string().default(''),
    promptImageUrl: z.union([z.string().trim().url('URL ảnh không hợp lệ'), z.literal('')]).default(''),
});

type EssayFormValues = z.infer<typeof essaySchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    defaultValues?: Partial<IModuleEssay>;
    order: number;
    onSave: (data: IModuleEssay) => void;
    onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EssayModuleForm({ defaultValues, order, onSave, onCancel }: Props) {
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const toMultilineText = (items?: string[]) => (items ?? []).join('\n');
    const toStringList = (raw: string) =>
        raw
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);

    const mergedTopics = [
        ...(defaultValues?.topicsByLevel?.low ?? []),
        ...(defaultValues?.topicsByLevel?.mid ?? []),
        ...(defaultValues?.topicsByLevel?.high ?? []),
    ];

    const uniqueTopics = Array.from(new Set(mergedTopics.map((topic) => topic.trim()).filter(Boolean)));

    const resolvedWordLimit =
        defaultValues?.wordLimits?.mid
        ?? defaultValues?.wordLimits?.low
        ?? defaultValues?.wordLimits?.high
        ?? 250;

    const form = useForm<EssayFormValues>({
        resolver: zodResolver(essaySchema) as Resolver<EssayFormValues>,
        defaultValues: {
            name: defaultValues?.name ?? 'Writing Task',
            timeLimitMinutes: defaultValues?.timeLimitMinutes ?? 60,
            aiModel: defaultValues?.aiModel ?? 'gpt-4o-mini',
            wordLimit: resolvedWordLimit,
            topicsText: toMultilineText(uniqueTopics),
            promptImageUrl: defaultValues?.promptImageUrl ?? '',
        },
    });

    async function uploadPromptImage(file: File): Promise<void> {
        setIsUploadingImage(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'placement-tests/manual/essay-prompts');
            const response = await apiClient.post<ApiResponse<{ url: string; type: string }>>('/upload', formData);
            form.setValue('promptImageUrl', response.data.data.url, {
                shouldDirty: true,
                shouldValidate: true,
            });
            toast.success('Đã upload ảnh đề bài');
        } catch {
            toast.error('Upload ảnh thất bại');
        } finally {
            setIsUploadingImage(false);
        }
    }

    function onSubmit(values: EssayFormValues) {
        const sharedTopics = toStringList(values.topicsText);
        const normalizedPromptImageUrl = values.promptImageUrl.trim();

        onSave({
            order,
            type: 'essay',
            promptSource: sharedTopics.length ? 'library' : 'ai_generated',
            criteria: defaultValues?.criteria ?? ['TR', 'CC', 'LR', 'GRA'],
            topicsByLevel: {
                low: sharedTopics,
                mid: sharedTopics,
                high: sharedTopics,
            },
            name: values.name,
            timeLimitMinutes: values.timeLimitMinutes,
            aiModel: values.aiModel,
            wordLimits: {
                low: values.wordLimit,
                mid: values.wordLimit,
                high: values.wordLimit,
            },
            secureMode: defaultValues?.secureMode ?? {
                disablePaste: true,
                disableSpellcheck: true,
            },
            ...(normalizedPromptImageUrl ? { promptImageUrl: normalizedPromptImageUrl } : {}),
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel>Tên module <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="timeLimitMinutes" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Thời gian (phút)</FormLabel>
                            <FormControl><Input type="number" min={1} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                </div>

                <Separator />

                <FormField control={form.control} name="wordLimit" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Số từ tối thiểu (one for all)</FormLabel>
                        <FormControl><Input type="number" min={1} className="h-9 max-w-xs" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <div className="space-y-3">
                    <p className="text-sm font-medium">Đề bài thủ công (one for all)</p>
                    <p className="text-xs text-muted-foreground">
                        Mỗi dòng là 1 đề bài Writing Task 2 dùng chung cho mọi trình độ. Để trống nếu muốn hệ thống sinh đề bằng AI.
                    </p>
                    <FormField control={form.control} name="topicsText" render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea rows={8} placeholder="Do you prefer living in a city or the countryside?" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="promptImageUrl" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ảnh đề bài (tuỳ chọn)</FormLabel>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                                <FormControl>
                                    <Input
                                        className="h-9"
                                        placeholder="https://..."
                                        value={field.value}
                                        onChange={field.onChange}
                                    />
                                </FormControl>

                                <label className="inline-flex">
                                    <input
                                        className="hidden"
                                        type="file"
                                        accept="image/*"
                                        onChange={async (event) => {
                                            const inputElement = event.currentTarget;
                                            const file = event.target.files?.[0];
                                            if (!file) return;
                                            await uploadPromptImage(file);
                                            inputElement.value = '';
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="h-9"
                                        disabled={isUploadingImage}
                                        asChild
                                    >
                                        <span>{isUploadingImage ? 'Đang upload...' : 'Upload ảnh'}</span>
                                    </Button>
                                </label>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="h-9"
                                    disabled={!field.value}
                                    onClick={() => field.onChange('')}
                                >
                                    Xoá ảnh
                                </Button>
                            </div>
                            {field.value && (
                                <div className="mt-2 rounded-lg border bg-muted/20 p-2">
                                    <img
                                        src={field.value}
                                        alt="Prompt preview"
                                        className="max-h-56 w-auto rounded object-contain"
                                    />
                                </div>
                            )}
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
                    <Button type="submit">Lưu module</Button>
                </div>
            </form>
        </Form>
    );
}
