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
                    <div className="space-y-2">
                        <CardTitle className="text-lg">Gợi ý Tình huống (Hints)</CardTitle>
                        <CardDescription>
                            Gợi ý có cấu trúc để người dùng tham khảo khi "bí" từ. Nên có 4 gợi ý theo thứ tự:
                        </CardDescription>
                        <div className="space-y-1 text-xs text-muted-foreground pl-4">
                            <p>1. <span className="font-medium">Name + Background</span> → "Hi, I'm [Name]. I study at..."</p>
                            <p>2. <span className="font-medium">Current Role</span> → "I'm interning as a frontend developer..."</p>
                            <p>3. <span className="font-medium">Technical Skills</span> → "I mainly work with React / MERN stack..."</p>
                            <p>4. <span className="font-medium">Personality/Motivation</span> → "I'm excited to learn / contribute..."</p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {fields.length > 0 ? (
                        <div className="space-y-3">
                            {fields.map((field, index) => {
                                const hintLabels = ['Name + Background', 'Current Role', 'Technical Skills', 'Personality/Motivation'];
                                const viPlaceholders = [
                                    'Chào, tôi là [Tên]. Tôi học tại...',
                                    'Tôi đang thực tập với vị trí lập trình viên frontend...',
                                    'Tôi chủ yếu làm việc với React / MERN stack...',
                                    'Tôi rất hào hứng được học hỏi / đóng góp...'
                                ];
                                const enPlaceholders = [
                                    "Hi, I'm [Name]. I study at...",
                                    "I'm interning as a frontend developer...",
                                    "I mainly work with React / MERN stack...",
                                    "I'm excited to learn / contribute..."
                                ];
                                const structurePlaceholders = [
                                    "My name is _____. I'm from _____. I study at _____.",
                                    "I'm working as _____ at _____. / I'm currently studying _____.",
                                    "I mainly work with _____ and _____. / My tech stack includes _____.",
                                    "I'm excited to _____. / I'm passionate about _____."
                                ];
                                
                                return (
                                    <div key={field.id} className="group rounded-lg border bg-card p-4 transition-all hover:shadow-sm">
                                        <div className="mb-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                    {index + 1}
                                                </span>
                                                <span className="text-sm font-medium text-muted-foreground">
                                                    {hintLabels[index] || 'Extra Hint'}
                                                </span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <Label htmlFor={`hint-vi-${index}`} className="text-xs font-medium text-muted-foreground">
                                                        Tiếng Việt
                                                    </Label>
                                                    <Input
                                                        id={`hint-vi-${index}`}
                                                        {...register(`hints.${index}.vi` as const)}
                                                        placeholder={viPlaceholders[index] || 'Gợi ý thêm...'}
                                                        className={`h-9 text-xs ${errors.hints?.[index]?.vi ? 'border-destructive' : ''}`}
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <Label htmlFor={`hint-en-${index}`} className="text-xs font-medium text-muted-foreground">
                                                        Tiếng Anh
                                                    </Label>
                                                    <Input
                                                        id={`hint-en-${index}`}
                                                        {...register(`hints.${index}.en` as const)}
                                                        placeholder={enPlaceholders[index] || 'Extra hint...'}
                                                        className={`h-9 text-xs ${errors.hints?.[index]?.en ? 'border-destructive' : ''}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor={`hint-structure-${index}`} className="text-xs font-medium text-muted-foreground">
                                                    Cấu trúc câu mẫu (Sentence Pattern)
                                                </Label>
                                                <Input
                                                    id={`hint-structure-${index}`}
                                                    {...register(`hints.${index}.structure` as const)}
                                                    placeholder={structurePlaceholders[index] || 'Pattern: _____ + _____ + _____.'}
                                                    className={`h-9 font-mono text-xs ${errors.hints?.[index]?.structure ? 'border-destructive' : ''}`}
                                                />
                                                <p className="text-[10px] text-muted-foreground">
                                                    Dùng _____ để đánh dấu chỗ trống. VD: "My name is _____. I work at _____."
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                            <p className="text-sm">Chưa có gợi ý nào. Hãy thêm gợi ý theo cấu trúc 4 bước bên trên.</p>
                        </div>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed gap-2"
                        onClick={() => append({ vi: '', en: '', structure: '' })}
                    >
                        <Plus className="h-4 w-4" />
                        Thêm gợi ý
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
