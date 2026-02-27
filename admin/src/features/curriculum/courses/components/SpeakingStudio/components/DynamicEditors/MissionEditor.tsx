import { useFormContext, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import type { SpeakingLessonFormValues } from '../../types/speaking.types';

export const MissionEditor = () => {
    const { register, control, formState: { errors } } = useFormContext<SpeakingLessonFormValues>();

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'hints',
    });

    return (
        <div className="mx-auto max-w-3xl space-y-6 pb-20">
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Chi tiết Nhiệm vụ</CardTitle>
                    <CardDescription>
                        Mô tả tình huống người dùng cần giải quyết trong cuộc hội thoại.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="missionTitle" className="text-sm font-medium">Tiêu đề Nhiệm vụ</Label>
                        <Input
                            id="missionTitle"
                            placeholder="Ví dụ: Báo mất hành lý tại sân bay"
                            {...register('missionTitle')}
                            className={errors.missionTitle ? 'border-destructive' : ''}
                        />
                        {errors.missionTitle && (
                            <p className="text-sm text-destructive">{errors.missionTitle.message}</p>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="missionDescription" className="text-sm font-medium">Mô tả Tình huống</Label>
                        <Textarea
                            id="missionDescription"
                            placeholder="Mô tả cụ thể nhiệm vụ. Ví dụ: Bạn không thấy vali màu xanh trên băng chuyền..."
                            rows={4}
                            {...register('missionDescription')}
                            className={errors.missionDescription ? 'border-destructive' : ''}
                        />
                        {errors.missionDescription && (
                            <p className="text-sm text-destructive">{errors.missionDescription.message}</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 text-left">
                    <div className="space-y-1">
                        <CardTitle className="text-lg">Gợi ý Tình huống (Hints)</CardTitle>
                        <CardDescription>
                            Các câu gợi ý mẫu để giúp người dùng khi họ "bí" từ.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {fields.length > 0 ? (
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b bg-muted/50 text-left text-muted-foreground">
                                        <th className="px-4 py-2 font-medium">Tiếng Việt</th>
                                        <th className="px-4 py-2 font-medium">Tiếng Anh</th>
                                        <th className="px-4 py-2 text-right font-medium">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fields.map((field, index) => (
                                        <tr key={field.id} className="border-b last:border-0 group">
                                            <td className="p-2 align-top w-[45%]">
                                                <Input
                                                    {...register(`hints.${index}.vi` as const)}
                                                    placeholder="Ví dụ: Tôi bị mất hành lý"
                                                    className={`h-9 bg-white ${errors.hints?.[index]?.vi ? 'border-destructive' : ''
                                                        }`}
                                                />
                                            </td>
                                            <td className="p-2 align-top w-[45%]">
                                                <Input
                                                    {...register(`hints.${index}.en` as const)}
                                                    placeholder="Ví dụ: I lost my luggage"
                                                    className={`h-9 bg-white ${errors.hints?.[index]?.en ? 'border-destructive' : ''
                                                        }`}
                                                />
                                            </td>
                                            <td className="p-2 align-middle text-right w-[10%]">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => remove(index)}
                                                    className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                            <p className="text-sm">Chưa có gợi ý nào. Hãy thêm gợi ý mới.</p>
                        </div>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed gap-2"
                        onClick={() => append({ vi: '', en: '' })}
                    >
                        <Plus className="h-4 w-4" />
                        Thêm gợi ý
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
