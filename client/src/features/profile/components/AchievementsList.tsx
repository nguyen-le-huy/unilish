import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import ChampionIcon from "@/assets/achievement/champion.svg";
import Streak7Icon from "@/assets/achievement/streak7.svg";
import Streak77Icon from "@/assets/achievement/streak77.svg";
import Top1Icon from "@/assets/achievement/top1.svg";
import ScholarIcon from "@/assets/achievement/scholar.svg";
import Top2Icon from "@/assets/achievement/top2.svg";

interface AchievementItemProps {
    icon?: React.ReactNode;
    imageSrc?: string;
    label: string;
    subLabel?: string;
    isActive: boolean;
    colorClass?: string;
    bgClass?: string;
}

function AchievementItem({ icon, imageSrc, label, subLabel, isActive, colorClass, bgClass }: AchievementItemProps) {
    return (
        <div className={`flex flex-col items-center text-center gap-2 cursor-pointer`}>
            {imageSrc ? (
                <div className="h-16 w-16 sm:h-20 sm:w-20 flex items-center justify-center">
                    <img src={imageSrc} alt={label} className="w-full h-full object-contain" />
                </div>
            ) : (
                <div className={`
                    h-16 w-16 sm:h-20 sm:w-20 rounded-full flex items-center justify-center
                    ${isActive ? bgClass : 'bg-slate-100 dark:bg-slate-800'}
                `}>
                    <div className={`
                        w-8 h-8 sm:w-10 sm:h-10
                        ${isActive ? colorClass : 'text-slate-300 dark:text-slate-600'}
                    `}>
                        {icon}
                    </div>
                </div>
            )}
            <div className="flex flex-col">
                <span className={`text-xs sm:text-sm font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                {subLabel && <span className="text-[10px] sm:text-xs text-muted-foreground">{subLabel}</span>}
            </div>
        </div>
    );
}

export function AchievementsList() {
    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6 pb-2">
                <CardTitle className="text-lg font-bold">Thành tích</CardTitle>
                <Link to="#" className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    Xem tất cả
                </Link>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-y-8 gap-x-4">
                    <AchievementItem
                        imageSrc={ChampionIcon}
                        label="Quán quân"
                        isActive={true}
                    />
                    <AchievementItem
                        imageSrc={Top1Icon}
                        label="Top 1"
                        isActive={true}
                    />
                    <AchievementItem
                        imageSrc={Streak7Icon}
                        label="Chuỗi 7 ngày"
                        isActive={true}
                    />
                    <AchievementItem
                        imageSrc={Streak77Icon}
                        label="Chuỗi 77 ngày"
                        isActive={false}
                    />
                    <AchievementItem
                        imageSrc={ScholarIcon}
                        label="Học giả"
                        isActive={false}
                    />
                    <AchievementItem
                        imageSrc={Top2Icon}
                        label="Top 2"
                        isActive={false}
                    />
                </div>
            </CardContent>
        </Card>
    );
}
