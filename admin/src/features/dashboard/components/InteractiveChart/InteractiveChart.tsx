"use client"

import * as React from "react"
import { CartesianGrid, Line, LineChart, XAxis } from "recharts"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Loading } from "@/components/common/Loading"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"
import { useChartData } from "../../hooks/useDashboardData"

const chartConfig = {
    views: {
        label: "Lượt truy cập",
    },
    desktop: {
        label: "Máy tính",
        color: "hsl(var(--chart-1))",
    },
    mobile: {
        label: "Điện thoại",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig

export function InteractiveChart() {
    const { data: chartData, isLoading, isError } = useChartData();
    const [activeChart, setActiveChart] =
        React.useState<keyof typeof chartConfig>("desktop")

    const total = React.useMemo(
        () => ({
            desktop: chartData?.reduce((acc, curr) => acc + curr.desktop, 0) || 0,
            mobile: chartData?.reduce((acc, curr) => acc + curr.mobile, 0) || 0,
        }),
        [chartData]
    )

    if (isLoading) {
        return (
            <Card className="py-0">
                <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
                    <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
                        <CardTitle>Biểu đồ tương tác</CardTitle>
                        <CardDescription>
                            <Loading size="sm" className="justify-start" />
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="px-2 sm:p-6">
                    <div className="h-[250px] bg-muted animate-pulse rounded" />
                </CardContent>
            </Card>
        );
    }

    if (isError || !chartData) {
        return (
            <Card className="py-0">
                <CardHeader>
                    <CardTitle>Biểu đồ tương tác</CardTitle>
                    <CardDescription>Không thể tải dữ liệu biểu đồ</CardDescription>
                </CardHeader>
            </Card>
        );
    }


    return (
        <Card className="py-0">
            <CardHeader className="flex flex-col items-stretch border-b !p-0 sm:flex-row">
                <div className="flex flex-1 flex-col justify-center gap-1 px-6 pt-4 pb-3 sm:!py-0">
                    <CardTitle>Biểu đồ tương tác</CardTitle>
                    <CardDescription>
                        Thống kê lượt truy cập trong 3 tháng qua
                    </CardDescription>
                </div>
                <div className="flex">
                    {["desktop", "mobile"].map((key) => {
                        const chart = key as keyof typeof chartConfig
                        return (
                            <button
                                key={chart}
                                data-active={activeChart === chart}
                                className="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-2 py-3 text-left even:border-l sm:border-t-0 sm:border-l sm:px-8 sm:py-6 outline-none transition-colors hover:bg-muted/30"
                                onClick={() => setActiveChart(chart)}
                            >
                                <span className="text-muted-foreground text-xs">
                                    {chartConfig[chart].label}
                                </span>
                                <span className="text-lg leading-none font-bold sm:text-3xl">
                                    {total[key as keyof typeof total].toLocaleString()}
                                </span>
                            </button>
                        )
                    })}
                </div>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[250px] w-full"
                >
                    <LineChart
                        accessibilityLayer
                        data={chartData}
                        margin={{
                            left: 12,
                            right: 12,
                        }}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                            tickFormatter={(value) => {
                                const date = new Date(value)
                                return date.toLocaleDateString("vi-VN", {
                                    month: "short",
                                    day: "numeric",
                                })
                            }}
                        />
                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    className="w-[150px]"
                                    nameKey="views"
                                    labelFormatter={(value) => {
                                        return new Date(value).toLocaleDateString("vi-VN", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })
                                    }}
                                />
                            }
                        />
                        <Line
                            dataKey={activeChart}
                            type="monotone"
                            stroke={`var(--color-${activeChart})`}
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}
