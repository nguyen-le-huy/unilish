import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    useCreateLanguage,
    useUpdateLanguage,
    useUploadFlagIcon,
    useUploadGreetingSound,
} from './useLanguageMutations';
import type { Language } from '../types/language.types';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

export const languageFormSchema = z.object({
    code: z
        .string()
        .min(2, 'Tối thiểu 2 ký tự')
        .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Format hợp lệ: "en" hoặc "en-US"'),
    name: z.string().min(2, 'Tối thiểu 2 ký tự'),
    nativeName: z.string().min(2, 'Tối thiểu 2 ký tự'),
    greeting: z.string().max(300, 'Tối đa 300 ký tự').optional(),
    greetingSound: z.union([z.string().url('URL không hợp lệ'), z.string().startsWith('/'), z.literal(''), z.undefined()]),
    flagIconUrl: z.union([z.string().url('URL không hợp lệ'), z.literal(''), z.undefined()]),
    isActive: z.boolean(),
    // Transient field — holds the File object before upload, not sent to API
    _flagFile: z.custom<File>().optional(),
    _greetingSoundFile: z.custom<File>().optional(),
});

export type LanguageFormValues = z.infer<typeof languageFormSchema>;

// ─── Default Values ───────────────────────────────────────────────────────────

const DEFAULT_VALUES: LanguageFormValues = {
    code: 'en-US',
    name: '',
    nativeName: '',
    greeting: '',
    greetingSound: '',
    flagIconUrl: '',
    isActive: true,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseLanguageFormOptions {
    code: string | undefined;
    languageDetail: Language | undefined;
}

export const useLanguageForm = ({ code, languageDetail }: UseLanguageFormOptions) => {
    const navigate = useNavigate();
    const isCreateMode = !code || code === 'new';

    const createMutation = useCreateLanguage();
    const updateMutation = useUpdateLanguage();
    const uploadFlagMutation = useUploadFlagIcon();
    const uploadGreetingSoundMutation = useUploadGreetingSound();

    const form = useForm<LanguageFormValues>({
        resolver: zodResolver(languageFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    // Sync remote data into the form when it arrives (edit mode)
    useEffect(() => {
        if (!languageDetail) return;

        form.reset({
            code: languageDetail.code,
            name: languageDetail.name,
            nativeName: languageDetail.nativeName,
            greeting: languageDetail.greeting ?? '',
            greetingSound: languageDetail.greetingSound ?? '',
            flagIconUrl: languageDetail.flagIconUrl ?? '',
            isActive: languageDetail.isActive,
        });
    }, [languageDetail, form]);

    const onSubmit = async (values: LanguageFormValues) => {
        // Upload flag if a new file was selected
        let resolvedFlagIconUrl = values.flagIconUrl?.trim() || undefined;

        if (values._flagFile) {
            const uploaded = await uploadFlagMutation.mutateAsync(values._flagFile);
            resolvedFlagIconUrl = uploaded.url;
            form.setValue('flagIconUrl', uploaded.url);
            form.setValue('_flagFile', undefined);
        }

        let resolvedGreetingSound = values.greetingSound?.trim() || undefined;
        if (values._greetingSoundFile) {
            const uploaded = await uploadGreetingSoundMutation.mutateAsync(values._greetingSoundFile);
            resolvedGreetingSound = uploaded.url;
            form.setValue('greetingSound', uploaded.url);
            form.setValue('_greetingSoundFile', undefined);
        }

        const resolvedGreeting = values.greeting?.trim() || undefined;

        if (isCreateMode) {
            await createMutation.mutateAsync({
                code: values.code,
                name: values.name.trim(),
                nativeName: values.nativeName.trim(),
                greeting: resolvedGreeting,
                greetingSound: resolvedGreetingSound,
                flagIconUrl: resolvedFlagIconUrl,
                isActive: values.isActive,
            });
            navigate('/curriculum/languages');
            return;
        }

        await updateMutation.mutateAsync({
            code: code as string,
            payload: {
                name: values.name.trim(),
                nativeName: values.nativeName.trim(),
                greeting: resolvedGreeting ?? null,
                greetingSound: resolvedGreetingSound ?? null,
                flagIconUrl: resolvedFlagIconUrl ?? null,
                isActive: values.isActive,
            },
        });
    };

    const isSubmitting =
        createMutation.isPending ||
        updateMutation.isPending ||
        uploadFlagMutation.isPending ||
        uploadGreetingSoundMutation.isPending;

    return { form, onSubmit, isSubmitting, isCreateMode };
};
