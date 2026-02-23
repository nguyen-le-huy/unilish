import { memo } from 'react';
import { BookOpen, Ruler, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GrammarSection } from '../../hooks/useGrammarStudioState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    activeSection: GrammarSection;
    onSectionChange: (section: GrammarSection) => void;
    hasStoryError: boolean;
    hasRulesError: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

interface NavItem {
    id: GrammarSection;
    label: string;
    description: string;
    Icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
    {
        id: 'story',
        label: 'Câu chuyện Ngữ cảnh',
        description: 'Đoạn truyện tình huống và bảng từ nổi bật',
        Icon: BookOpen,
    },
    {
        id: 'rules',
        label: 'Quy tắc Ngữ pháp',
        description: 'Công thức, ví dụ và động từ bất quy tắc',
        Icon: Ruler,
    },
    {
        id: 'practice',
        label: 'Luyện tập',
        description: 'Câu hỏi và cấu hình điểm qua',
        Icon: ClipboardList,
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const GrammarNavigator = memo(function GrammarNavigator({
    activeSection,
    onSectionChange,
    hasStoryError,
    hasRulesError,
}: Props) {
    const hasError: Record<GrammarSection, boolean> = {
        story: hasStoryError,
        rules: hasRulesError,
        practice: false,
    };

    return (
        <div className="flex h-full flex-col border-r bg-muted/20">
            {/* Header */}
            <div className="flex items-center gap-2 shrink-0 border-b px-3 py-2">
                <ClipboardList className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Nội dung bài học
                </span>
            </div>

            {/* Section List */}
            <nav className="flex-1 overflow-y-auto p-2" aria-label="Phần nội dung ngữ pháp">
                <ul className="space-y-1" role="list">
                    {NAV_ITEMS.map(({ id, label, description, Icon }) => {
                        const isActive = activeSection === id;
                        const hasErr = hasError[id];

                        return (
                            <li key={id}>
                                <button
                                    type="button"
                                    onClick={() => onSectionChange(id)}
                                    aria-current={isActive ? 'page' : undefined}
                                    aria-label={`${label}${hasErr ? ' — có lỗi cần sửa' : ''}`}
                                    className={cn(
                                        'group relative w-full rounded-md px-3 py-2.5 text-left transition-colors',
                                        isActive
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                    )}
                                >
                                    {/* Error dot */}
                                    {hasErr && (
                                        <span
                                            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive"
                                            aria-hidden="true"
                                        />
                                    )}

                                    <div className="flex items-start gap-2.5">
                                        <Icon
                                            className={cn(
                                                'mt-0.5 h-4 w-4 shrink-0',
                                                isActive
                                                    ? 'text-primary'
                                                    : 'text-muted-foreground group-hover:text-foreground',
                                            )}
                                            aria-hidden="true"
                                        />
                                        <div className="min-w-0">
                                            <p
                                                className={cn(
                                                    'text-sm font-medium leading-tight',
                                                    isActive ? 'text-primary' : '',
                                                )}
                                            >
                                                {label}
                                            </p>
                                            <p className="mt-0.5 text-xs text-muted-foreground">
                                                {description}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
});
