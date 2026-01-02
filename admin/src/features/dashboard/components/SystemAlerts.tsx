import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface SystemAlert {
    id: string
    type: 'success' | 'warning' | 'error' | 'info'
    title: string
    message: string
    time: string
}

// Mock data
const systemAlerts: SystemAlert[] = [
    { id: '1', type: 'success', title: 'Backup hoàn tất', message: 'Database backup lúc 02:00 AM thành công', time: '6 giờ trước' },
    { id: '2', type: 'warning', title: 'Dung lượng R2', message: 'Storage sử dụng 85% - cần theo dõi', time: '1 ngày trước' },
    { id: '3', type: 'info', title: 'AI Model cập nhật', message: 'GPT-4o-mini đã được kích hoạt cho Speaking Coach', time: '2 ngày trước' },
    { id: '4', type: 'error', title: 'Email service', message: 'n8n webhook timeout - đã tự động retry', time: '3 ngày trước' },
]

const alertIcons = {
    success: CheckCircle,
    warning: AlertTriangle,
    error: AlertCircle,
    info: Clock,
}

const alertColors = {
    success: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    error: 'text-red-600 bg-red-50',
    info: 'text-blue-600 bg-blue-50',
}

export function SystemAlerts() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Thông báo hệ thống</CardTitle>
                <CardDescription>Cảnh báo và log quan trọng</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {systemAlerts.map((alert) => {
                        const Icon = alertIcons[alert.type]
                        return (
                            <div key={alert.id} className="flex items-start gap-3">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${alertColors[alert.type]}`}>
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none">{alert.title}</p>
                                    <p className="text-xs text-muted-foreground">{alert.message}</p>
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {alert.time}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
