import { useForm } from 'react-hook-form';
import type { Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
import type { Unit } from '../types/course.types';

// ─── Zod schema ───────────────────────────────────────────────────────────────

export const unitFormSchema = z.object({
    title: z.string().min(2, 'Tiêu đề phải có ít nhất 2 ký tự').max(200),
    description: z.string().max(500).optional().nullable(),
    contextSeed: z.object({
        scenario: z.string().max(500).optional(),
        keywords: z.array(z.string().min(1)),
        culturalNotes: z.string().max(1000).optional(),
    }),
});

export type UnitFormValues = z.infer<typeof unitFormSchema>;

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseUnitFormOptions {
    unit?: Unit | null;
}

export const useUnitForm = ({ unit }: UseUnitFormOptions = {}) => {
    const form = useForm<UnitFormValues, any, UnitFormValues>({
        resolver: zodResolver(unitFormSchema) as Resolver<UnitFormValues, any, UnitFormValues>,
        defaultValues: {
            title: '',
            description: '',
            contextSeed: {
                scenario: '',
                keywords: [],
                culturalNotes: '',
            },
        },
    });

    useEffect(() => {
        if (unit) {
            form.reset({
                title: unit.title,
                description: unit.description ?? '',
                contextSeed: {
                    scenario: unit.contextSeed.scenario ?? '',
                    keywords: unit.contextSeed.keywords ?? [],
                    culturalNotes: unit.contextSeed.culturalNotes ?? '',
                },
            });
        }
    }, [unit, form]);

    return form;
};
