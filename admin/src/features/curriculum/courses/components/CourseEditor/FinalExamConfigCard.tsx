import type { Control } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import type { CourseFormValues } from '../../hooks/useCourseForm';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    control: Control<CourseFormValues>;
}

type MatrixKey =
    | 'finalExamConfig.structureMatrix.vocabCount'
    | 'finalExamConfig.structureMatrix.grammarCount'
    | 'finalExamConfig.structureMatrix.readingTaskCount'
    | 'finalExamConfig.structureMatrix.listeningTaskCount'
    | 'finalExamConfig.structureMatrix.speakingTaskCount'
    | 'finalExamConfig.structureMatrix.writingTaskCount';

// ─── Sub-component: Numeric Field ─────────────────────────────────────────────

function MatrixField({
    label,
    name,
    control,
}: {
    label: string;
    name: MatrixKey;
    control: Control<CourseFormValues>;
}) {
    return (
        <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            <Controller
                control={control}
                name={name}
                render={({ field }) => (
                    <Input
                        type="number"
                        min={0}
                        max={50}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="h-8 text-sm"
                    />
                )}
            />
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

const MATRIX_KEYS: { key: MatrixKey; label: string }[] = [
    { key: 'finalExamConfig.structureMatrix.vocabCount', label: 'Từ vựng' },
    { key: 'finalExamConfig.structureMatrix.grammarCount', label: 'Ngữ pháp' },
    { key: 'finalExamConfig.structureMatrix.readingTaskCount', label: 'Đọc hiểu' },
    { key: 'finalExamConfig.structureMatrix.listeningTaskCount', label: 'Nghe hiểu' },
    { key: 'finalExamConfig.structureMatrix.speakingTaskCount', label: 'Nói' },
    { key: 'finalExamConfig.structureMatrix.writingTaskCount', label: 'Viết' },
];

export function FinalExamConfigCard({ control }: Props) {
    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Cấu hình bài thi cuối khóa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Duration */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Thời gian (phút)</Label>
                    <Controller
                        control={control}
                        name="finalExamConfig.durationMinutes"
                        render={({ field }) => (
                            <div className="flex items-center gap-3">
                                <Slider
                                    min={10}
                                    max={180}
                                    step={5}
                                    value={[field.value ?? 60]}
                                    onValueChange={([v]) => field.onChange(v)}
                                    className="flex-1"
                                />
                                <span className="w-12 text-right text-sm font-medium">
                                    {field.value ?? 60}m
                                </span>
                            </div>
                        )}
                    />
                </div>

                {/* Pass Score */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Điểm đậu (%)</Label>
                    <Controller
                        control={control}
                        name="finalExamConfig.passScore"
                        render={({ field }) => (
                            <div className="flex items-center gap-3">
                                <Slider
                                    min={50}
                                    max={100}
                                    step={5}
                                    value={[field.value ?? 75]}
                                    onValueChange={([v]) => field.onChange(v)}
                                    className="flex-1"
                                />
                                <span className="w-12 text-right text-sm font-medium">
                                    {field.value ?? 75}%
                                </span>
                            </div>
                        )}
                    />
                </div>

                {/* Structure Matrix */}
                <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Ma trận cấu trúc (câu hỏi)</Label>
                    <div className="grid grid-cols-2 gap-2">
                        {MATRIX_KEYS.map(({ key, label }) => (
                            <MatrixField key={key} label={label} name={key} control={control} />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
