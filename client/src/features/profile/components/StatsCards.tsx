import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getStoredUser } from "@/features/auth/hooks/useAuthSync";
import { useSystemSetting } from "@/features/system/hooks/useSystemSetting";
import BookIcon from "@/assets/book.svg";

interface StatCardProps {
    label: string;
    value: React.ReactNode;
    subValue?: string;
    icon?: React.ReactNode;
    imageSrc?: string;
    colorClass: string;
    iconBgClass: string;
}

function StatCard({ label, value, subValue, icon, imageSrc, colorClass }: StatCardProps) {
    return (
        <Card className="h-full">
            <CardContent className="p-6 flex items-center gap-5">
                <div className={`h-20 w-20 flex items-center justify-center shrink-0 overflow-hidden`}>
                    {imageSrc ? (
                        <img src={imageSrc} alt="Icon" className="w-full h-full object-cover" />
                    ) : (
                        <div className={colorClass}>
                            {icon}
                        </div>
                    )}
                </div>
                <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
                    <h3 className="text-xl font-semibold text-foreground">{value}</h3>
                    {subValue && <span className="text-sm text-foreground/60">{subValue}</span>}
                </div>
            </CardContent>
        </Card>
    );
}

export function StatsCards() {
    const user = getStoredUser();
    const currentLevel = user?.currentLevel || 'A1';

    // Fetch Level Icons from System Settings
    const { data: levelIcons } = useSystemSetting<Record<string, string>>('level_icons');
    const levelIconUrl = levelIcons?.[currentLevel];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard
                label="Trình độ hiện tại"
                value={`Level ${currentLevel}`}
                subValue="Theo khung CEFR"
                imageSrc={levelIconUrl}
                icon={<GraduationCap className="w-7 h-7" />}
                colorClass="text-blue-600 dark:text-blue-400"
                iconBgClass="bg-blue-50 dark:bg-blue-900/20"
            />
            <StatCard
                label="Từ vựng đã học"
                value="856 Từ"
                imageSrc={BookIcon}
                colorClass="text-green-600 dark:text-green-400"
                iconBgClass="bg-green-50 dark:bg-green-900/20"
            />
        </div>
    );
}
