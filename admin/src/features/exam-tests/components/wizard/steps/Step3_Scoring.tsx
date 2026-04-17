import { useState } from 'react';
import { MinusCircle, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    createDefaultBandThresholds,
    getDefaultScoringFramework,
} from '../../../constants';
import type { ICreateExamTestPayload } from '../../../types';

interface Props {
    defaultValues: Partial<ICreateExamTestPayload>;
    onDone: (data: Partial<ICreateExamTestPayload>) => void;
    onBack: () => void;
}

interface BandRow {
    band: string;
    minScorePercent: number;
    maxScorePercent: number;
}

const toPercent = (value: number): number => {
    return Math.round(value * 100);
};

const clampPercent = (value: number): number => {
    return Math.min(100, Math.max(0, value));
};

export function Step3_Scoring({ defaultValues, onDone, onBack }: Props) {
    const format = defaultValues.format;
    const safeFormat = format ?? 'toeic_lr';
    const framework = defaultValues.scoringConfig?.framework ?? getDefaultScoringFramework(safeFormat);
    const [rows, setRows] = useState<BandRow[]>(() => {
        if (defaultValues.scoringConfig?.bandThresholds?.length) {
            return defaultValues.scoringConfig.bandThresholds.map((band) => ({
                band: band.band,
                minScorePercent: toPercent(band.minScore),
                maxScorePercent: toPercent(band.maxScore),
            }));
        }

        return createDefaultBandThresholds(safeFormat).map((band) => ({
            band: band.band,
            minScorePercent: toPercent(band.minScore),
            maxScorePercent: toPercent(band.maxScore),
        }));
    });

    if (!format) {
        return (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Vui lòng chọn định dạng ở bước trước để cấu hình scoring.
            </div>
        );
    }

    const updateRow = (
        index: number,
        field: keyof BandRow,
        value: string | number,
    ) => {
        setRows((prev) =>
            prev.map((row, rowIndex) => {
                if (rowIndex !== index) {
                    return row;
                }

                if (field === 'band' && typeof value === 'string') {
                    return { ...row, band: value };
                }

                if (
                    (field === 'minScorePercent' || field === 'maxScorePercent')
                    && typeof value === 'number'
                ) {
                    return { ...row, [field]: clampPercent(value) };
                }

                return row;
            }),
        );
    };

    const addRow = () => {
        setRows((prev) => [...prev, { band: '', minScorePercent: 0, maxScorePercent: 100 }]);
    };

    const removeRow = (index: number) => {
        setRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
    };

    const handleSubmit = () => {
        onDone({
            scoringConfig: {
                framework,
                bandThresholds: rows.map((row) => ({
                    band: row.band,
                    minScore: clampPercent(row.minScorePercent) / 100,
                    maxScore: clampPercent(row.maxScorePercent) / 100,
                })),
            },
        });
    };

    return (
        <div className="space-y-5">
            <div className="rounded-md border bg-muted/20 p-3 text-sm">
                Framework:{' '}
                <span className="font-semibold">
                    {framework === 'toeic_score' ? 'TOEIC Score' : 'IELTS Band'}
                </span>
            </div>

            <div className="rounded-md border">
                <div className="grid grid-cols-12 border-b bg-muted/20 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <p className="col-span-5">Band Label</p>
                    <p className="col-span-3">Min Score (%)</p>
                    <p className="col-span-3">Max Score (%)</p>
                    <p className="col-span-1" />
                </div>

                <div className="space-y-2 p-3">
                    {rows.map((row, index) => (
                        <div key={index} className="grid grid-cols-12 gap-2">
                            <Input
                                className="col-span-5"
                                value={row.band}
                                onChange={(event) => updateRow(index, 'band', event.target.value)}
                                placeholder="Band label"
                            />
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                className="col-span-3"
                                value={row.minScorePercent}
                                onChange={(event) =>
                                    updateRow(
                                        index,
                                        'minScorePercent',
                                        Number(event.target.value) || 0,
                                    )}
                            />
                            <Input
                                type="number"
                                min={0}
                                max={100}
                                className="col-span-3"
                                value={row.maxScorePercent}
                                onChange={(event) =>
                                    updateRow(
                                        index,
                                        'maxScorePercent',
                                        Number(event.target.value) || 0,
                                    )}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="col-span-1"
                                disabled={rows.length <= 1}
                                onClick={() => removeRow(index)}
                            >
                                <MinusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            <Button type="button" variant="outline" className="gap-2" onClick={addRow}>
                <PlusCircle className="h-4 w-4" />
                Thêm band threshold
            </Button>

            <div className="flex justify-between">
                <Button variant="outline" onClick={onBack}>← Quay lại</Button>
                <Button onClick={handleSubmit}>Tiếp theo</Button>
            </div>
        </div>
    );
}
