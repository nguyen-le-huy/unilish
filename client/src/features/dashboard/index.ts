// Components
export { HeroSection } from "./components/HeroSection"
export { WeeklyStreak } from "./components/WeeklyStreak"
export { DailyQuests } from "./components/DailyQuests"
export { UpcomingExams } from "./components/UpcomingExams"
export { StatsOverview } from "./components/StatsOverview"
export { SkillRadarChart } from "./components/SkillRadarChart"
export { MiniLeaderboard } from "./components/MiniLeaderboard"

// Types
export type {
    UserData,
    UserStats,
    CurrentLesson,
    SkillData,
    DailyQuest,
    LeaderboardUser,
    UserRank,
    AISuggestion,
} from "./types"

// Mock Data (temporary - will be replaced by API hooks)
export {
    userData,
    skillData,
    dailyQuests,
    leaderboard,
    userRank,
    aiSuggestions,
} from "./data"
