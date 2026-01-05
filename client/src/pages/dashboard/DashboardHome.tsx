import { HeroSection } from "@/features/dashboard/components/HeroSection"
import { WeeklyStreak } from "@/features/dashboard/components/WeeklyStreak"
import { DailyQuests } from "@/features/dashboard/components/DailyQuests"
import { UpcomingExams } from "@/features/dashboard/components/UpcomingExams"
import { StatsOverview } from "@/features/dashboard/components/StatsOverview"
import { SkillRadarChart } from "@/features/dashboard/components/SkillRadarChart"
import { MiniLeaderboard } from "@/features/dashboard/components/MiniLeaderboard"
import {
  userData,
  skillData,
  dailyQuests,
  leaderboard,
  userRank,
} from "@/features/dashboard/data"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Chào buổi sáng"
  if (hour < 18) return "Chào buổi chiều"
  return "Chào buổi tối"
}

export default function DashboardHome() {
  const greeting = getGreeting()

  return (
    <div className="space-y-4 sm:space-y-6 w-full">
      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 sm:gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-4 sm:space-y-6 order-1">
          <HeroSection user={userData} greeting={greeting} />

          {/* WeeklyStreak & DailyQuests - shown here on mobile only */}
          <div className="lg:hidden space-y-4">
            <WeeklyStreak streak={userData.streak} />
            <DailyQuests quests={dailyQuests} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-4 sm:gap-6">
            <StatsOverview stats={userData.stats} />
            <SkillRadarChart data={skillData} />
          </div>
          <UpcomingExams />
        </div>

        {/* Right Column - hidden on mobile, shown on lg+ */}
        <div className="hidden lg:block space-y-4 sm:space-y-6 order-2">
          <WeeklyStreak streak={userData.streak} />
          <DailyQuests quests={dailyQuests} />
          <MiniLeaderboard users={leaderboard} currentUserRank={userRank} />
        </div>

        {/* MiniLeaderboard - shown at bottom on mobile */}
        <div className="lg:hidden order-3">
          <MiniLeaderboard users={leaderboard} currentUserRank={userRank} />
        </div>
      </div>
    </div>
  )
}
