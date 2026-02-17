import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CouponStats as CouponStatsType } from "../../types/coupon.types";
import { Ticket, Coins, TrendingUp } from "lucide-react";

interface Props {
    stats: CouponStatsType | null;
    isLoading?: boolean;
}

export function CouponStats({ stats, isLoading }: Props) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-3">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Active Coupons
                    </CardTitle>
                    <Ticket className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.activeCoupons || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Mã đang hoạt động
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Total Redeemed
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalRedeemed || 0}</div>
                    <p className="text-xs text-muted-foreground">
                        Lượt sử dụng thành công
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                        Revenue Saved
                    </CardTitle>
                    <Coins className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {stats?.revenueSaved ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.revenueSaved) : '0 ₫'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Tổng tiền đã giảm cho khách
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
