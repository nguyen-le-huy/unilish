import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { LearningGoal } from '../types/learning-goal.types';
import { toSlug } from '../utils/goal.utils';

export const goalFormSchema = z.object({
    slug: z
        .string()
        .min(3, 'Tối thiểu 3 ký tự')
        .regex(/^[a-z0-9-]+$/, 'Chỉ dùng chữ thường, số và dấu gạch ngang'),
    title: z.string().min(3, 'Tối thiểu 3 ký tự'),
    iconUrl: z.union([z.string().url('URL icon không hợp lệ'), z.literal(''), z.undefined()]),
    description: z.string(),
    targetAudience: z.string(),
    supportedLanguages: z.array(z.string()),
    isActive: z.boolean(),
    _iconFile: z.custom<File>().optional(),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

interface UseGoalFormOptions {
    isCreateMode: boolean;
    goalDetail?: LearningGoal;
}

export const useGoalForm = ({ isCreateMode, goalDetail }: UseGoalFormOptions) => {
    const form = useForm<GoalFormValues, unknown, GoalFormValues>({
        resolver: zodResolver(goalFormSchema) as Resolver<GoalFormValues, unknown, GoalFormValues>,
        defaultValues: {
            slug: '',
            title: '',
            iconUrl: '',
            description: '',
            targetAudience: '',
            supportedLanguages: [],
            isActive: true,
            _iconFile: undefined,
        },
    });

    // Sync form when goalDetail loads (edit mode)
    useEffect(() => {
        if (!goalDetail) return;

        form.reset({
            slug: goalDetail.slug,
            title: goalDetail.title,
            iconUrl: goalDetail.iconUrl ?? '',
            description: goalDetail.description ?? '',
            targetAudience: goalDetail.targetAudience ?? '',
            supportedLanguages: goalDetail.supportedLanguages ?? [],
            isActive: goalDetail.isActive,
            _iconFile: undefined,
        });
    }, [goalDetail, form]);

    // Auto-generate slug from title in create mode
    const handleTitleChange = (value: string) => {
        form.setValue('title', value);
        if (isCreateMode) {
            form.setValue('slug', toSlug(value), { shouldValidate: true });
        }
    };

    return { form, handleTitleChange };
};
