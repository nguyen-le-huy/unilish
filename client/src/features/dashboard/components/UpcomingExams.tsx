import { Link } from "react-router-dom"
import { Calendar, ChevronRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Mock data for upcoming exams
const upcomingExams = [
    {
        id: 1,
        title: "IELTS Practice Test",
        deadline: "15-01-2026",
        exp: 200,
        url: "/exams/ielts-practice",
    },
    {
        id: 2,
        title: "CNN News Listening",
        deadline: "22-01-2026",
        exp: 150,
        url: "/exams/cnn-listening",
    },
]

export function UpcomingExams() {
    return (
        <Card className="h-full">
            <CardHeader className="pb-3 px-4 sm:px-6">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg sm:text-xl font-semibold">
                        Kỳ thi sắp tới
                    </CardTitle>
                    <Link
                        to="/exams"
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    >
                        Xem tất cả
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                </div>

                {/* Badge */}
                <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 text-xs">
                        +2 mới
                    </Badge>
                    <span className="text-sm text-muted-foreground">Kết quả tốt nhất!</span>
                </div>
            </CardHeader>

            <CardContent className="space-y-3 px-4 sm:px-6">
                {upcomingExams.map((exam) => (
                    <Link
                        key={exam.id}
                        to={exam.url}
                        className="flex items-center gap-4 p-3 sm:p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors group"
                    >
                        {/* Exam info */}
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm sm:text-base text-foreground">
                                {exam.title}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1 text-muted-foreground">
                                <Calendar className="h-3.5 w-3.5" />
                                <span className="text-xs sm:text-sm">Bắt đầu vào {exam.deadline}</span>
                            </div>
                        </div>

                        {/* EXP */}
                        <div className="shrink-0">
                            <span className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">
                                +{exam.exp} EXP
                            </span>
                        </div>

                        {/* Arrow */}
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </Link>
                ))}
            </CardContent>
        </Card>
    )
}

