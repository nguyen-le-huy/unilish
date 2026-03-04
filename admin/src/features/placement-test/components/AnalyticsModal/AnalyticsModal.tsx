import { useState } from 'react';
import { BarChart2, TrendingDown, Clock, Users } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useAnalytics } from '../../hooks/usePlacementTestQueries';
import { CEFR_LEVELS } from '../../constants';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    testId: string | null;
    onClose: () => void;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    icon: Icon,
}: {
    label: string;
    value: string | number;
    icon: React.ElementType;
}) {
    return (
        <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
                <Icon className="h-3.5 w-3.5" />
                {label}
            </div>
            <span className="text-2xl font-bold">{value}</span>
        </div>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnalyticsModal({ testId, onClose }: Props) {
    const open = !!testId;
    const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
    const { data, isLoading } = useAnalytics(testId ?? '', range);

    const totalCefr = data
        ? Object.values(data.cefrDistribution).reduce((s, v) => s + (v ?? 0), 0)
        : 0;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <BarChart2 className="h-5 w-5" />
                            Thống kê bài kiểm tra
                        </DialogTitle>
                        <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7d">7 ngày</SelectItem>
                                <SelectItem value="30d">30 ngày</SelectItem>
                                <SelectItem value="90d">90 ngày</SelectItem>
                                <SelectItem value="all">Tất cả</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogDescription>
                        Xem thống kê người dùng và kết quả bài kiểm tra đầu vào.
                    </DialogDescription>
                </DialogHeader>

                {isLoading || !data ? (
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-lg" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-5 mt-2">
                        {/* KPIs */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <StatCard label="Tổng lượt thi" value={data.totalAttempts} icon={Users} />
                            <StatCard label="Hoàn thành" value={data.completedAttempts} icon={Users} />
                            <StatCard
                                label="Tỷ lệ bỏ thi"
                                value={`${(data.dropoutRate * 100).toFixed(1)}%`}
                                icon={TrendingDown}
                            />
                            <StatCard
                                label="Thời gian TB"
                                value={`${data.avgDurationMinutes.toFixed(0)} phút`}
                                icon={Clock}
                            />
                        </div>

                        {/* CEFR distribution */}
                        <div>
                            <p className="text-sm font-medium mb-2">Phân bố CEFR</p>
                            <div className="flex flex-wrap gap-2">
                                {CEFR_LEVELS.map((level) => {
                                    const count = data.cefrDistribution[level] ?? 0;
                                    const pct = totalCefr > 0 ? ((count / totalCefr) * 100).toFixed(1) : '0.0';
                                    return (
                                        <div key={level} className="flex flex-col items-center gap-1">
                                            <Badge variant="outline" className="font-mono text-xs w-14 justify-center">
                                                {level}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{pct}%</span>
                                            <span className="text-xs font-medium">{count}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Skill scores */}
                        {data.skillScores && Object.keys(data.skillScores).length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2">Điểm kỹ năng trung bình</p>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {Object.entries(data.skillScores).map(([skill, score]) => (
                                        <div key={skill} className="rounded border bg-muted/20 p-3 text-center">
                                            <p className="text-xs capitalize text-muted-foreground">{skill}</p>
                                            <p className="text-xl font-bold">
                                                {score != null ? score.toFixed(1) : '—'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Module dropout */}
                        {data.moduleDropoutRates && data.moduleDropoutRates.length > 0 && (
                            <div>
                                <p className="text-sm font-medium mb-2">Tỷ lệ bỏ thi theo module</p>
                                <div className="space-y-1.5">
                                    {data.moduleDropoutRates.map((m) => (
                                        <div key={m.moduleName} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">{m.moduleName}</span>
                                            <span className="font-medium">{(m.rate * 100).toFixed(1)}%</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
