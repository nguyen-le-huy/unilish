import { MoreVertical } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { DailyQuest } from "../types"

interface DailyQuestsProps {
    quests: DailyQuest[]
}

export function DailyQuests({ quests }: DailyQuestsProps) {
    return (
        <Card className="h-full">
            <CardHeader className="pb-4 px-5">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold">
                        Thử thách hàng ngày
                    </CardTitle>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-5 space-y-5">
                {quests.map((quest) => {
                    // Calculate progress percentage
                    const progress = quest.completed ? 100 : Math.floor(Math.random() * 80) + 10
                    const current = quest.completed ? quest.target : Math.floor((progress / 100) * quest.target)
                    const isCompleted = quest.completed

                    return (
                        <div key={quest.id} className="space-y-3">
                            {/* Quest info */}
                            <div className="flex items-start gap-3">
                                <div>
                                    {typeof quest.icon === "string" ? (
                                        <img src={quest.icon} alt="" className="h-10 w-10" />
                                    ) : (
                                        <quest.icon className="h-10 w-10" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-sm text-foreground">
                                        {quest.title}
                                    </h4>
                                    <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                                        +{quest.xp} EXP
                                    </p>
                                </div>
                            </div>

                            {/* Progress bar */}
                            <Progress
                                value={progress}
                                className="h-1.5 bg-purple-100 dark:bg-purple-900/30 [&>div]:bg-gradient-to-r [&>div]:from-purple-500 [&>div]:to-purple-400"
                            />

                            {/* Progress text & Claim button */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">
                                    {current}/{quest.target} Hoàn thành
                                </span>
                                <Button
                                    size="sm"
                                    variant={isCompleted ? "default" : "secondary"}
                                    disabled={!isCompleted}
                                    className={
                                        isCompleted
                                            ? "bg-purple-600 hover:bg-purple-700 text-white rounded-md px-4 text-xs"
                                            : "bg-muted text-muted-foreground rounded-md px-4 text-xs cursor-not-allowed"
                                    }
                                >
                                    Nhận thưởng
                                </Button>
                            </div>
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
