import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
    title: string;
    value: string;
    change: number;
    changeLabel: string;
    description: string;
    icon: React.ElementType;
}

export function StatCard({ title, value, change, changeLabel, description, icon: Icon }: StatCardProps) {
    const isPositive = change >= 0;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                    {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold truncate" title={value}>{value}</div>
                <div className="flex items-center gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">{changeLabel}</span>
                    <div className={`flex items-center text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                        {isPositive ? '+' : ''}{change}%
                    </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </CardContent>
        </Card>
    );
}
