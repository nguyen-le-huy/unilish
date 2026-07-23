import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import type { Course } from '../types/course.types';
import { CEFR_LEVELS } from '../types/course.types';

// ─── Zod schema (client-side, mirrors server validation) ─────────────────────

export const courseFormSchema = z.object({
    name: z.string().min(3, 'Tên phải có ít nhất 3 ký tự').max(200),
    slug: z
        .string()
        .min(2, 'Slug phải có ít nhất 2 ký tự')
        .max(100)
        .regex(/^[a-z0-9-]+$/, 'Slug chỉ được chứa chữ thường, số và dấu gạch ngang'),
    languageId: z.string().min(1, 'Vui lòng chọn ngôn ngữ'),
    learningGoalId: z.string().min(1, 'Vui lòng chọn mục tiêu học tập'),
    description: z.string().max(500).nullable().optional(),
    thumbnailUrl: z.string().url('URL không hợp lệ').nullable().optional(),
    level: z.enum([...CEFR_LEVELS] as [string, ...string[]]),
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseCourseFormOptions {
    course?: Course | null;
}

export const useCourseForm = ({ course }: UseCourseFormOptions = {}) => {
    const form = useForm<CourseFormValues, unknown, CourseFormValues>({
        resolver: zodResolver(courseFormSchema) as Resolver<CourseFormValues, unknown, CourseFormValues>,
        defaultValues: {
            name: '',
            slug: '',
            languageId: '',
            learningGoalId: '',
            description: null,
            thumbnailUrl: null,
            level: 'A1',
        },
    });

    // Populate form when course data arrives (edit mode)
    useEffect(() => {
        if (course) {
            form.reset({
                name: course.name,
                slug: course.slug,
                languageId: course.languageId,
                learningGoalId: course.learningGoalId,
                description: course.description ?? null,
                thumbnailUrl: course.thumbnailUrl ?? null,
                level: course.level,
            });
        }
    }, [course, form]);

    return form;
};
