import { memo } from 'react';
import { FileText, Music, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ListeningSection } from '../../hooks/useListeningStudioState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    activeSection: ListeningSection;
    onSectionChange: (section: ListeningSection) => void;
    hasScriptError: boolean;
    hasKaraokeError: boolean;
    hasInteractiveError: boolean;
}

interface NavItem {
    id: ListeningSection;
    label: string;
    description: string;
    Icon: React.ElementType;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItem[] = [
    {
        id: 'script',
        label: 'Kịch bản & Audio',
        description: 'Soạn hội thoại và cài đặt âm thanh',
        Icon: FileText,
    },
    {
        id: 'karaoke',
        label: 'Đồng bộ Karaoke',
        description: 'Timestamp từng từ & Gap-fill',
        Icon: Music,
    },
    {
        id: 'interactive',
        label: 'Tương tác & Bài tập',
        description: 'Cài đặt chế độ và câu hỏi',
        Icon: Settings,
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ListeningNavigator = memo(function ListeningNavigator({
    activeSection,
    onSectionChange,
    hasScriptError,
    hasKaraokeError,
    hasInteractiveError,
}: Props) {
    const hasError: Record<ListeningSection, boolean> = {
        script: hasScriptError,
        karaoke: hasKaraokeError,
        interactive: hasInteractiveError,
    };

    return (
        <div className="flex h-full flex-col border-r bg-muted/20">
            {/* Header */}
            <div className="flex items-center gap-2 shrink-0 border-b px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nội dung
                </span>
            </div>

            {/* Nav items */}
            <nav className="flex flex-col gap-0.5 p-2" aria-label="Listening Studio sections">
                {NAV_ITEMS.map(({ id, label, description, Icon }) => {
                    const isActive = activeSection === id;
                    const hasErr = hasError[id];

                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onSectionChange(id)}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                'group flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
                                isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-foreground/70 hover:bg-muted hover:text-foreground',
                            )}
                        >
                            <div className="relative mt-0.5 shrink-0">
                                <Icon className="h-4 w-4" aria-hidden="true" />
                                {hasErr && (
                                    <span
                                        className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive"
                                        aria-label="Có lỗi dữ liệu"
                                    />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium">{label}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                    {description}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </nav>
        </div>
    );
});
