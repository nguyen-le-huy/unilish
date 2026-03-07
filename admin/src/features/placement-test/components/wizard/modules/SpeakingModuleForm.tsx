import { useForm, type Resolver } from 'react-hook-form';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SPEAKING_CRITERIA_OPTIONS } from '../../../constants';
import type { IModuleSpeaking } from '../../../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const speakingSchema = z.object({
    name: z.string().min(1, 'Bắt buộc'),
    totalMinutes: z.coerce.number().min(1),
    silenceThresholdSeconds: z.coerce.number().min(1).default(5),
    criteria: z.array(z.string()).min(1),
    warmupMinutes: z.coerce.number().min(0).default(2),
    part1Minutes: z.coerce.number().min(1).default(4),
    part2Minutes: z.coerce.number().min(1).default(4),
    part2PrepSeconds: z.coerce.number().min(0).default(60),
    part1TopicsText: z.string().default(''),
    part2CueCardsText: z.string().default(''),
});

type SpeakingFormValues = z.infer<typeof speakingSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    defaultValues?: Partial<IModuleSpeaking>;
    order: number;
    onSave: (data: IModuleSpeaking) => void;
    onCancel: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SpeakingModuleForm({ defaultValues, order, onSave, onCancel }: Props) {
    const toMultilineText = (items?: string[]) => (items ?? []).join('\n');
    const toStringList = (raw: string) =>
        raw
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean);

    const mergedCueCards = [
        ...(defaultValues?.parts?.part2?.cueCards?.filter((item) => item.level === 'low').map((item) => item.text) ?? []),
        ...(defaultValues?.parts?.part2?.cueCards?.filter((item) => item.level === 'mid').map((item) => item.text) ?? []),
        ...(defaultValues?.parts?.part2?.cueCards?.filter((item) => item.level === 'high').map((item) => item.text) ?? []),
    ];
    const uniqueCueCards = Array.from(new Set(mergedCueCards.map((item) => item.trim()).filter(Boolean)));

    const form = useForm<SpeakingFormValues>({
        resolver: zodResolver(speakingSchema) as Resolver<SpeakingFormValues>,
        defaultValues: {
            name: defaultValues?.name ?? 'Speaking Test',
            totalMinutes: defaultValues?.totalMinutes ?? 15,
            silenceThresholdSeconds: defaultValues?.silenceThresholdSeconds ?? 5,
            criteria: defaultValues?.criteria ?? ['fluency', 'lexical', 'grammar', 'pronunciation'],
            warmupMinutes: defaultValues?.parts?.warmupMinutes ?? 2,
            part1Minutes: defaultValues?.parts?.part1?.minutes ?? 4,
            part2Minutes: defaultValues?.parts?.part2?.minutes ?? 4,
            part2PrepSeconds: defaultValues?.parts?.part2?.prepSeconds ?? 60,
            part1TopicsText: toMultilineText(defaultValues?.parts?.part1?.topics),
            part2CueCardsText: toMultilineText(uniqueCueCards),
        },
    });

    function onSubmit(values: SpeakingFormValues) {
        const part1Topics = toStringList(values.part1TopicsText);
        const cueCards = toStringList(values.part2CueCardsText).map((text) => ({ level: 'mid' as const, text }));

        onSave({
            order,
            type: 'speaking',
            name: values.name,
            totalMinutes: values.totalMinutes,
            conversationModel: defaultValues?.conversationModel ?? 'gpt-4.1-mini',
            ttsModel: defaultValues?.ttsModel ?? 'tts-1',
            ttsVoice: defaultValues?.ttsVoice ?? 'alloy',
            gradingModel: defaultValues?.gradingModel ?? 'gpt-5-mini',
            speechAnalytics: defaultValues?.speechAnalytics ?? 'azure-ai-speech',
            silenceThresholdSeconds: values.silenceThresholdSeconds,
            criteria: values.criteria,
            parts: {
                warmupMinutes: values.warmupMinutes,
                part1: { minutes: values.part1Minutes, questionsRange: [4, 6], topics: part1Topics },
                part2: {
                    minutes: values.part2Minutes,
                    prepSeconds: values.part2PrepSeconds,
                    cueCards,
                },
                part3: {
                    minutes: defaultValues?.parts?.part3?.minutes ?? 5,
                    questionsRange: defaultValues?.parts?.part3?.questionsRange ?? [3, 5],
                },
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

                    <FormField control={form.control} name="totalMinutes" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tổng thời gian (phút)</FormLabel>
                            <FormControl><Input type="number" min={1} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="silenceThresholdSeconds" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Im lặng tối đa (giây)</FormLabel>
                            <FormControl><Input type="number" min={1} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                </div>

                {/* Criteria */}
                <FormField control={form.control} name="criteria" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Tiêu chí chấm</FormLabel>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {SPEAKING_CRITERIA_OPTIONS.map((opt) => {
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

                <div className="space-y-3">
                    <p className="text-sm font-medium">Câu hỏi thủ công — Speaking</p>
                    <p className="text-xs text-muted-foreground">
                        Mỗi dòng là 1 câu hỏi/chủ đề dùng chung. Có thể để trống để hệ thống sinh tự động.
                    </p>

                    <FormField control={form.control} name="part1TopicsText" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Part 1 — Chủ đề/Câu hỏi</FormLabel>
                            <FormControl>
                                <Textarea rows={4} placeholder="Do you work or are you a student?" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="part2CueCardsText" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Part 2 Cue Cards (One for all)</FormLabel>
                            <FormControl>
                                <Textarea rows={6} placeholder="Describe your favorite place in your city." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <Separator />

                {/* Part timing */}
                <div>
                    <p className="text-sm font-medium mb-3">Cấu hình Parts</p>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {[
                            { key: 'warmupMinutes' as const, label: 'Warm-up (phút)' },
                            { key: 'part1Minutes' as const, label: 'Part 1 (phút)' },
                            { key: 'part2Minutes' as const, label: 'Part 2 (phút)' },
                        ].map(({ key, label }) => (
                            <FormField key={key} control={form.control} name={key} render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">{label}</FormLabel>
                                    <FormControl><Input type="number" min={0} className="h-8" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        ))}
                    </div>
                    <div className="mt-3 max-w-xs">
                        <FormField control={form.control} name="part2PrepSeconds" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Part 2 — Chuẩn bị (giây)</FormLabel>
                                <FormControl><Input type="number" min={0} className="h-8" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
                    <Button type="submit">Lưu module</Button>
                </div>
            </form>
        </Form>
    );
}
