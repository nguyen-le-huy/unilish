import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateLanguage, useUpdateLanguage, useUploadFlagIcon } from './useLanguageMutations';
import type { Language } from '../types/language.types';

// ─── Zod Schema ──────────────────────────────────────────────────────────────

export const languageFormSchema = z.object({
    code: z
        .string()
        .min(2, 'Tối thiểu 2 ký tự')
        .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, 'Format hợp lệ: "en" hoặc "en-US"'),
    name: z.string().min(2, 'Tối thiểu 2 ký tự'),
    nativeName: z.string().min(2, 'Tối thiểu 2 ký tự'),
    flagIconUrl: z.union([z.string().url('URL không hợp lệ'), z.literal(''), z.undefined()]),
    isActive: z.boolean(),
    ttsConfig: z.object({
        provider: z.enum(['OPENAI', 'AZURE', 'ELEVENLABS']),
        voiceId: z.string().min(1, 'Voice ID là bắt buộc'),
        style: z.string().optional(),
        speed: z
            .number()
            .min(0.8, 'Tối thiểu 0.8x')
            .max(1.2, 'Tối đa 1.2x'),
    }),
    // Transient field — holds the File object before upload, not sent to API
    _flagFile: z.custom<File>().optional(),
});

export type LanguageFormValues = z.infer<typeof languageFormSchema>;

// ─── Default Values ───────────────────────────────────────────────────────────

const DEFAULT_VALUES: LanguageFormValues = {
    code: 'en-US',
    name: '',
    nativeName: '',
    flagIconUrl: '',
    isActive: true,
    ttsConfig: {
        provider: 'OPENAI',
        voiceId: 'alloy',
        style: '',
        speed: 1,
    },
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
            flagIconUrl: languageDetail.flagIconUrl ?? '',
            isActive: languageDetail.isActive,
            ttsConfig: {
                provider: languageDetail.ttsConfig.provider,
                voiceId: languageDetail.ttsConfig.voiceId ?? '',
                style: languageDetail.ttsConfig.style ?? '',
                speed: languageDetail.ttsConfig.speed,
            },
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

        const ttsConfig = {
            provider: values.ttsConfig.provider,
            voiceId: values.ttsConfig.voiceId.trim(),
            style: values.ttsConfig.style?.trim() || undefined,
            speed: values.ttsConfig.speed,
        };

        if (isCreateMode) {
            await createMutation.mutateAsync({
                code: values.code,
                name: values.name.trim(),
                nativeName: values.nativeName.trim(),
                flagIconUrl: resolvedFlagIconUrl,
                ttsConfig,
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
                flagIconUrl: resolvedFlagIconUrl ?? null,
                ttsConfig,
                isActive: values.isActive,
            },
        });
    };

    const isSubmitting =
        createMutation.isPending ||
        updateMutation.isPending ||
        uploadFlagMutation.isPending;

    return { form, onSubmit, isSubmitting, isCreateMode };
};
