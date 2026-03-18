import type { PronunciationResult } from '../../types/pipeline.types';

interface Props {
    result: PronunciationResult;
}

const getScoreClass = (score: number): string => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
};

const MetricItem = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-md border bg-muted/20 px-3 py-2">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={`mt-1 text-xl font-semibold tabular-nums ${getScoreClass(value)}`}>{value}</p>
    </div>
);

export const PronunciationScoreCard = ({ result }: Props) => {
    const hasProsody = Number.isFinite(result.prosodyScore);

    return (
        <div className="space-y-3 rounded-lg border bg-background p-3">
            <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Tổng điểm phát âm</p>
                <p className={`text-3xl font-bold tabular-nums ${getScoreClass(result.pronunciationScore)}`}>
                    {result.pronunciationScore}
                    <span className="ml-1 text-base text-muted-foreground">/100</span>
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <MetricItem label="Độ chính xác" value={result.accuracyScore} />
                <MetricItem label="Độ trôi chảy" value={result.fluencyScore} />
                {hasProsody && <MetricItem label="Ngữ điệu" value={result.prosodyScore} />}
                <MetricItem label="Độ đầy đủ" value={result.completenessScore} />
            </div>

            <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Phân tích theo từ
                </p>

                {result.words.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Không có dữ liệu từ Azure cho lượt nói này.</p>
                ) : (
                    <div className="space-y-2">
                        {result.words.map((word, index) => (
                            <div key={`${word.word}-${index}`} className="rounded-md border p-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-medium">{word.word}</p>
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
};
