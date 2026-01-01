import { LucideIcon } from "lucide-react"

// User Data Types
export interface CurrentLesson {
    unit: string
    lesson: string
    progress: number
    url: string
}

export interface UserStats {
    todayMinutes: number
    targetMinutes: number
    masteredWords: number
    totalXP: number
}

export interface UserData {
    name: string
    streak: number
    currentLesson: CurrentLesson
    stats: UserStats
}

// Skill Data Types
export interface SkillData {
    skill: string
    value: number
    fullMark: number
}

// Quest Types
export interface DailyQuest {
    id: number
    title: string
    completed: boolean
    xp: number
    icon: LucideIcon | string  // LucideIcon or SVG path
    target: number
    current?: number
}

// Leaderboard Types
export interface LeaderboardUser {
    rank: number
    name: string
    xp: number
    avatar: string
}

export interface UserRank {
    rank: number
    xpToNext: number
}

// AI Suggestion Types
export interface AISuggestion {
    id: number
    type: string
    message: string
    action: string
    url: string
}
