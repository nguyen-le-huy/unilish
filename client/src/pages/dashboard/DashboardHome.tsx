"use client"

import { Link } from "react-router-dom"
import {
  Flame,
  Play,
  Target,
  BookOpen,
  Mic,
  Newspaper,
  Trophy,
  Sparkles,
  Clock,
  Zap,
  Crown,
  TrendingUp,
} from "lucide-react"
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

// Mock data - sẽ được thay bằng API sau
const userData = {
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

const skillData = [
  { skill: "Từ vựng", value: 85, fullMark: 100 },
  { skill: "Ngữ pháp", value: 65, fullMark: 100 },
  { skill: "Phát âm", value: 70, fullMark: 100 },
  { skill: "Nghe", value: 55, fullMark: 100 },
  { skill: "Phản xạ", value: 60, fullMark: 100 },
]

const chartConfig = {
  value: {
    label: "Điểm",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

const dailyQuests = [
  {
    id: 1,
    title: "Hoàn thành 1 bài Speaking với AI",
    completed: true,
    xp: 50,
    icon: Mic,
  },
  {
    id: 2,
    title: "Đọc 1 bài báo CNN",
    completed: false,
    xp: 30,
    icon: Newspaper,
  },
  {
    id: 3,
    title: "Học 10 từ mới",
    completed: false,
    xp: 40,
    icon: BookOpen,
  },
]

const leaderboard = [
  { rank: 1, name: "Minh Anh", xp: 3200, avatar: "https://i.pravatar.cc/150?u=1" },
  { rank: 2, name: "Thanh Tùng", xp: 2980, avatar: "https://i.pravatar.cc/150?u=2" },
  { rank: 3, name: "Lan Phương", xp: 2750, avatar: "https://i.pravatar.cc/150?u=3" },
]

const userRank = { rank: 7, xpToNext: 50 }

const aiSuggestions = [
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

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Chào buổi sáng"
  if (hour < 18) return "Chào buổi chiều"
  return "Chào buổi tối"
}

export default function DashboardHome() {
  const completedQuests = dailyQuests.filter(q => q.completed).length
  const allQuestsCompleted = completedQuests === dailyQuests.length

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Cột chính - 70% */}
      <div className="flex-1 lg:w-[70%] space-y-6">
        {/* Hero Section - Lời chào & Tiếp tục học */}
        <Card className="overflow-hidden border-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold">
                  {getGreeting()}, {userData.name}! 👋
                </h1>
                <p className="text-white/90 text-lg">
                  Sẵn sàng chinh phục bài học hôm nay chưa?
                </p>

                {/* Current Lesson */}
                <div className="mt-4 p-4 bg-white/20 backdrop-blur-sm rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
                    <BookOpen className="h-4 w-4" />
                    <span>{userData.currentLesson.unit}</span>
                    <span>•</span>
                    <span>{userData.currentLesson.lesson}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={userData.currentLesson.progress} className="h-2 bg-white/30" />
                      <p className="text-xs text-white/80 mt-1">
                        Đã hoàn thành {userData.currentLesson.progress}%
                      </p>
                    </div>
                    <Button asChild size="lg" className="bg-white text-purple-600 hover:bg-white/90 font-semibold">
                      <Link to={userData.currentLesson.url}>
                        <Play className="mr-2 h-5 w-5" />
                        HỌC TIẾP
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Streak Badge */}
              <div className="flex flex-col items-center justify-center p-4 bg-white/20 backdrop-blur-sm rounded-2xl min-w-[140px]">
                <Flame className="h-12 w-12 text-orange-300 animate-pulse" />
                <span className="text-4xl font-bold mt-1">{userData.streak}</span>
                <span className="text-sm text-white/80">ngày liên tiếp</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Quests */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Thử thách hàng ngày
                </CardTitle>
                <CardDescription>
                  Hoàn thành nhiệm vụ để nhận thưởng XP
                </CardDescription>
              </div>
              <Badge variant={allQuestsCompleted ? "default" : "secondary"} className="text-sm">
                {completedQuests}/{dailyQuests.length} hoàn thành
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="flex w-full flex-col divide-y rounded-md border">
              {dailyQuests.map((quest) => (
                <li key={quest.id}>
                  <Label
                    htmlFor={`quest-${quest.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center gap-3">
                      <quest.icon className={`size-5 ${quest.completed ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`} />
                      <span className="flex flex-col">
                        <span className={`font-medium ${quest.completed ? "line-through text-muted-foreground" : ""}`}>
                          {quest.title}
                        </span>
                        <span className="text-xs text-muted-foreground">+{quest.xp} XP</span>
                      </span>
                    </span>
                    {quest.completed ? (
                      <Badge className="gap-1.5 border-none bg-green-600/10 text-green-600 dark:bg-green-400/10 dark:text-green-400">
                        <span className="size-1.5 rounded-full bg-green-600 dark:bg-green-400" aria-hidden="true" />
                        Hoàn thành
                      </Badge>
                    ) : (
                      <Badge className="gap-1.5 border-none bg-amber-600/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
                        <span className="size-1.5 rounded-full bg-amber-600 dark:bg-amber-400" aria-hidden="true" />
                        Đang làm
                      </Badge>
                    )}
                  </Label>
                </li>
              ))}
            </ul>

            {/* Bonus Reward */}
            {allQuestsCompleted && (
              <div className="flex items-center justify-center gap-2 p-4 mt-4 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/20">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  🎁 Bạn đã nhận được Bonus 100 XP!
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Gợi ý từ AI Coach
            </CardTitle>
            <CardDescription>
              Được cá nhân hóa dựa trên tiến độ học của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {aiSuggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-start gap-4 p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
              >
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm">{suggestion.message}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link to={suggestion.url}>
                      {suggestion.action}
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Cột phụ - 30% */}
      <div className="lg:w-[30%] space-y-6">
        {/* Stats Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Thống kê hôm nay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Time Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Thời gian học
                </span>
                <span className="font-medium">
                  {userData.stats.todayMinutes}/{userData.stats.targetMinutes} phút
                </span>
              </div>
              <Progress
                value={(userData.stats.todayMinutes / userData.stats.targetMinutes) * 100}
                className="h-2"
              />
            </div>

            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-xl">
                <BookOpen className="h-5 w-5 mx-auto text-primary mb-1" />
                <p className="text-2xl font-bold">{userData.stats.masteredWords}</p>
                <p className="text-xs text-muted-foreground">Từ đã thuộc</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-xl">
                <Zap className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold">{userData.stats.totalXP.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Tổng XP</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Skill Radar Chart */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Kỹ năng của bạn
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 px-2">
            <ChartContainer config={chartConfig} className="mx-auto w-full h-[320px]">
              <RadarChart data={skillData} cx="50%" cy="50%" outerRadius="50%">
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <PolarAngleAxis
                  dataKey="skill"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                />
                <PolarGrid strokeOpacity={0.3} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Mini Leaderboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Bảng xếp hạng
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.map((user, index) => (
              <div
                key={user.rank}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? "bg-amber-500 text-white" :
                  index === 1 ? "bg-gray-400 text-white" :
                    "bg-amber-700 text-white"
                  }`}>
                  {user.rank}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{user.name}</p>
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  {user.xp.toLocaleString()} XP
                </span>
              </div>
            ))}

            <Separator />

            {/* User's Rank */}
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {userRank.rank}
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Bạn</p>
                <p className="text-xs text-muted-foreground">
                  Cần thêm {userRank.xpToNext} XP để vượt người phía trên
                </p>
              </div>
              <Crown className="h-5 w-5 text-amber-500" />
            </div>

            <Button asChild variant="outline" className="w-full">
              <Link to="/leaderboard">
                Xem đầy đủ
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
