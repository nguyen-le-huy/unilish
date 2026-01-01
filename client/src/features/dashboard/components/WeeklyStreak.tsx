import { Check } from "lucide-react"

import { Card } from "@/components/ui/card"
import FireIcon from "@/assets/fire.svg"

interface WeeklyStreakProps {
    streak: number
    completedDays?: boolean[] // Array of 7 booleans for M-T-W-T-F-S-S
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"]

export function WeeklyStreak({ streak, completedDays }: WeeklyStreakProps) {
    // Default: calculate from current day based on streak
    const today = new Date().getDay() // 0 = Sunday, 1 = Monday, ...
    const todayIndex = today === 0 ? 6 : today - 1 // Convert to M=0, T=1, ... S=6

    // If completedDays not provided, derive from streak
    const days = completedDays ?? WEEKDAYS.map((_, index) => {
        if (index <= todayIndex) {
            // Days up to today: check if within streak
            const daysFromStart = todayIndex - index
            return daysFromStart < streak
        }
        return false // Future days are not completed
    })

    return (
        <Card className="overflow-hidden border shadow-sm bg-card h-full">
            <div className="p-4 sm:p-5 flex items-center gap-4 sm:gap-6">
                {/* Fire icon */}
                <div className="shrink-0">
                    <img
                        src={FireIcon}
                        alt="Fire"
                        className="w-16 h-16 sm:w-20 sm:h-20"
                    />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Streak text */}
                    <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">
                        {streak} days streak. Keep it up!
                    </h3>

                    {/* Weekday circles */}
                    <div className="flex items-center justify-between gap-1 sm:gap-2">
                        {WEEKDAYS.map((day, index) => (
                            <div key={index} className="flex flex-col items-center gap-1.5">
                                {/* Day label */}
                                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                                    {day}
                                </span>
                                {/* Circle */}
                                <div
                                    className={`
                                        w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
                                        transition-all duration-200
                                        ${days[index]
                                            ? "bg-red-400 text-white"
                                            : "bg-muted"
                                        }
                                    `}
                                >
                                    {days[index] && <Check className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={3} />}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Card>
    )
}
