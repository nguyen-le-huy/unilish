import { useEffect, useMemo, useRef } from 'react';
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
    const lastHydrationKeyRef = useRef<string>('');

    const normalizedLanguageCode = useMemo(() => {
        const rawLanguage = defaultValues?.language?.trim().toLowerCase();
        const rawLanguageId = defaultValues?.languageId;

        const directByCode = languages.find((lang) => lang.code.toLowerCase() === rawLanguage);
        if (directByCode) return directByCode.code;

        const byId = rawLanguageId ? languages.find((lang) => lang._id === rawLanguageId) : undefined;
        if (byId) return byId.code;

        const byName = rawLanguage
            ? languages.find(
                (lang) =>
                    lang.name.toLowerCase() === rawLanguage ||
                    lang.nativeName.toLowerCase() === rawLanguage,
            )
            : undefined;
        return byName?.code ?? '';
    }, [defaultValues?.language, defaultValues?.languageId, languages]);

    const hydratedValues = useMemo(() => {
        const matchedLanguage = languages.find((lang) => lang.code === normalizedLanguageCode);
        return {
            language: normalizedLanguageCode,
            languageId: matchedLanguage?._id ?? defaultValues?.languageId ?? '',
        };
    }, [
        languages,
        normalizedLanguageCode,
        defaultValues?.languageId,
    ]);

    const hydrationKey = useMemo(
        () => JSON.stringify(hydratedValues),
        [hydratedValues],
    );

    useEffect(() => {
        if (!defaultValues) return;
        if (lastHydrationKeyRef.current === hydrationKey) return;

        lastHydrationKeyRef.current = hydrationKey;
        form.reset(hydratedValues);
    }, [defaultValues, form, hydratedValues, hydrationKey]);

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
                                            <SelectValue
                                                placeholder={isLoadingLanguages ? 'Đang tải ngôn ngữ…' : 'Chọn ngôn ngữ…'}
                                            />
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
