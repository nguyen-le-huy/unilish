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
    level: z.enum([...CEFR_LEVELS] as [string, ...string[]]),
    orderInSeries: z.coerce.number().int().min(1),
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
    const form = useForm<CourseFormValues, any, CourseFormValues>({
        resolver: zodResolver(courseFormSchema) as Resolver<CourseFormValues, any, CourseFormValues>,
        defaultValues: {
            name: '',
            level: 'A1',
            orderInSeries: 1,
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
                level: course.level,
                orderInSeries: course.orderInSeries,
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
