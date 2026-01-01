import { Link } from "react-router-dom"
import { Crown } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { LeaderboardUser, UserRank } from "../types"
import TrophyIcon from "@/assets/trophy.svg"
import Top1Badge from "@/assets/top1.svg"
import Top2Badge from "@/assets/top2.svg"
import Top3Badge from "@/assets/top3.svg"

interface MiniLeaderboardProps {
    users: LeaderboardUser[]
    currentUserRank: UserRank
}

export function MiniLeaderboard({ users, currentUserRank }: MiniLeaderboardProps) {
    return (
        <Card>
            <CardHeader className="pb-3 px-4 sm:px-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <img src={TrophyIcon} alt="Trophy" className="h-7 w-7 sm:h-8 sm:w-8" />
                    Bảng xếp hạng
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6">
                {users.map((user, index) => (
                    <div
                        key={user.rank}
                        className="flex items-center gap-2 sm:gap-3 p-1.5 sm:p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                        <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${index === 0 ? "bg-amber-500 text-white" :
                            index === 1 ? "bg-gray-400 text-white" :
                                "bg-amber-700 text-white"
                            }`}>
                            {user.rank}
                        </div>
                        <Avatar className="h-6 w-6 sm:h-8 sm:w-8 shrink-0">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback className="text-xs">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <p className="font-medium text-xs sm:text-sm truncate">{user.name}</p>
                            {index === 0 && <img src={Top1Badge} alt="Top 1" className="h-4 w-4 sm:h-5 sm:w-5" />}
                            {index === 1 && <img src={Top2Badge} alt="Top 2" className="h-4 w-4 sm:h-5 sm:w-5" />}
                            {index === 2 && <img src={Top3Badge} alt="Top 3" className="h-4 w-4 sm:h-5 sm:w-5" />}
                        </div>
                        <span className="text-xs sm:text-sm font-semibold text-muted-foreground shrink-0">
                            {user.xp.toLocaleString()} XP
                        </span>
                    </div>
                ))}

                <Separator />

                {/* User's Rank */}
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs sm:text-sm font-bold text-primary shrink-0">
                        {currentUserRank.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs sm:text-sm">Bạn</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            Cần thêm {currentUserRank.xpToNext} XP để lên hạng
                        </p>
                    </div>

                </div>

                <Button asChild variant="outline" className="w-full text-xs sm:text-sm" size="sm">
                    <Link to="/leaderboard">
                        Xem đầy đủ
                    </Link>
                </Button>
            </CardContent>
        </Card>
    )
}
