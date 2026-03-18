import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loading } from '@/components/common/Loading';
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
import { Button } from '@/components/ui/button';
import { useLanguages } from '@/features/curriculum/languages/hooks/useLanguages';
import type { ICreatePlacementTestPayload } from '../../types';

// ─── Schema ───────────────────────────────────────────────────────────────────

const step1Schema = z.object({
    language: z.string().min(2, 'Chọn ngôn ngữ'),
    languageId: z.string().min(1, 'languageId là bắt buộc'),
});

type Step1FormValues = z.infer<typeof step1Schema>;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    defaultValues?: Partial<ICreatePlacementTestPayload>;
    onNext: (data: Partial<ICreatePlacementTestPayload>) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step1GeneralInfo({ defaultValues, onNext }: Props) {
    const { data: languages = [], isLoading: isLoadingLanguages } = useLanguages();

    const form = useForm<Step1FormValues>({
        resolver: zodResolver(step1Schema),
        defaultValues: {
            language: defaultValues?.language ?? '',
            languageId: defaultValues?.languageId ?? '',
        },
    });

    // Hydrate form when languages are loaded OR when defaultValues change (edit mode async load)
    useEffect(() => {
        if (!defaultValues?.language || languages.length === 0) return;

        const rawLanguage = defaultValues.language.trim().toLowerCase();
        const rawLanguageId = defaultValues.languageId;

        const matched =
            languages.find((l) => l.code.toLowerCase() === rawLanguage) ||
            (rawLanguageId ? languages.find((l) => l._id === rawLanguageId) : undefined) ||
            languages.find((l) => l.name.toLowerCase() === rawLanguage || l.nativeName.toLowerCase() === rawLanguage);

        form.reset({
            language: matched?.code ?? rawLanguage,
            languageId: matched?._id ?? rawLanguageId ?? '',
        });
    // form is stable (useForm ref); defaultValues identity may change when existingTest loads
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [languages, defaultValues?.language, defaultValues?.languageId]);

    function onSubmit(values: Step1FormValues) {
        onNext({
            language: values.language,
            languageId: values.languageId,
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 gap-5">
                    {/* Language */}
                    <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ngôn ngữ <span className="text-destructive">*</span></FormLabel>
                                {isLoadingLanguages && <Loading size="sm" className="justify-start" />}
                                <Select
                                    onValueChange={(value) => {
                                        const selectedLanguage = languages.find((lang) => lang.code === value);
                                        field.onChange(value);
                                        form.setValue('languageId', selectedLanguage?._id ?? '');
                                    }}
                                    value={field.value}
                                    disabled={isLoadingLanguages}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn ngôn ngữ…" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {languages.map((lang) => (
                                            <SelectItem key={lang._id} value={lang.code}>
                                                {lang.nativeName} ({lang.name})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="flex justify-end">
                    <Button type="submit">Vào soạn đề →</Button>
                </div>
            </form>
        </Form>
    );
}
