import { useStatsData } from '../../hooks/useDashboardData';
import { StatCard } from './StatCard';

export function DashboardStats() {
    const { data: stats, isLoading, isError } = useStatsData();

    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    if (isError || !stats) {
        return (
            <div className="text-sm text-muted-foreground">
                Không thể tải dữ liệu thống kê
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
                <StatCard key={stat.title} {...stat} />
            ))}
        </div>
    );
}
