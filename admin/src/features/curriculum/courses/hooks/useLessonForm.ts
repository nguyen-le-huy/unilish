import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import type { LessonSummary } from '../types/course.types';
import { LESSON_TYPES, PRACTICE_MODES } from '../types/course.types';

// ─── Zod schema ───────────────────────────────────────────────────────────────

export const lessonFormSchema = z.object({
    title: z.string().min(2, 'Tiêu đề phải có ít nhất 2 ký tự').max(200),
    type: z.enum([...LESSON_TYPES] as [string, ...string[]]),
    practiceConfig: z.object({
        mode: z.enum([...PRACTICE_MODES] as [string, ...string[]]),
        passingScore: z.coerce.number().min(0).max(100),
    }),
});

export type LessonFormValues = z.infer<typeof lessonFormSchema>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseLessonFormOptions {
    lesson?: LessonSummary | null;
}

export const useLessonForm = ({ lesson }: UseLessonFormOptions = {}) => {
    const form = useForm<LessonFormValues, unknown, LessonFormValues>({
        resolver: zodResolver(lessonFormSchema) as Resolver<LessonFormValues, unknown, LessonFormValues>,
        defaultValues: {
            title: '',
            type: 'VOCAB',
            practiceConfig: {
                mode: 'FIXED',
                passingScore: 80,
            },
        },
    });

    useEffect(() => {
        if (lesson) {
            form.reset({
                title: lesson.title,
                type: lesson.type,
                practiceConfig: {
                    mode: lesson.practiceConfig.mode,
                    passingScore: lesson.practiceConfig.passingScore,
                },
            });
        }
    }, [lesson, form]);

    return form;
};
