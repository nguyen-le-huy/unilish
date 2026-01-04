import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";

export function LevelProgress() {
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Tiến độ lên cấp B2</h3>
                        <p className="text-sm text-muted-foreground mt-1">Cần <span className="font-bold text-foreground">550 XP</span> nữa để thăng hạng</p>
                    </div>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">75%</span>
                </div>

                <Progress value={75} className="h-3 bg-slate-100 dark:bg-slate-800" indicatorClassName="bg-blue-500" />

                <div className="flex justify-between items-center mt-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>B1 Sơ cấp</span>
                    <span>B2 Trung cấp</span>
                </div>
            </CardContent>
        </Card>
    );
}
