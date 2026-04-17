import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Switch } from '@/components/ui/switch';
import type { ICreateExamTestPayload, IExamTestSettings } from '../../../types';

const step4Schema = z.object({
    allowRetake: z.boolean(),
    retakeCooldownDays: z.number().int().min(0, 'Tối thiểu 0 ngày'),
});

type Step4FormValues = z.infer<typeof step4Schema>;

export interface Step4SubmitData {
    settings: IExamTestSettings;
    autoPublish: boolean;
}

interface Props {
    defaultValues: Partial<ICreateExamTestPayload>;
    onDone: (data: Step4SubmitData) => void;
    onBack: () => void;
    isPending?: boolean;
}

export function Step4_Settings({ defaultValues, onDone, onBack, isPending = false }: Props) {
    const [mode, setMode] = useState<'draft' | 'publish'>('draft');

    const form = useForm<Step4FormValues>({
        resolver: zodResolver(step4Schema),
        defaultValues: {
            allowRetake: defaultValues.settings?.allowRetake ?? false,
            retakeCooldownDays: defaultValues.settings?.retakeCooldownDays ?? 0,
        },
    });

    const allowRetake = useWatch({
        control: form.control,
        name: 'allowRetake',
    });

    const submitByMode = (nextMode: 'draft' | 'publish') => {
        setMode(nextMode);
        void form.handleSubmit((values) => {
            const timeLimitOverrideMinutes = defaultValues.settings?.timeLimitOverrideMinutes;
            onDone({
                settings: {
                    allowRetake: values.allowRetake,
                    retakeCooldownDays: values.allowRetake ? values.retakeCooldownDays : 0,
                    ...(typeof timeLimitOverrideMinutes === 'number'
                        ? { timeLimitOverrideMinutes }
                        : {}),
                },
                autoPublish: nextMode === 'publish',
            });
        })();
    };

    return (
        <Form {...form}>
            <form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
                <FormField
                    control={form.control}
                    name="allowRetake"
                    render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                                <FormLabel>Cho phép làm lại</FormLabel>
                                <p className="text-xs text-muted-foreground">
                                    Người học có thể làm lại sau thời gian chờ.
                                </p>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {allowRetake && (
                    <FormField
                        control={form.control}
                        name="retakeCooldownDays"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Thời gian chờ (ngày)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={field.value}
                                        onChange={(event) =>
                                            field.onChange(Number(event.target.value) || 0)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <div className="flex justify-between gap-2">
                    <Button type="button" variant="outline" onClick={onBack}>
                        ← Quay lại
                    </Button>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => submitByMode('draft')}
                        >
                            {isPending && mode === 'draft' ? 'Đang lưu...' : 'Lưu nháp'}
                        </Button>
                        <Button
                            type="button"
                            disabled={isPending}
                            onClick={() => submitByMode('publish')}
                        >
                            {isPending && mode === 'publish' ? 'Đang xuất bản...' : 'Xuất bản ngay'}
                        </Button>
                    </div>
                </div>
            </form>
        </Form>
    );
}
