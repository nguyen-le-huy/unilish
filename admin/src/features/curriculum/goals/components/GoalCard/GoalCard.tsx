import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit3, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RadarSkillChart } from '../RadarSkillChart/RadarSkillChart';
import type { LearningGoal } from '../../types/learning-goal.types';

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
                    <div>
                        <CardTitle className="text-base">{goal.title}</CardTitle>
                        <CardDescription className="mt-1">/{goal.slug}</CardDescription>
                    </div>
                    <Switch
                        checked={goal.isActive}
                        onCheckedChange={handleToggle}
                        aria-label={`Toggle status for ${goal.title}`}
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
