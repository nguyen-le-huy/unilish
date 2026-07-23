import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { GoalCard } from '../../components/GoalCard/GoalCard';
import { useLearningGoals } from '../../hooks/useLearningGoals';
import { useToggleLearningGoalStatus } from '../../hooks/useLearningGoalMutations';

export default function GoalListPage() {
    const navigate = useNavigate();

    const [search, setSearch] = useState<string>('');

    const debouncedSearch = useDebounce(search, 300);
    const { data, isLoading } = useLearningGoals({ page: 1, limit: 24, search: debouncedSearch });
    const toggleMutation = useToggleLearningGoalStatus();

    const goals = data?.data ?? [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <PageHeader
                    title="Quản lý mục tiêu"
                    description="Quản lý thông tin và trạng thái của các mục tiêu học tập"
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
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
