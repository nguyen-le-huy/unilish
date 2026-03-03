import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DEFAULT_SKILL_WEIGHTS } from '../constants/skill.constants';
import type { LearningGoal } from '../types/learning-goal.types';
import { toSlug } from '../utils/goal.utils';

// Backward-compat: old DB records stored English keys – map them to Vietnamese on load
const LEGACY_SKILL_MAP: Record<string, string> = {
    spelling: 'Chính tả',
    punctuation: 'Dấu câu',
    formality: 'Trang trọng',
    pronunciation: 'Phát âm',
};
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
    systemPrompt: z.string().min(30, 'Prompt tối thiểu 30 ký tự'),
    ignoredSkills: z.array(z.string().min(1)),
    skillWeights: z
        .object({
            listening: z.number().min(0).max(1),
            speaking: z.number().min(0).max(1),
            reading: z.number().min(0).max(1),
            writing: z.number().min(0).max(1),
            grammar: z.number().min(0).max(1),
            vocabulary: z.number().min(0).max(1),
        })
        .refine((w) => Math.abs(Object.values(w).reduce((s, v) => s + v, 0) - 1) <= 0.001, {
            message: 'Tổng trọng số phải bằng 100%',
        }),
    isActive: z.boolean(),
    _iconFile: z.custom<File>().optional(),
});

export type GoalFormValues = z.infer<typeof goalFormSchema>;

interface UseGoalFormOptions {
    isCreateMode: boolean;
    goalDetail?: LearningGoal;
}

export const useGoalForm = ({ isCreateMode, goalDetail }: UseGoalFormOptions) => {
    const form = useForm<GoalFormValues, any, GoalFormValues>({
        resolver: zodResolver(goalFormSchema) as Resolver<GoalFormValues, any, GoalFormValues>,
        defaultValues: {
            slug: '',
            title: '',
            iconUrl: '',
            description: '',
            targetAudience: '',
            supportedLanguages: [],
            systemPrompt: '',
            ignoredSkills: [],
            skillWeights: DEFAULT_SKILL_WEIGHTS,
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
            systemPrompt: goalDetail.systemPrompt,
            ignoredSkills: (goalDetail.ignoredSkills ?? []).map((s) => LEGACY_SKILL_MAP[s] ?? s).filter(Boolean),
            skillWeights: goalDetail.skillWeights,
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
