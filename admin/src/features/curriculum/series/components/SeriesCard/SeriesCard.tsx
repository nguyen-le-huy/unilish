import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Edit3, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { CourseSeries, Language, LearningGoal } from '../../types/course-series.types';

interface SeriesCardProps {
    series: CourseSeries;
    onToggleStatus: (slug: string) => void;
    onDelete: (series: CourseSeries) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLanguageCode(languageId: CourseSeries['languageId']): string {
    if (typeof languageId === 'string') return '—';
    return (languageId as Language).code?.toUpperCase() ?? '—';
}

function getGoalTitle(learningGoalId: CourseSeries['learningGoalId']): string {
    if (typeof learningGoalId === 'string') return '—';
    return (learningGoalId as LearningGoal).title ?? '—';
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SeriesCard = memo(function SeriesCard({
    series,
    onToggleStatus,
    onDelete,
}: SeriesCardProps) {
    const navigate = useNavigate();

    const handleToggle = useCallback(() => onToggleStatus(series.slug), [series.slug, onToggleStatus]);
    const handleDelete = useCallback(() => onDelete(series), [series, onDelete]);
    const handleEdit = useCallback(
        () => navigate(`/curriculum/series/${series.slug}`),
        [series.slug, navigate],
    );

    const canDelete = series.totalCourses === 0;

    return (
        <Card className="flex flex-col overflow-hidden">
            {/* ── Thumbnail ── */}
            <div className="relative aspect-video w-full overflow-hidden bg-muted">
                {series.thumbnailUrl ? (
                    <img
                        src={series.thumbnailUrl}
                        alt={`Thumbnail cho ${series.title}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div
                        className="flex h-full w-full items-center justify-center"
                        aria-hidden="true"
                    >
                        <BookOpen className="h-12 w-12 text-muted-foreground/40" />
                    </div>
                )}

                {/* ── Status badges ── */}
                <div className="absolute left-2 top-2 flex gap-1.5">
                    <Badge variant="secondary" className="text-xs font-semibold uppercase">
                        {getLanguageCode(series.languageId)}
                    </Badge>
                </div>
            </div>

            {/* ── Header ── */}
            <CardHeader className="pb-2 pt-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <CardTitle className="truncate text-base">{series.title}</CardTitle>
                        <CardDescription className="mt-0.5 truncate">/{series.slug}</CardDescription>
                    </div>
                    <Switch
                        checked={series.isActive}
                        onCheckedChange={handleToggle}
                        aria-label={`Bật/tắt trạng thái series ${series.title}`}
                        className="shrink-0"
                    />
                </div>
            </CardHeader>

            {/* ── Body ── */}
            <CardContent className="flex flex-1 flex-col gap-3 pb-4">
                {/* Goal + course count */}
                <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-sm">
                    <span className="truncate text-muted-foreground">
                        {getGoalTitle(series.learningGoalId)}
                    </span>
                    <span className="shrink-0 font-semibold">
                        {series.totalCourses} khóa
                    </span>
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2">
                    <Button
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={handleEdit}
                        aria-label={`Chỉnh sửa series ${series.title}`}
                    >
                        <Edit3 className="mr-2 h-3.5 w-3.5" />
                        Chỉnh sửa
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        disabled={!canDelete}
                        aria-label={
                            canDelete
                                ? `Xóa series ${series.title}`
                                : `Không thể xóa: series còn ${series.totalCourses} khóa học`
                        }
                        title={canDelete ? undefined : `Còn ${series.totalCourses} khóa học — không thể xóa`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive disabled:opacity-30"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
});
