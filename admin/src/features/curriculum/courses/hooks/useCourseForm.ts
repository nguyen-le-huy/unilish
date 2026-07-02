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
    orderIndex: z.coerce.number().int().min(1),
    prerequisiteCourseId: z.string().optional().nullable(),
    finalExamConfig: z.object({
        durationMinutes: z.coerce.number().int().min(1),
        passScore: z.coerce.number().min(0).max(100),
        structureMatrix: z.object({
            vocabCount: z.coerce.number().int().min(0).default(0),
            grammarCount: z.coerce.number().int().min(0).default(0),
            readingTaskCount: z.coerce.number().int().min(0).default(0),
            listeningTaskCount: z.coerce.number().int().min(0).default(0),
            writingTaskCount: z.coerce.number().int().min(0).default(0),
            speakingTaskCount: z.coerce.number().int().min(0).default(0),
        }),
    }),
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
            orderIndex: 1,
            prerequisiteCourseId: null,
            finalExamConfig: {
                durationMinutes: 60,
                passScore: 65,
                structureMatrix: {
                    vocabCount: 0,
                    grammarCount: 0,
                    readingTaskCount: 0,
                    listeningTaskCount: 0,
                    writingTaskCount: 0,
                    speakingTaskCount: 0,
                },
            },
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
                orderIndex: course.orderIndex,
                prerequisiteCourseId: course.prerequisiteCourseId ?? null,
                finalExamConfig: {
                    durationMinutes: course.finalExamConfig.durationMinutes,
                    passScore: course.finalExamConfig.passScore,
                    structureMatrix: {
                        vocabCount: course.finalExamConfig.structureMatrix.vocabCount ?? 0,
                        grammarCount: course.finalExamConfig.structureMatrix.grammarCount ?? 0,
                        readingTaskCount: course.finalExamConfig.structureMatrix.readingTaskCount ?? 0,
                        listeningTaskCount: course.finalExamConfig.structureMatrix.listeningTaskCount ?? 0,
                        writingTaskCount: course.finalExamConfig.structureMatrix.writingTaskCount ?? 0,
                        speakingTaskCount: course.finalExamConfig.structureMatrix.speakingTaskCount ?? 0,
                    },
                },
            });
        }
    }, [course, form]);

    return form;
};
