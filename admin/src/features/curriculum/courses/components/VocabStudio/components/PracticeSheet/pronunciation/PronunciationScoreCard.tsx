import { Badge } from '@/components/ui/badge';
import type { PronunciationAssessmentResult } from '../../../../../types/course.types';

interface PronunciationScoreCardProps {
    result: PronunciationAssessmentResult;
    referenceText: string;
}

interface Metric {
    label: string;
    score: number;
}

function getScoreClass(score: number): string {
    if (score >= 80) {
        return 'text-emerald-600';
    }
    if (score >= 60) {
        return 'text-amber-500';
    }
    return 'text-red-500';
}

function MetricItem({ label, score }: { label: string; score: number }) {
    return (
        <div className="rounded-md border bg-muted/25 px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${getScoreClass(score)}`}>{score}</p>
        </div>
    );
}

export function PronunciationScoreCard({ result, referenceText }: PronunciationScoreCardProps) {
    const metrics: Metric[] = [
        { label: 'Độ chính xác', score: result.accuracyScore },
        { label: 'Độ trôi chảy', score: result.fluencyScore },
        { label: 'Ngữ điệu', score: result.prosodyScore },
        { label: 'Độ đầy đủ', score: result.completenessScore },
    ].filter((metric) => Number.isFinite(metric.score));

    const overallScore = Number.isFinite(result.pronunciationScore)
        ? result.pronunciationScore
        : 0;

    return (
        <div className="space-y-4 rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Tổng điểm</p>
                    <p className={`text-3xl font-bold tabular-nums ${getScoreClass(overallScore)}`}>
                        {overallScore}
                        <span className="ml-1 text-base text-muted-foreground">/ 100</span>
                    </p>
                </div>
                <Badge variant="secondary" className="max-w-[60%] truncate text-xs" title={referenceText}>
                    {referenceText}
                </Badge>
            </div>

            {metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                    {metrics.map((metric) => (
                        <MetricItem key={metric.label} label={metric.label} score={metric.score} />
                    ))}
                </div>
            )}

            <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Chi tiết theo từ
                </p>

                {result.words.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                        Không nhận được dữ liệu phoneme. Hãy thử đọc rõ và gần micro hơn.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {result.words.map((word, index) => (
                            <div key={`${word.word}-${index}`} className="rounded-md border p-2.5">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-foreground">{word.word}</p>
                                    <p className={`text-sm font-semibold tabular-nums ${getScoreClass(word.accuracyScore)}`}>
                                        {word.accuracyScore}
                                    </p>
                                </div>

                                <div className="mt-2 flex flex-wrap gap-1.5">
                                    {word.phonemes.map((phoneme, phonemeIndex) => (
                                        <span
                                            key={`${word.word}-${phoneme.phoneme}-${phonemeIndex}`}
                                            className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${getScoreClass(phoneme.accuracyScore)}`}
                                        >
                                            {phoneme.phoneme || '?'} {phoneme.accuracyScore}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
