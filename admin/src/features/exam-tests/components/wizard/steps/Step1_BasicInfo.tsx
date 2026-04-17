import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLanguages } from '@/features/curriculum/languages';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { ExamFormat, ICreateExamTestPayload } from '../../../types';
import { EXAM_FORMAT_BADGE_CLASSES, EXAM_FORMAT_LABELS } from '../../../constants';

const step1Schema = z.object({
    format: z.enum(['toeic_lr', 'ielts']),
    name: z.string().min(3, 'Tối thiểu 3 ký tự'),
    languageId: z.string().min(1, 'Vui lòng chọn ngôn ngữ'),
    language: z.string().min(1, 'Vui lòng chọn ngôn ngữ'),
    description: z.string().optional(),
});

type Step1FormValues = z.infer<typeof step1Schema>;

interface Props {
    defaultValues: Partial<ICreateExamTestPayload>;
    onDone: (data: Partial<ICreateExamTestPayload>) => void;
    presetFormat?: ExamFormat;
    hideFormatPicker?: boolean;
}

const formatCards: Array<{ value: ExamFormat; subtitle: string }> = [
    { value: 'toeic_lr', subtitle: 'Listening + Reading theo cấu trúc TOEIC' },
    { value: 'ielts', subtitle: 'Listening, Reading, Writing, Speaking' },
];

export function Step1_BasicInfo({
    defaultValues,
    onDone,
    presetFormat,
    hideFormatPicker = false,
}: Props) {
    const { data: languages = [], isLoading } = useLanguages();

    const form = useForm<Step1FormValues>({
        resolver: zodResolver(step1Schema),
        defaultValues: {
            format: presetFormat ?? defaultValues.format ?? 'toeic_lr',
            name: defaultValues.name ?? '',
            languageId: defaultValues.languageId ?? '',
            language: defaultValues.language ?? '',
            description: defaultValues.description ?? '',
        },
    });

    useEffect(() => {
        if (!defaultValues.languageId && !defaultValues.language) {
            return;
        }

        form.setValue('languageId', defaultValues.languageId ?? '');
        form.setValue('language', defaultValues.language ?? '');
    }, [defaultValues.language, defaultValues.languageId, form]);

    const handleSubmit = (values: Step1FormValues) => {
        onDone(values);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {!hideFormatPicker && (
                    <FormField
                        control={form.control}
                        name="format"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Định dạng bài thi</FormLabel>
                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                    {formatCards.map((formatItem) => (
                                        <button
                                            key={formatItem.value}
                                            type="button"
                                            onClick={() => field.onChange(formatItem.value)}
                                            className={cn(
                                                'rounded-lg border p-4 text-left transition-colors',
                                                field.value === formatItem.value
                                                    ? 'border-primary bg-primary/5'
                                                    : 'border-border hover:bg-muted/30',
                                            )}
                                        >
                                            <p
                                                className={cn(
                                                    'inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold',
                                                    EXAM_FORMAT_BADGE_CLASSES[formatItem.value],
                                                )}
                                            >
                                                {EXAM_FORMAT_LABELS[formatItem.value]}
                                            </p>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {formatItem.subtitle}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tên đề thi</FormLabel>
                            <FormControl>
                                <Input placeholder="Ví dụ: TOEIC L&R Mock Test #1" {...field} />
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
                            <FormLabel>Ngôn ngữ</FormLabel>
                            <Select
                                value={field.value}
                                disabled={isLoading}
                                onValueChange={(value) => {
                                    const selected = languages.find((item) => item._id === value);
                                    field.onChange(value);
                                    form.setValue('language', selected?.name ?? '');
                                }}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn ngôn ngữ" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {languages.map((language) => (
                                        <SelectItem key={language._id} value={language._id}>
                                            {language.nativeName} ({language.name})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mô tả</FormLabel>
                            <FormControl>
                                <Textarea
                                    placeholder="Mô tả ngắn về đề thi (không bắt buộc)"
                                    rows={4}
                                    {...field}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end">
                    <Button type="submit">Tiếp theo</Button>
                </div>
            </form>
        </Form>
    );
}
