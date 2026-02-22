import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { CourseSeries } from '../types/course-series.types';

// ─── Client-side mirror of server validation ─────────────────────────────────

const courseSeriesFormSchema = z.object({
    slug: z
        .string()
        .min(3, 'Slug phải có ít nhất 3 ký tự')
        .max(64, 'Slug không được vượt quá 64 ký tự')
        .regex(/^[a-z0-9-]+$/, 'Chỉ dùng chữ thường, số và dấu gạch ngang'),
    title: z
        .string()
        .min(3, 'Tiêu đề phải có ít nhất 3 ký tự')
        .max(120, 'Tiêu đề không được vượt quá 120 ký tự'),
    description: z.string().max(500, 'Mô tả không được vượt quá 500 ký tự').optional(),
    thumbnailUrl: z
        .string()
        .url('URL thumbnail không hợp lệ')
        .optional()
        .or(z.literal('')),
    languageId: z.string().min(1, 'Vui lòng chọn ngôn ngữ'),
    learningGoalId: z.string().min(1, 'Vui lòng chọn mục tiêu học tập'),
    isActive: z.boolean(),
});

export type SeriesFormValues = z.infer<typeof courseSeriesFormSchema>;

// ─── Default values ───────────────────────────────────────────────────────────

const DEFAULT_VALUES: SeriesFormValues = {
    slug: '',
    title: '',
    description: '',
    thumbnailUrl: '',
    languageId: '',
    learningGoalId: '',
    isActive: true,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseSeriesFormOptions {
    /** Pass the loaded series to pre-fill the form in edit mode. */
    series?: CourseSeries | null;
}

export const useSeriesForm = ({ series }: UseSeriesFormOptions = {}) => {
    const form = useForm<SeriesFormValues>({
        resolver: zodResolver(courseSeriesFormSchema),
        defaultValues: DEFAULT_VALUES,
    });

    // Populate form once the series data lands (edit mode)
    useEffect(() => {
        if (!series) return;

        const languageId =
            typeof series.languageId === 'string'
                ? series.languageId
                : series.languageId._id;

        const learningGoalId =
            typeof series.learningGoalId === 'string'
                ? series.learningGoalId
                : series.learningGoalId._id;

        form.reset({
            slug: series.slug,
            title: series.title,
            description: series.description ?? '',
            thumbnailUrl: series.thumbnailUrl ?? '',
            languageId,
            learningGoalId,
            isActive: series.isActive,
        });
    }, [series, form]);

    return form;
};
