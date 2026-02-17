import type { SubscriptionStats } from '../../types/config.types';

interface StatsCardsProps {
    stats: SubscriptionStats | null;
    isLoading?: boolean;
}

export const StatsCards = ({ stats, isLoading }: StatsCardsProps) => {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/40 rounded-lg">
                <div className="text-2xl font-bold text-slate-700">
                    {stats ? stats.freeUsers.toLocaleString() : '...'}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    Free Users
                </div>
            </div>
            <div className="text-center p-4 bg-yellow-50/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                    {stats ? stats.premiumUsers.toLocaleString() : '...'}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    Premium Users
                </div>
            </div>
            <div className="text-center p-4 bg-muted/40 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                    {stats ? `${stats.conversionRate}%` : '...'}
                </div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    Conversion Rate
                </div>
            </div>
            <div className="text-center p-4 bg-muted/40 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">Active</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
                    System Status
                </div>
            </div>
        </div>
    );
};
