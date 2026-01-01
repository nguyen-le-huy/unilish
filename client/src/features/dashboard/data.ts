import type { UserData, SkillData, DailyQuest, LeaderboardUser, UserRank, AISuggestion } from "./types"
import FlashIcon from "@/assets/flash.svg"
import RocketIcon from "@/assets/rocket.svg"

// Mock data - sẽ được thay bằng API hooks sau (useUser, useQuests, etc.)
export const userData: UserData = {
    name: "Huy",
    streak: 5,
    currentLesson: {
        unit: "Unit 3: Family",
        lesson: "Lesson 2: Vocabulary",
        progress: 40,
        url: "/courses/unit-3/lesson-2",
    },
    stats: {
        todayMinutes: 15,
        targetMinutes: 30,
        masteredWords: 124,
        totalXP: 2450,
    },
}

export const skillData: SkillData[] = [
    { skill: "Từ vựng", value: 85, fullMark: 100 },
    { skill: "Ngữ pháp", value: 65, fullMark: 100 },
    { skill: "Phát âm", value: 70, fullMark: 100 },
    { skill: "Nghe", value: 55, fullMark: 100 },
    { skill: "Phản xạ", value: 60, fullMark: 100 },
]

export const dailyQuests: DailyQuest[] = [
    {
        id: 1,
        title: "Đăng nhập 5 ngày liên tiếp",
        completed: true,
        xp: 5,
        icon: FlashIcon,
        target: 5,
    },
    {
        id: 2,
        title: "Hoàn thành 3 bài Quiz không sai",
        completed: false,
        xp: 15,
        icon: RocketIcon,
        target: 3,
    },
]

export const leaderboard: LeaderboardUser[] = [
    { rank: 1, name: "Minh Anh", xp: 3200, avatar: "https://i.pravatar.cc/150?u=1" },
    { rank: 2, name: "Thanh Tùng", xp: 2980, avatar: "https://i.pravatar.cc/150?u=2" },
    { rank: 3, name: "Lan Phương", xp: 2750, avatar: "https://i.pravatar.cc/150?u=3" },
]

export const userRank: UserRank = { rank: 7, xpToNext: 50 }

export const aiSuggestions: AISuggestion[] = [
    {
        id: 1,
        type: "grammar",
        message: "Dựa trên bài nói hôm qua, bạn hay sai thì Quá khứ đơn. Hãy ôn tập ngay bài Grammar Unit 5 nhé!",
        action: "Ôn tập ngay",
        url: "/courses/grammar-unit-5",
    },
    {
        id: 2,
        type: "news",
        message: "Có tin tức mới về Tech trên CNN phù hợp với trình độ B1 của bạn.",
        action: "Đọc ngay",
        url: "/news/tech-latest",
    },
]
