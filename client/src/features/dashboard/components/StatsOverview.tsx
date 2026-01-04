import { Calendar, ChevronDown } from "lucide-react"
import { Bar, BarChart, XAxis } from "recharts"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import type { UserStats } from "../types"

interface StatsOverviewProps {
    stats?: UserStats
}

// Mock activity data for the week (hours per day)
const chartData = [
    { day: "T2", hours: 2.5 },
    { day: "T3", hours: 3.2 },
    { day: "T4", hours: 1.8 },
    { day: "T5", hours: 2.0 },
    { day: "T6", hours: 5.5 },
    { day: "T7", hours: 4.8 },
    { day: "CN", hours: 3.0 },
]

const chartConfig = {
    hours: {
        label: "Giờ học",
        color: "hsl(var(--chart-1))",
    },
} satisfies ChartConfig

export function StatsOverview(_props: StatsOverviewProps) {
    // Calculate total hours
    const totalHours = chartData.reduce((sum, day) => sum + day.hours, 0)

    return (
        <Card className="h-full">
            <CardHeader className="pb-2 px-4 sm:px-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl font-semibold">
                        Hoạt động
                    </CardTitle>
                    <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8">
                        <Calendar className="h-3.5 w-3.5" />
                        7 ngày qua
                        <ChevronDown className="h-3 w-3" />
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pt-2">
                {/* Total hours */}
                <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-bold">{totalHours.toFixed(1).replace('.', ',')}</span>
                        <span className="text-muted-foreground text-base">giờ đã học</span>
                    </div>
                </div>

                {/* Bar chart with Recharts */}
                <ChartContainer config={chartConfig} className="h-[150px] w-full">
                    <BarChart
                        accessibilityLayer
                        data={chartData}
                        margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                    >
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            tick={{ fontSize: 12 }}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar
                            dataKey="hours"
                            fill="var(--color-hours)"
                            radius={[6, 6, 0, 0]}
                        />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
