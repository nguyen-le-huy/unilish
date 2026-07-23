import { memo } from 'react';
import { Save, Loader2, Headphones, Sparkles, Music2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    lessonTitle: string;
    isSaving: boolean;
    isGeneratingScript: boolean;
    isSyncing: boolean;
    syncStatus?: string;
    syncProgress?: number;
    onSave: () => void;
    onGenerateScript: () => void;
    onMixAndSync: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ListeningTopBar = memo(function ListeningTopBar({
    lessonTitle,
    isSaving,
    isGeneratingScript,
    isSyncing,
    syncStatus,
    syncProgress,
    onSave,
    onGenerateScript,
    onMixAndSync,
}: Props) {
    const isBusy = isSaving || isGeneratingScript || isSyncing;

    return (
        <div className="flex shrink-0 items-center gap-3 border-b bg-background px-4 py-2.5">
            {/* Title + icon */}
            <Headphones className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="max-w-52 truncate text-sm font-medium" title={lessonTitle}>
                {lessonTitle}
            </span>

            <Badge variant="secondary" className="shrink-0 text-xs">
                Nghe hiểu
            </Badge>

            {isSyncing && (
                <Badge variant="outline" className="shrink-0 text-xs">
                    {syncStatus ?? 'SYNCING'} · {Math.max(0, Math.min(100, syncProgress ?? 0))}%
                </Badge>
            )}

            <div className="ml-auto flex items-center gap-2">
                {/* AI: Generate Script */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onGenerateScript}
                    disabled={isBusy}
                    aria-label="AI viết kịch bản"
                >
                    {isGeneratingScript ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Sparkles className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isGeneratingScript ? 'Đang viết...' : 'AI Viết Kịch bản'}
                </Button>

                <Separator orientation="vertical" className="h-5" />

                {/* AI: Mix Audio & Sync — gradient, most important */}
                <Button
                    size="sm"
                    onClick={onMixAndSync}
                    disabled={isBusy}
                    aria-label="Mix audio và đồng bộ timestamp"
                    className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700 disabled:opacity-60"
                >
                    {isSyncing ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Music2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isSyncing ? 'Đang xử lý...' : 'Mix Audio & Sync'}
                </Button>

                <Separator orientation="vertical" className="h-5" />

                {/* Save */}
                <Button
                    size="sm"
                    variant="outline"
                    onClick={onSave}
                    disabled={isBusy}
                    aria-label="Lưu nội dung bài nghe"
                >
                    {isSaving ? (
                        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                        <Save className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {isSaving ? 'Đang lưu...' : 'Lưu & Xuất bản'}
                </Button>
            </div>
        </div>
    );
});
