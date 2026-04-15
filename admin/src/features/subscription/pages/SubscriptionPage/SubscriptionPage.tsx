import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import type { SubscriptionConfig } from '../../types/config.types';
import { RefreshCw, History, Globe, UploadCloud, FileEdit } from 'lucide-react';
import { FreePlanCard } from '../../components/FreePlanCard/FreePlanCard';
import { PremiumPlanCard } from '../../components/PremiumPlanCard/PremiumPlanCard';
import { ConfigHistoryModal } from '../../components/ConfigHistoryModal/ConfigHistoryModal';
import { StatsCards } from '../../components/StatsCards/StatsCards';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import {
    useSubscriptionConfig,
    useDraftConfig,
    useSubscriptionStats,
    useSaveDraft,
    usePublishConfig,
    useRefreshCache,
} from '../../hooks/useSubscriptionData';

export default function SubscriptionPage() {
    // Only UI state (no API data state!)
    const [showHistory, setShowHistory] = useState(false);
    const [region, setRegion] = useState('GLOBAL');
    const [localDraft, setLocalDraft] = useState<SubscriptionConfig | null>(null);

    // Data from hooks - auto-managed by TanStack Query
    const { data: liveConfig, isLoading: liveLoading } = useSubscriptionConfig();
    const { data: serverDraft, isLoading: draftLoading } = useDraftConfig();
    const { data: stats, isLoading: statsLoading } = useSubscriptionStats();

    // Mutations
    const saveDraft = useSaveDraft();
    const publishConfig = usePublishConfig();
    const refreshCache = useRefreshCache();
    const resolvedBaseConfig = serverDraft || liveConfig || null;
    const workingConfig = localDraft || resolvedBaseConfig;

    // Derived state
    const hasUnpublishedChanges = JSON.stringify(liveConfig) !== JSON.stringify(workingConfig);

    const handleSaveDraft = async () => {
        if (!workingConfig) return;
        await saveDraft.mutateAsync(workingConfig);
    };

    const handlePublish = async () => {
        if (!confirm("Bạn có chắc chắn muốn xuất bản cấu hình này lên LIVE không?")) return;
        if (!workingConfig) return;

        // Save draft first, then publish
        await saveDraft.mutateAsync(workingConfig);
        await publishConfig.mutateAsync();

        // Clear local draft after publish
        setLocalDraft(null);
    };

    const handleRefreshCache = async () => {
        await refreshCache.mutateAsync();
    };

    // Loading state
    if (liveLoading || draftLoading) {
        return (
            <div className="space-y-6">
                <div className="h-20 bg-muted animate-pulse rounded-lg" />
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="h-96 bg-muted animate-pulse rounded-lg" />
                    <div className="h-96 bg-muted animate-pulse rounded-lg" />
                </div>
            </div>
        );
    }

    if (!workingConfig) {
        return <div className="p-8 text-center text-red-500">Lỗi tải dữ liệu.</div>;
    }

    const isLoading = saveDraft.isPending || publishConfig.isPending || refreshCache.isPending;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col gap-1">
                    <PageHeader
                        title="Gói cước"
                        description="Quản lý các gói đăng ký và giá cước (Support Regional Pricing)"
                    />
                    {hasUnpublishedChanges && (
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
                                Draft Mode: Có thay đổi chưa xuất bản
                            </Badge>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowHistory(true)}
                        className="gap-2"
                    >
                        <History className="h-4 w-4" />
                        Lịch sử
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshCache}
                        disabled={refreshCache.isPending}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshCache.isPending ? 'animate-spin' : ''}`} />
                    </Button>

                    <div className="h-6 w-px bg-border mx-2" />

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveDraft}
                        disabled={isLoading}
                        className="gap-2"
                    >
                        <FileEdit className="h-4 w-4" />
                        Lưu Nháp
                    </Button>

                    <Button
                        size="sm"
                        onClick={handlePublish}
                        disabled={isLoading}
                        className="gap-2 bg-green-600 hover:bg-green-700"
                    >
                        <UploadCloud className="h-4 w-4" />
                        Xuất bản (Live)
                    </Button>
                </div>
            </div>

            {/* Region Selector */}
            <div className="flex justify-end items-center gap-2">
                <span className="text-sm text-muted-foreground mr-2">Region Context:</span>
                <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="w-[200px] border-blue-200 bg-blue-50/20">
                        <Globe className="w-4 h-4 mr-2 text-blue-500" />
                        <SelectValue placeholder="Chọn quốc gia" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="GLOBAL">Global (Base Price)</SelectItem>
                        <SelectItem value="VN">Việt Nam (VND)</SelectItem>
                        <SelectItem value="US">United States (USD)</SelectItem>
                        <SelectItem value="JP">Japan (JPY)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <FreePlanCard
                    config={workingConfig.FREE}
                    onChange={(newFree) => setLocalDraft({ ...workingConfig, FREE: newFree })}
                />

                <PremiumPlanCard
                    config={(() => {
                        const base = workingConfig.PREMIUM;
                        if (region === 'GLOBAL') return base;

                        const regionConfig = base.regionalPricing?.find(r => r.regionCode === region);
                        return regionConfig
                            ? { ...base, pricing: regionConfig.pricing }
                            : { ...base, pricing: { monthly: 0, yearly: 0, currency: region === 'VN' ? 'VND' : (region === 'JP' ? 'JPY' : 'USD') } };
                    })()}
                    onChange={(newConfig) => {
                        const newPricing = newConfig.pricing;
                        if (!newPricing) return;

                        if (region === 'GLOBAL') {
                            setLocalDraft({ ...workingConfig, PREMIUM: newConfig });
                        } else {
                            const base = workingConfig.PREMIUM;
                            const currentRegions = base.regionalPricing || [];
                            const existingIndex = currentRegions.findIndex(r => r.regionCode === region);

                            let newRegions;
                            if (existingIndex >= 0) {
                                newRegions = [...currentRegions];
                                newRegions[existingIndex] = { regionCode: region, pricing: newPricing };
                            } else {
                                newRegions = [...currentRegions, { regionCode: region, pricing: newPricing }];
                            }

                            setLocalDraft({
                                ...workingConfig,
                                PREMIUM: { ...base, regionalPricing: newRegions }
                            });
                        }
                    }}
                />
            </div>

            {/* Stats Dashboard */}
            <div className="mt-8 pt-6 border-t">
                <StatsCards stats={stats || null} isLoading={statsLoading} />
            </div>

            <ConfigHistoryModal open={showHistory} onClose={() => setShowHistory(false)} />
        </div>
    );
}
