import { DashboardStats } from "../../components/DashboardStats/DashboardStats"
import { RecentUsers } from "../../components/RecentUsers/RecentUsers"
import { RecentContent } from "../../components/RecentContent/RecentContent"
import { SystemAlerts } from "../../components/SystemAlerts/SystemAlerts"
import { InteractiveChart } from "../../components/InteractiveChart/InteractiveChart"


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

            {/* Two Column Layout - Stacks on mobile/tablet */}
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
