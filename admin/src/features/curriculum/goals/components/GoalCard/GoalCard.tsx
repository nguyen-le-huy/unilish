import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadarSkillChart } from '../RadarSkillChart/RadarSkillChart';
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
    onDuplicate: (goal: LearningGoal) => void;
}

export const GoalCard = memo(function GoalCard({ goal, onToggleStatus, onDuplicate }: GoalCardProps) {
    const navigate = useNavigate();

    const handleToggle = useCallback(() => onToggleStatus(goal.slug), [goal.slug, onToggleStatus]);
    const handleDuplicate = useCallback(() => onDuplicate(goal), [goal, onDuplicate]);
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
                <RadarSkillChart skillWeights={goal.skillWeights} />

                <div className="rounded-md bg-muted px-3 py-2 text-sm flex items-center justify-between">
                    <span>Active Users</span>
                    <span className="font-semibold">{goal.stats?.activeUsers ?? 0}</span>
                </div>

                <div className="flex gap-2">
                    <Button className="flex-1" variant="outline" onClick={handleEdit}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Chỉnh sửa
                    </Button>
                    <Button className="flex-1" variant="secondary" onClick={handleDuplicate}>
                        <Copy className="h-4 w-4 mr-2" />
                        Nhân bản
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
});
