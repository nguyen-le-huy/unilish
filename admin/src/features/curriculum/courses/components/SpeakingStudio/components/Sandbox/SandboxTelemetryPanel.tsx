import { useState } from 'react';
import { PauseCircle, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { PttStatus, TurnResult } from '../../types/pipeline.types';
import type { UserTurnScore } from '../../hooks/use-coach-session';

interface Props {
    pttStatus: PttStatus;
    turnResult: TurnResult;
    telemetry: {
        latencyMs: number | null;
        tokenUsage: number | null;
        model: string;
        requestedModel: string;
        usedFallback: boolean;
        recognizedText: string;
        referenceText: string;
    };
    turnScores: UserTurnScore[];
    onInterrupt: () => void;
}

const TelemetryRow = ({ label, value }: { label: string; value: string | number }) => (
    <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 break-all text-sm font-semibold">{value}</p>
    </div>
);

const getScoreClass = (score: number): string => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-500';
    return 'text-red-500';
};

/** Modal chi tiết phoneme cho một lượt */
const TurnDetailModal = ({
    turn,
    turnNumber,
    onClose,
}: {
    turn: UserTurnScore;
    turnNumber: number;
    onClose: () => void;
}) => {
    const p = turn.pronunciation;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl border bg-background shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-5 py-4">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Chi tiết lượt {turnNumber}</p>
                        <p className="text-sm font-semibold mt-0.5 truncate max-w-[320px]">{turn.userText}</p>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Reference */}
                    <div className="rounded-md border bg-muted/30 px-3 py-2">
                        <p className="text-[11px] text-muted-foreground mb-0.5">Văn bản tham chiếu</p>
                        <p className="text-sm">{turn.referenceText}</p>
                    </div>

                    {!p ? (
                        <p className="text-sm text-amber-600">{turn.error || 'Đang chờ Azure chấm...'}</p>
                    ) : (
                        <>
                            {/* Tổng điểm */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-3 rounded-lg border-2 bg-background p-3 text-center">
                                    <p className="text-[11px] text-muted-foreground uppercase">Tổng điểm</p>
                                    <p className={`text-3xl font-bold tabular-nums mt-1 ${getScoreClass(p.pronunciationScore)}`}>
                                        {p.pronunciationScore}
                                        <span className="text-base text-muted-foreground">/100</span>
                                    </p>
                                </div>
                                {[
                                    { label: 'Độ chính xác', value: p.accuracyScore },
                                    { label: 'Độ trôi chảy', value: p.fluencyScore },
                                    { label: 'Độ đầy đủ', value: p.completenessScore },
                                    ...(Number.isFinite(p.prosodyScore) ? [{ label: 'Ngữ điệu', value: p.prosodyScore }] : []),
                                ].map((item) => (
                                    <div key={item.label} className="rounded-md border bg-muted/20 p-2 text-center">
                                        <p className="text-[10px] text-muted-foreground">{item.label}</p>
                                        <p className={`text-lg font-semibold tabular-nums ${getScoreClass(item.value)}`}>{item.value}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Văn bản nhận dạng được */}
                            <div className="rounded-md border bg-muted/30 px-3 py-2">
                                <p className="text-[11px] text-muted-foreground mb-0.5">Azure nhận dạng được</p>
                                <p className="text-sm italic">{p.recognizedText || '(trống)'}</p>
                            </div>

                            {/* Chi tiết từng từ + phoneme */}
                            {p.words.length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Phân tích theo từ &amp; âm vị
                                    </p>
                                    {p.words.map((word, i) => (
                                        <div key={`${word.word}-${i}`} className="rounded-md border p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold">{word.word}</p>
                                                <div className="flex items-center gap-2">
                                                    {word.errorType !== 'None' && (
                                                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-600">
                                                            {word.errorType}
                                                        </span>
                                                    )}
                                                    <p className={`text-sm font-semibold tabular-nums ${getScoreClass(word.accuracyScore)}`}>
                                                        {word.accuracyScore}
                                                    </p>
                                                </div>
                                            </div>
                                            {word.phonemes.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {word.phonemes.map((ph, pi) => (
                                                        <span
                                                            key={`${ph.phoneme}-${pi}`}
                                                            className={`rounded border px-2 py-0.5 text-[11px] font-mono font-medium ${getScoreClass(ph.accuracyScore)}`}
                                                            title={ph.errorType !== 'None' ? ph.errorType : undefined}
                                                        >
                                                            /{ph.phoneme || '?'}/ {ph.accuracyScore}
                                                            {ph.errorType !== 'None' && (
                                                                <span className="ml-1 text-[9px] opacity-70">{ph.errorType[0]}</span>
                                                            )}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

/** Summary card cho 1 lượt trong danh sách */
const TurnSummaryCard = ({
    turn,
    turnNumber,
}: {
    turn: UserTurnScore;
    turnNumber: number;
}) => {
    const [open, setOpen] = useState(false);
    const p = turn.pronunciation;

    return (
        <>
            <div className="rounded-md border bg-muted/20 p-2.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">Lượt {turnNumber}</p>
                    {p && (
                        <span className={`text-xs font-bold tabular-nums ${getScoreClass(p.pronunciationScore)}`}>
                            {p.pronunciationScore}/100
                        </span>
                    )}
                </div>

                <p className="text-xs truncate">
                    <span className="font-medium">Lời nói: </span>{turn.userText}
                </p>

                {p ? (
                    <>
                        <p className="text-[11px] text-muted-foreground">
                            Chính xác: <span className={`font-semibold ${getScoreClass(p.accuracyScore)}`}>{p.accuracyScore}</span>
                            {' · '}Trôi chảy: <span className={`font-semibold ${getScoreClass(p.fluencyScore)}`}>{p.fluencyScore}</span>
                            {' · '}Đầy đủ: <span className={`font-semibold ${getScoreClass(p.completenessScore)}`}>{p.completenessScore}</span>
                        </p>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 w-full text-[11px]"
                            onClick={() => setOpen(true)}
                        >
                            Xem chi tiết phoneme
                            <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                    </>
                ) : (
                    <p className="text-[11px] text-amber-600">{turn.error || 'Đang chấm Azure...'}</p>
                )}
            </div>

            {open && (
                <TurnDetailModal
                    turn={turn}
                    turnNumber={turnNumber}
                    onClose={() => setOpen(false)}
                />
            )}
        </>
    );
};

export const SandboxTelemetryPanel = ({
    pttStatus,
    turnResult,
    telemetry,
    turnScores,
    onInterrupt,
}: Props) => {
    const pronunciation = turnResult.pronunciation;

    return (
        <div className="flex h-full flex-col bg-muted/20">
            <div className="border-b px-6 py-4">
                <p className="text-xs text-muted-foreground">BẢNG ĐIỀU KHIỂN DEBUG (X-RAY)</p>
                <h3 className="text-lg font-semibold">Dữ liệu Pipeline</h3>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                {/* Session state */}
                <div className="rounded-md border bg-background p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trạng thái phiên</p>
                    <TelemetryRow label="Trạng thái PTT" value={pttStatus} />
                    <Button type="button" variant="outline" className="w-full" onClick={onInterrupt}>
                        <PauseCircle className="mr-2 h-4 w-4" />
                        Ngắt giọng AI
                    </Button>
                </div>

                {/* OpenAI pipeline */}
                <div className="rounded-md border bg-background p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pipeline OpenAI</p>
                    <TelemetryRow label="Model yêu cầu" value={telemetry.requestedModel} />
                    <TelemetryRow label="Model thực tế" value={telemetry.model} />
                    <TelemetryRow label="Độ trễ (LLM)" value={telemetry.latencyMs !== null ? `${telemetry.latencyMs}ms` : '—'} />
                    <TelemetryRow label="Token sử dụng" value={telemetry.tokenUsage ?? '—'} />
                    {telemetry.usedFallback && (
                        <p className="text-xs text-amber-600">Đã chuyển sang model dự phòng.</p>
                    )}
                </div>

                {/* Azure pronunciation - lượt hiện tại */}
                <div className="rounded-md border bg-background p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Phát âm Azure (lượt hiện tại)</p>
                    <TelemetryRow
                        label="Tổng điểm"
                        value={pronunciation ? `${pronunciation.pronunciationScore}/100` : '—'}
                    />
                    <TelemetryRow
                        label="Chính xác / Trôi chảy / Ngữ điệu / Đầy đủ"
                        value={pronunciation
                            ? `${pronunciation.accuracyScore} / ${pronunciation.fluencyScore} / ${pronunciation.prosodyScore} / ${pronunciation.completenessScore}`
                            : '—'}
                    />
                    <TelemetryRow label="Azure nhận dạng" value={telemetry.recognizedText} />
                    <TelemetryRow label="Văn bản tham chiếu" value={telemetry.referenceText} />
                </div>

                {/* Lịch sử lượt nói */}
                <div className="rounded-md border bg-background p-4 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Lịch sử chấm điểm ({turnScores.length} lượt)
                    </p>

                    {turnScores.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Chưa có lượt nói nào.</p>
                    ) : (
                        <div className="space-y-2">
                            {[...turnScores].reverse().slice(0, 8).map((turn, index) => (
                                <TurnSummaryCard
                                    key={turn.id}
                                    turn={turn}
                                    turnNumber={turnScores.length - index}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
