import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PricingPlan {
    id: string;
    name: string;
    description: string;
    priceMonth: number;
    priceYear: number;
    features: string[];
    isPopular?: boolean;
    buttonText?: string;
    icon?: React.ReactNode;
    colorClass?: string;
}

interface PricingCardProps {
    plan: PricingPlan;
    isAnnual: boolean;
}

export function PricingCard({ plan, isAnnual }: PricingCardProps) {
    const price = isAnnual ? plan.priceYear : plan.priceMonth;
    const period = isAnnual ? "/ năm" : "/ tháng";
    const formattedPrice = new Intl.NumberFormat('vi-VN').format(price);

    // Dynamic styles based on plan
    const isPopular = plan.isPopular;

    // Common Card Content
    const CardBody = (
        <div className={cn(
            "flex flex-col h-full bg-white dark:bg-zinc-900 relative p-8",
            isPopular ? "rounded-[22px]" : "rounded-3xl border border-slate-200 dark:border-zinc-800 shadow-sm"
        )}>
            {/* Header Section */}
            <div className="flex justify-between items-start mb-6">
                {/* Icon */}
                <div className="w-12 h-12">
                    {plan.icon}
                </div>

                {/* Popular Badge */}
                {isPopular && (
                    <Badge className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border-0 px-3 py-1 rounded-full text-xs font-semibold shadow-none dark:bg-indigo-500/10 dark:text-indigo-400">
                        Phổ biến nhất
                    </Badge>
                )}
            </div>

            <div className="mb-8">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed min-h-[40px]">
                    {plan.description}
                </p>
            </div>

            <div className="mb-8">
                <div className="flex items-baseline">
                    <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                        {formattedPrice}
                    </span>
                    <span className="text-2xl font-bold ml-1 dark:text-white">đ</span>
                    <span className="ml-2 text-sm text-slate-500 dark:text-slate-400 font-medium">
                        {period}
                    </span>
                </div>
            </div>

            <Button
                className={cn(
                    "w-full font-semibold rounded-xl h-12 mb-8 text-sm transition-all duration-200",
                    isPopular
                        ? "bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-900 border-0 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
                )}
            >
                {plan.buttonText || "Bắt đầu ngay"}
            </Button>

            <div className="mt-auto space-y-4">
                <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-3">
                            <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                            <span className="text-sm text-slate-600 dark:text-slate-300 font-medium leading-tight">{feature}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );

    if (isPopular) {
        return (
            <div className="p-1 rounded-3xl bg-gradient-to-br from-orange-400 via-pink-500 to-blue-500 h-full shadow-xl animate-border-rotate">
                {CardBody}
            </div>
        );
    }

    return CardBody;
}
