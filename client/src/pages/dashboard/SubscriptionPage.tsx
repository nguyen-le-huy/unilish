import { useState } from "react";
import { PricingCard, PricingPlan } from "@/features/subscription/components/PricingCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import FreeIcon from "@/assets/subscription/free.svg";
import PlusIcon from "@/assets/subscription/plus.svg";
import ProIcon from "@/assets/subscription/pro.svg";

const plans: PricingPlan[] = [
    {
        id: "free",
        name: "FREE",
        description: "Người mới trải nghiệm thử",
        priceMonth: 0,
        priceYear: 0,
        buttonText: "Đang sử dụng",
        icon: <img src={FreeIcon} alt="Free Plan" className="w-full h-full object-contain" />,
        features: [
            "Nội dung: Giới hạn (3 bài/Level)",
            "AI Speaking: 10 lượt / ngày",
            "RAG Chatbot: 10 lượt / ngày",
            "AI Chấm điểm: Cơ bản",
        ],
        isPopular: false,
    },
    {
        id: "plus",
        name: "PLUS",
        description: "Người học cần lộ trình, tiết kiệm",
        priceMonth: 20000,
        priceYear: 168000,
        buttonText: "Nâng cấp ngay",
        icon: <img src={PlusIcon} alt="Plus Plan" className="w-full h-full object-contain" />,
        features: [
            "Mở khóa toàn bộ nội dung (A1 - C2)",
            "Chứng chỉ hoàn thành Online",
            "AI Speaking: 50 lượt / giờ",
            "RAG Chatbot: 50 lượt / giờ",
            "Video Call: Phòng ghép cặp ngẫu nhiên",
        ],
        isPopular: true,
    },
    {
        id: "pro",
        name: "PRO",
        description: "Power User cần trải nghiệm hội thoại thật nhất",
        priceMonth: 40000,
        priceYear: 336000,
        buttonText: "Nâng cấp ngay",
        icon: <img src={ProIcon} alt="Pro Plan" className="w-full h-full object-contain" />,
        features: [
            "Full quyền truy cập của PRO",
            "AI Speaking: Uni Pro (Không giới hạn)",
            "RAG Chatbot: Không giới hạn",
            "AI Chấm điểm: Deep Analysis (GPT-4o)",
            "Video Call: Ưu tiên ghép cặp VIP",
        ],
        isPopular: false,
    },
];

export function SubscriptionPage() {
    const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

    return (
        <div className="flex flex-col items-center w-full max-w-7xl mx-auto px-4 py-8 md:py-16 space-y-12">
            {/* Header */}
            <div className="text-center space-y-4 max-w-3xl">
                <h1 className="text-3xl md:text-5xl font-medium text-slate-900 dark:text-white">
                    Bảng giá đơn giản & minh bạch <br className="hidden md:block" /> cho mọi nhu cầu học tập
                </h1>
            </div>

            {/* Toggle */}
            <div className="flex justify-center w-full">
                <Tabs
                    defaultValue="monthly"
                    value={billingCycle}
                    onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}
                    className="w-full max-w-[400px]"
                >
                    <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-full dark:bg-zinc-800">
                        <TabsTrigger
                            value="monthly"
                            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-medium transition-all dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-white dark:text-zinc-400 text-[10px] xs:text-xs sm:text-sm"
                        >
                            Thanh toán theo tháng
                        </TabsTrigger>
                        <TabsTrigger
                            value="yearly"
                            className="rounded-full data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm font-medium transition-all dark:data-[state=active]:bg-zinc-950 dark:data-[state=active]:text-white dark:text-zinc-400 text-[10px] xs:text-xs sm:text-sm"
                        >
                            Theo năm (Tiết kiệm 30%)
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Pricing Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-stretch">
                {plans.map((plan) => (
                    <div key={plan.id} className={cn("h-full")}>
                        <PricingCard
                            plan={plan}
                            isAnnual={billingCycle === "yearly"}
                        />
                    </div>
                ))}
            </div>

            <div className="mt-12 text-center text-sm text-muted-foreground max-w-2xl">
                <p>Mọi gói đăng ký đều đi kèm với đảm bảo hoàn tiền trong 14 ngày. Bạn có thể hủy bất kỳ lúc nào.</p>
            </div>
        </div>
    );
}

// Default export for ease of importing
export default SubscriptionPage;
