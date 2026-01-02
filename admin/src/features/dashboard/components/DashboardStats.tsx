import { TrendingUp, TrendingDown, Users, BookOpen, CreditCard, Activity } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCardProps {
    title: string
    value: string
    change: number
    changeLabel: string
    description: string
    icon: React.ElementType
}

function StatCard({ title, value, change, changeLabel, description, icon: Icon }: StatCardProps) {
    const isPositive = change >= 0

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">{changeLabel}</span>
                    <div className={`flex items-center text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {isPositive ? '+' : ''}{change}%
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
        </Card>
    )
}

// Mock data - replace with real API data
const statsData = [
    {
        title: "Doanh thu tháng",
        value: "₫45,250,000",
        change: 12.5,
        changeLabel: "Tăng so với tháng trước",
        description: "Tổng doanh thu từ gói cước",
        icon: CreditCard,
    },
    {
        title: "Học viên mới",
        value: "1,234",
        change: -8,
        changeLabel: "Giảm 8% so với tháng trước",
        description: "Cần tăng cường marketing",
        icon: Users,
    },
    {
        title: "Học viên hoạt động",
        value: "15,678",
        change: 15.2,
        changeLabel: "Tỷ lệ retention tốt",
        description: "Số user học trong 7 ngày qua",
        icon: Activity,
    },
    {
        title: "Bài học hoàn thành",
        value: "8,542",
        change: 22.5,
        changeLabel: "Tăng mạnh so với tuần trước",
        description: "Số lesson được complete",
        icon: BookOpen,
    },
]

export function DashboardStats() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {statsData.map((stat) => (
                <StatCard key={stat.title} {...stat} />
            ))}
        </div>
    )
}
