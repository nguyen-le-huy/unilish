import { memo, useCallback } from 'react';
import { Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUpdateUnit } from '../../hooks/useUnitMutations';
import { useUnitForm } from '../../hooks/useUnitForm';
import type { Unit, UpdateUnitPayload } from '../../types/course.types';
import { ContextSeedCard } from './ContextSeedCard';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    unit: Unit;
    courseId: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const UnitEditor = memo(function UnitEditor({ unit, courseId }: Props) {
    const updateMutation = useUpdateUnit(courseId);
    const form = useUnitForm({ unit });

    // Keyword helpers (useFieldArray alternative — simpler for flat arrays)
    const keywords = form.watch('contextSeed.keywords') ?? [];

    const addKeyword = useCallback(
        (kw: string) => {
            if (!keywords.includes(kw)) {
                form.setValue('contextSeed.keywords', [...keywords, kw], { shouldDirty: true });
            }
        },
        [form, keywords],
    );

    const removeKeyword = useCallback(
        (index: number) => {
            form.setValue(
                'contextSeed.keywords',
                keywords.filter((_, i) => i !== index),
                { shouldDirty: true },
            );
        },
        [form, keywords],
    );

    const onSubmit = form.handleSubmit((values) => {
        const payload: UpdateUnitPayload = {
            title: values.title,
            description: values.description ?? null,
            contextSeed: {
                scenario: values.contextSeed.scenario,
                keywords: values.contextSeed.keywords,
                culturalNotes: values.contextSeed.culturalNotes,
            },
        };
        updateMutation.mutate({ id: unit._id, payload });
    });

    return (
        <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Cài đặt chương</h2>
                <Button size="sm" onClick={onSubmit} disabled={updateMutation.isPending}>
                    <Save className="mr-2 h-4 w-4" aria-hidden="true" />
                    {updateMutation.isPending ? 'Đang lưu...' : 'Lưu'}
                </Button>
            </div>

            <Form {...form}>
                <form onSubmit={onSubmit} className="space-y-4">
                    {/* Basic Info */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Thông tin cơ bản</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tên chương</FormLabel>
                                        <FormControl>
                                            <Input placeholder="VD: Lời chào & Giới thiệu" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mô tả</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Mô tả ngắn về chương này..."
                                                rows={2}
                                                {...field}
                                                value={field.value ?? ''}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* Context Seed */}
                    <ContextSeedCard
                        control={form.control}
                        keywords={keywords}
                        onAddKeyword={addKeyword}
                        onRemoveKeyword={removeKeyword}
                    />
                </form>
            </Form>
        </div>
    );
});
