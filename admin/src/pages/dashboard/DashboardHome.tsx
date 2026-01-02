import { DashboardStats } from "@/features/dashboard/components/DashboardStats"
import { RecentUsers } from "@/features/dashboard/components/RecentUsers"
import { RecentContent } from "@/features/dashboard/components/RecentContent"
import { SystemAlerts } from "@/features/dashboard/components/SystemAlerts"
import { InteractiveChart } from "@/features/dashboard/components/InteractiveChart"

export default function DashboardHome() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Tổng quan</h1>
                <p className="text-muted-foreground">
                    Xin chào! Đây là bảng điều khiển quản trị Unilish.
                </p>
            </div>

            {/* Stats Cards */}
            <DashboardStats />

            {/* Interactive Chart */}
            <InteractiveChart />

            {/* Two Column Layout */}
            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left Column */}
                <div className="space-y-6">
                    <RecentUsers />
                    <SystemAlerts />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <RecentContent />
                </div>
            </div>
        </div>
    )
}
