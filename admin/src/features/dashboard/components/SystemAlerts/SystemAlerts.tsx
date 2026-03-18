import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loading } from "@/components/common/Loading";
import { AlertTriangle, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useSystemAlerts } from "../../hooks/useDashboardData";

const alertIcons = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Clock,
};

const alertColors = {
    success: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    error: 'text-red-600 bg-red-50',
    info: 'text-blue-600 bg-blue-50',
};

export function SystemAlerts() {
    const { data: systemAlerts, isLoading, isError } = useSystemAlerts();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Thông báo hệ thống</CardTitle>
                    <CardDescription>
                        <Loading size="sm" className="justify-start" />
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError || !systemAlerts) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Thông báo hệ thống</CardTitle>
                    <CardDescription>Không thể tải dữ liệu</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Thông báo hệ thống</CardTitle>
                <CardDescription>Cảnh báo và log quan trọng</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {systemAlerts.map((alert) => {
                        const Icon = alertIcons[alert.type];
                        return (
                            <div key={alert.id} className="flex items-start gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${alertColors[alert.type]}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 space-y-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate">{alert.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{alert.message}</p>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline-block">
                                    {alert.time}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
