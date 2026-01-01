import { Radar, RadarChart, PolarGrid, PolarAngleAxis } from "recharts"

import { Card, CardContent } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import type { SkillData } from "../types"

interface SkillRadarChartProps {
    data: SkillData[]
}

const chartConfig = {
    value: {
        label: "Điểm",
        color: "hsl(142 76% 36%)", // Green color
    },
} satisfies ChartConfig

// Calculate CEFR level based on average score
function getCEFRLevel(avgScore: number): { level: string; description: string } {
    if (avgScore >= 90) return { level: "C2", description: "Thành thạo" }
    if (avgScore >= 80) return { level: "C1", description: "Nâng cao" }
    if (avgScore >= 70) return { level: "B2", description: "Trung cấp cao" }
    if (avgScore >= 60) return { level: "B1", description: "Trung cấp" }
    if (avgScore >= 40) return { level: "A2", description: "Sơ cấp" }
    return { level: "A1", description: "Nhập môn" }
}

export function SkillRadarChart({ data }: SkillRadarChartProps) {
    // Calculate overall score
    const overallScore = Math.round(data.reduce((sum, item) => sum + item.value, 0) / data.length)
    const { level, description } = getCEFRLevel(overallScore)

    return (
        <Card className="h-full">
            {/* Header with overall score */}
            <div className="p-4 sm:p-6 pb-0">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Trình độ của bạn</p>
                        <p className="text-3xl sm:text-4xl font-bold text-foreground">{level}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {description} • Điểm TB: {overallScore}/100
                        </p>
                    </div>

                </div>
            </div>

            <CardContent className="pb-4 px-2 sm:px-4 overflow-visible">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[180px] sm:max-h-[220px] overflow-visible [&_svg]:overflow-visible"
                >
                    <RadarChart data={data}>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                        <PolarAngleAxis
                            dataKey="skill"
                            tick={{ fontSize: 10 }}
                            className="sm:[&_text]:text-xs"
                        />
                        <PolarGrid />
                        <Radar
                            dataKey="value"
                            fill="var(--color-value)"
                            fillOpacity={0.6}
                            dot={{
                                r: 4,
                                fillOpacity: 1,
                            }}
                        />
                    </RadarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}


