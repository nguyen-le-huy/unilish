import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { GoalCard } from '../../components/GoalCard/GoalCard';
import { DuplicateGoalDialog } from '../../components/DuplicateGoalDialog/DuplicateGoalDialog';
import { useLearningGoals } from '../../hooks/useLearningGoals';
import { useDuplicateLearningGoal, useToggleLearningGoalStatus } from '../../hooks/useLearningGoalMutations';
import type { LearningGoal } from '../../types/learning-goal.types';

export default function GoalListPage() {
    const navigate = useNavigate();

    const [search, setSearch] = useState<string>('');
    const [duplicateTarget, setDuplicateTarget] = useState<LearningGoal | null>(null);

    const debouncedSearch = useDebounce(search, 300);
    const { data, isLoading } = useLearningGoals({ page: 1, limit: 24, search: debouncedSearch });
    const toggleMutation = useToggleLearningGoalStatus();
    const duplicateMutation = useDuplicateLearningGoal();

    const goals = data?.data ?? [];

    const handleDuplicateConfirm = useCallback(
        async (payload: { newSlug: string; newTitle: string }) => {
            if (!duplicateTarget) return;
            await duplicateMutation.mutateAsync({ slug: duplicateTarget.slug, payload });
            setDuplicateTarget(null);
        },
        [duplicateTarget, duplicateMutation],
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <PageHeader
                    title="Mục tiêu & Chiến lược"
                    description="Quản lý cấu hình học tập và hành vi AI theo từng learning goal"
                />
                <Button onClick={() => navigate('/curriculum/goals/new')} aria-label="Tạo mục tiêu học tập mới">
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo mục tiêu mới
                </Button>
            </div>

            <div className="max-w-md">
                <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tìm theo tên hoặc slug..."
                    aria-label="Tìm kiếm mục tiêu học tập"
                />
            </div>

            {isLoading ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, index) => (
                        <Skeleton key={index} className="h-80 w-full rounded-lg" />
                    ))}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {goals.map((goal) => (
                        <GoalCard
                            key={goal._id}
                            goal={goal}
                            onToggleStatus={(slug) => toggleMutation.mutate(slug)}
                            onDuplicate={setDuplicateTarget}
                        />
                    ))}
                </div>
            )}

            {duplicateTarget && (
                <DuplicateGoalDialog
                    isOpen={Boolean(duplicateTarget)}
                    onClose={() => setDuplicateTarget(null)}
                    onConfirm={handleDuplicateConfirm}
                    defaultSlug={duplicateTarget.slug}
                    defaultTitle={duplicateTarget.title}
                    isPending={duplicateMutation.isPending}
                />
            )}
        </div>
    );
}
