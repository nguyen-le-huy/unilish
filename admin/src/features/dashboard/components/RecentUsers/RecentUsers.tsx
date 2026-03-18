import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/common/Loading";
import { useRecentUsers } from "../../hooks/useDashboardData";

const planColors = {
    free: 'bg-gray-100 text-gray-800',
    plus: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
};

const planLabels = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
};

export function RecentUsers() {
    const { data: recentUsers, isLoading, isError } = useRecentUsers();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Học viên mới đăng ký</CardTitle>
                    <CardDescription>
                        <Loading size="sm" className="justify-start" />
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError || !recentUsers) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Học viên mới đăng ký</CardTitle>
                    <CardDescription>Không thể tải dữ liệu</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Học viên mới đăng ký</CardTitle>
                <CardDescription>5 học viên mới nhất trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-4">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>
                                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1 min-w-0">
                                <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className={planColors[user.plan]}>
                                    {planLabels[user.plan]}
                                </Badge>
                                <span className="text-xs text-muted-foreground hidden sm:inline-block">{user.joinedAt}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
