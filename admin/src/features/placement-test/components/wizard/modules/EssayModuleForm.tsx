import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AI_MODELS, ESSAY_CRITERIA_OPTIONS } from '../../../constants';
import type { IModuleEssay } from '../../../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const essaySchema = z.object({
    name: z.string().min(1, 'Bắt buộc'),
    timeLimitMinutes: z.coerce.number().min(1),
    aiModel: z.string().min(1),
    criteria: z.array(z.string()).min(1, 'Chọn ít nhất 1 tiêu chí'),
    wordLimitLow: z.coerce.number().min(1).default(150),
    wordLimitMid: z.coerce.number().min(1).default(250),
    wordLimitHigh: z.coerce.number().min(1).default(350),
    disablePaste: z.boolean().default(true),
    disableSpellcheck: z.boolean().default(false),
    topicsLowText: z.string().default(''),
    topicsMidText: z.string().default(''),
    topicsHighText: z.string().default(''),
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
    const toMultilineText = (items?: string[]) => (items ?? []).join('\n');
    const toStringList = (raw: string) =>
        raw
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);

    const form = useForm<EssayFormValues>({
        resolver: zodResolver(essaySchema),
        defaultValues: {
            name: defaultValues?.name ?? 'Writing Task',
            timeLimitMinutes: defaultValues?.timeLimitMinutes ?? 60,
            aiModel: defaultValues?.aiModel ?? 'gpt-4o-mini',
            criteria: defaultValues?.criteria ?? ['TR', 'CC', 'LR', 'GRA'],
            wordLimitLow: defaultValues?.wordLimits?.low ?? 150,
            wordLimitMid: defaultValues?.wordLimits?.mid ?? 250,
            wordLimitHigh: defaultValues?.wordLimits?.high ?? 350,
            disablePaste: defaultValues?.secureMode?.disablePaste ?? true,
            disableSpellcheck: defaultValues?.secureMode?.disableSpellcheck ?? false,
            topicsLowText: toMultilineText(defaultValues?.topicsByLevel?.low),
            topicsMidText: toMultilineText(defaultValues?.topicsByLevel?.mid),
            topicsHighText: toMultilineText(defaultValues?.topicsByLevel?.high),
        },
    });

    function onSubmit(values: EssayFormValues) {
        const topicsLow = toStringList(values.topicsLowText);
        const topicsMid = toStringList(values.topicsMidText);
        const topicsHigh = toStringList(values.topicsHighText);

        onSave({
            order,
            type: 'essay',
            promptSource: topicsLow.length || topicsMid.length || topicsHigh.length ? 'library' : 'ai_generated',
            topicsByLevel: {
                low: topicsLow,
                mid: topicsMid,
                high: topicsHigh,
            },
            name: values.name,
            timeLimitMinutes: values.timeLimitMinutes,
            aiModel: values.aiModel,
            criteria: values.criteria,
            wordLimits: {
                low: values.wordLimitLow,
                mid: values.wordLimitMid,
                high: values.wordLimitHigh,
            },
            secureMode: {
                disablePaste: values.disablePaste,
                disableSpellcheck: values.disableSpellcheck,
            },
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

                    <FormField control={form.control} name="aiModel" render={({ field }) => (
                        <FormItem>
                            <FormLabel>AI Model chấm điểm</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {AI_MODELS.map((m) => (
                                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                {/* Criteria */}
                <FormField control={form.control} name="criteria" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tiêu chí chấm</FormLabel>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {ESSAY_CRITERIA_OPTIONS.map((opt) => {
                                const selected = field.value.includes(opt.value);
                                return (
                                    <Badge
                                        key={opt.value}
                                        variant={selected ? 'default' : 'outline'}
                                        className="cursor-pointer select-none"
                                        onClick={() => {
                                            field.onChange(
                                                selected
                                                    ? field.value.filter((v: string) => v !== opt.value)
                                                    : [...field.value, opt.value],
                                            );
                                        }}
                                    >
                                        {opt.label}
                                    </Badge>
                                );
                            })}
                        </div>
                        <FormMessage />
                    </FormItem>
                )} />

                <Separator />

                {/* Word limits */}
                <div>
                    <p className="text-sm font-medium mb-3">Giới hạn từ theo trình độ</p>
                    <div className="grid grid-cols-3 gap-3">
                        {(['wordLimitLow', 'wordLimitMid', 'wordLimitHigh'] as const).map((key) => (
                            <FormField key={key} control={form.control} name={key} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">
                                        {key === 'wordLimitLow' ? 'A1–A2' : key === 'wordLimitMid' ? 'B1–B2' : 'C1–C2'}
                                    </FormLabel>
                                    <FormControl><Input type="number" min={1} className="h-8" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <p className="text-sm font-medium">Đề bài thủ công theo trình độ</p>
                    <p className="text-xs text-muted-foreground">
                        Mỗi dòng là 1 đề bài Writing Task 2. Để trống nếu muốn hệ thống sinh đề bằng AI.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <FormField control={form.control} name="topicsLowText" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">A1–A2 (Low)</FormLabel>
                                <FormControl>
                                    <Textarea rows={5} placeholder="Do you prefer living in a city or the countryside?" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="topicsMidText" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">B1–B2 (Mid)</FormLabel>
                                <FormControl>
                                    <Textarea rows={5} placeholder="Some people think social media is harmful. Do you agree?" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="topicsHighText" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">C1–C2 (High)</FormLabel>
                                <FormControl>
                                    <Textarea rows={5} placeholder="To what extent does globalization threaten cultural identity?" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                <Separator />

                {/* Secure mode */}
                <div className="flex gap-6">
                    {(['disablePaste', 'disableSpellcheck'] as const).map((key) => (
                        <FormField key={key} control={form.control} name={key} render={({ field }) => (
                            <FormItem className="flex items-center gap-2">
                                <FormControl>
                                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                                <FormLabel className="!mt-0 text-xs">
                                    {key === 'disablePaste' ? 'Tắt dán văn bản' : 'Tắt spellcheck'}
                                </FormLabel>
                            </FormItem>
                        )} />
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
