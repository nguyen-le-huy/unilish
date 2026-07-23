import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { LearningGoal } from '../../types/learning-goal.types';

// ---------------------------------------------------------------------------
// GoalIcon — shows iconUrl as image, falls back to first-letter avatar
// ---------------------------------------------------------------------------
interface GoalIconProps {
    iconUrl?: string | null;
    title: string;
}

function GoalIcon({ iconUrl, title }: GoalIconProps) {
    const fallbackLetter = title.charAt(0).toUpperCase();

    if (iconUrl) {
        return (
            <div className="h-10 w-10 flex-shrink-0 rounded-lg border bg-muted flex items-center justify-center overflow-hidden">
                <img
                    src={iconUrl}
                    alt={title}
                    className="h-6 w-6 object-contain"
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                />
            </div>
        );
    }

    return (
        <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
            <span className="text-sm font-semibold text-muted-foreground select-none">
                {fallbackLetter}
            </span>
        </div>
    );
}

// ---------------------------------------------------------------------------
// GoalCard
// ---------------------------------------------------------------------------
interface GoalCardProps {
    goal: LearningGoal;
    onToggleStatus: (slug: string) => void;
}

export const GoalCard = memo(function GoalCard({ goal, onToggleStatus }: GoalCardProps) {
    const navigate = useNavigate();

    const handleToggle = useCallback(() => onToggleStatus(goal.slug), [goal.slug, onToggleStatus]);
    const handleEdit = useCallback(() => navigate(`/curriculum/goals/${goal.slug}`), [goal.slug, navigate]);

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <GoalIcon iconUrl={goal.iconUrl} title={goal.title} />
                        <div className="min-w-0">
                            <CardTitle className="text-base leading-snug">{goal.title}</CardTitle>
                            <CardDescription className="mt-0.5 truncate">/{goal.slug}</CardDescription>
                        </div>
                    </div>
                    <Switch
                        checked={goal.isActive}
                        onCheckedChange={handleToggle}
                        aria-label={`Toggle status for ${goal.title}`}
                        className="flex-shrink-0"
                    />
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {goal.description ? (
                    <p className="min-h-10 text-sm text-muted-foreground line-clamp-2">{goal.description}</p>
                ) : null}

                <div>
                    <Button className="w-full" variant="outline" onClick={handleEdit}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
});
