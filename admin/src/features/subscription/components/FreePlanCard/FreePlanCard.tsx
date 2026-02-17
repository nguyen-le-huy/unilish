import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { PlanConfig } from "../../types/config.types";

interface FreePlanCardProps {
    config: PlanConfig;
    onChange: (newConfig: PlanConfig) => void;
}

export const FreePlanCard = ({ config, onChange }: FreePlanCardProps) => {
    const handleLimitChange = (key: keyof PlanConfig['limits'], value: string) => {
        const numValue = parseInt(value) || 0;
        onChange({
            ...config,
            limits: { ...config.limits, [key]: numValue }
        });
    };

    const handleFeatureChange = (key: keyof PlanConfig['features'], value: boolean) => {
        onChange({
            ...config,
            features: { ...config.features, [key]: value }
        });
    };

    return (
        <Card className="border-l-4 border-l-slate-400">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>Gói Miễn Phí (FREE)</span>
                    <span className="text-xs font-normal px-2 py-1 bg-slate-100 rounded text-slate-500">The Hook</span>
                </CardTitle>
                <CardDescription>Cấu hình giới hạn để khuyến khích nâng cấp</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Limits Section */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground pb-2 border-b">Giới hạn sử dụng (Limits)</h3>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="free-chat-limit">AI Chat (tin/ngày)</Label>
                            <Input
                                id="free-chat-limit"
                                type="number"
                                value={config.limits.ai_chat_daily}
                                onChange={(e) => handleLimitChange('ai_chat_daily', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="free-speaking-limit">AI Speaking (lượt/ngày)</Label>
                            <Input
                                id="free-speaking-limit"
                                type="number"
                                value={config.limits.ai_speaking_daily}
                                onChange={(e) => handleLimitChange('ai_speaking_daily', e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="free-unit-limit">Unit Access (Bài học đầu)</Label>
                            <Input
                                id="free-unit-limit"
                                type="number"
                                value={config.limits.unit_access_limit}
                                onChange={(e) => handleLimitChange('unit_access_limit', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Features Toggle */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground pb-2 border-b">Tính năng (Features)</h3>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="free-ads" className="flex flex-col gap-1">
                            <span>Hiển thị Quảng cáo</span>
                            <span className="font-normal text-xs text-muted-foreground">Bật quảng cáo cho user free</span>
                        </Label>
                        <Switch
                            id="free-ads"
                            checked={config.features.ads_enabled}
                            onCheckedChange={(checked) => handleFeatureChange('ads_enabled', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="free-offline" className="flex flex-col gap-1">
                            <span>Tải Offline</span>
                            <span className="font-normal text-xs text-muted-foreground">Cho phép tải bài học về máy</span>
                        </Label>
                        <Switch
                            id="free-offline"
                            checked={config.features.offline_download}
                            onCheckedChange={(checked) => handleFeatureChange('offline_download', checked)}
                        />
                    </div>
                </div>

            </CardContent>
        </Card>
    );
};
