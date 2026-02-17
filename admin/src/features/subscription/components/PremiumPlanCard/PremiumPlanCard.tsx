import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PlanConfig } from "../../types/config.types";

interface PremiumPlanCardProps {
    config: PlanConfig;
    onChange: (newConfig: PlanConfig) => void;
}

export const PremiumPlanCard = ({ config, onChange }: PremiumPlanCardProps) => {

    const handlePriceChange = (key: keyof NonNullable<PlanConfig['pricing']>, value: string) => {
        const numValue = parseInt(value) || 0;
        const currentPricing = config.pricing || { monthly: 0, yearly: 0, currency: 'VND' };

        onChange({
            ...config,
            pricing: { ...currentPricing, [key]: numValue }
        });
    };

    const handleFeatureChange = (key: keyof PlanConfig['features'], value: boolean) => {
        onChange({
            ...config,
            features: { ...config.features, [key]: value }
        });
    };

    return (
        <Card className="border-l-4 border-l-yellow-500 shadow-lg shadow-yellow-100/20">
            <CardHeader>
                <CardTitle className="flex justify-between items-center text-yellow-600">
                    <span>Gói Cao Cấp (PREMIUM)</span>
                    <span className="text-xs font-normal px-2 py-1 bg-yellow-100 rounded text-yellow-700">The Revenue</span>
                </CardTitle>
                <CardDescription>Cấu hình giá và quyền lợi đặc biệt</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Pricing Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground pb-2 border-b">
                        Chiến lược giá ({config.pricing?.currency || 'VND'})
                    </h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="premium-price-monthly">Giá Tháng (Monthly)</Label>
                            <div className="relative">
                                <Input
                                    id="premium-price-monthly"
                                    type="number"
                                    value={config.pricing?.monthly}
                                    onChange={(e) => handlePriceChange('monthly', e.target.value)}
                                // className="pl-4 pr-12"
                                />
                                {/* <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">VND</span> */}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="premium-price-yearly">Giá Năm (Yearly)</Label>
                            <div className="relative">
                                <Input
                                    id="premium-price-yearly"
                                    type="number"
                                    value={config.pricing?.yearly}
                                    onChange={(e) => handlePriceChange('yearly', e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Features Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground pb-2 border-b">Quyền lợi đặc biệt</h3>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="premium-verified" className="flex flex-col gap-1">
                            <span>Cấp Chứng Chỉ (Verified)</span>
                            <span className="font-normal text-xs text-muted-foreground">User được cấp Badge/Certificate</span>
                        </Label>
                        <Switch
                            id="premium-verified"
                            checked={config.features.verified_certificate}
                            onCheckedChange={(checked) => handleFeatureChange('verified_certificate', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="premium-analytics" className="flex flex-col gap-1">
                            <span>Phân tích Nâng cao (Analytics)</span>
                            <span className="font-normal text-xs text-muted-foreground">Xem biểu đồ tiến độ chi tiết</span>
                        </Label>
                        <Switch
                            id="premium-analytics"
                            checked={config.features.advanced_analytics}
                            onCheckedChange={(checked) => handleFeatureChange('advanced_analytics', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="premium-early" className="flex flex-col gap-1">
                            <span>Truy cập Sớm (Beta Access)</span>
                            <span className="font-normal text-xs text-muted-foreground">Dùng thử tính năng mới trước</span>
                        </Label>
                        {/* Example hypothetical feature, assuming strict types we might not map it directly unless defined */}
                        <div className="text-xs text-muted-foreground italic">Coming soon</div>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
};
