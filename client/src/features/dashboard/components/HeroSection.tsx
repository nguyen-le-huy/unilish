import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import StudentImage from "@/assets/student.png"
import HiIcon from "@/assets/Hi.svg"

interface HeroSectionProps {
    user: {
        name: string
    }
    greeting: string
}

export function HeroSection({ user, greeting }: HeroSectionProps) {
    return (
        <Card className="overflow-hidden border-0 shadow-sm bg-gradient-to-br from-purple-50 via-pink-50 to-purple-100 dark:from-purple-950/30 dark:via-pink-950/20 dark:to-purple-900/30">
            <CardContent className="p-0">
                <div className="flex items-center justify-between p-6 sm:p-8">
                    {/* Left Content */}
                    <div className="flex-1 space-y-4 max-w-md">
                        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-gray-900 dark:text-white leading-tight flex items-center flex-wrap gap-2">
                            {greeting}, {user.name}
                            <img src={HiIcon} alt="Hi" className="inline-block h-16 sm:h-16 w-auto" />
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                            Sẵn sàng chinh phục bài học hôm nay chưa? Hãy tiếp tục hành trình học tiếng Anh của bạn!
                        </p>
                        <Button
                            asChild
                            className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-6 py-5 text-base font-semibold shadow-lg shadow-purple-500/25"
                        >
                            <Link to="/courses">
                                Tiếp tục học
                            </Link>
                        </Button>
                    </div>

                    {/* Right Image */}
                    <div className="hidden sm:block flex-shrink-0">
                        <img
                            src={StudentImage}
                            alt="Student learning"
                            className="h-40 sm:h-48 lg:h-56 w-auto object-contain"
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
