import { memo } from 'react';
import { BookOpenText, BookMarked, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadingSection } from '../../hooks/useReadingStudioState';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    activeSection: ReadingSection;
    onSectionChange: (section: ReadingSection) => void;
    hasTextError: boolean;
}

// ─── Config ───────────────────────────────────────────────────────────────────

interface NavItem {
    id: ReadingSection;
    label: string;
    description: string;
    Icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
    {
        id: 'text',
        label: 'Văn bản Đọc hiểu',
        description: 'Soạn hoặc tạo bài đọc bằng AI',
        Icon: BookOpenText,
    },
    {
        id: 'glossary',
        label: 'Từ vựng (Glossary)',
        description: 'Các từ được đánh dấu trong bài đọc',
        Icon: BookMarked,
    },
    {
        id: 'practice',
        label: 'Luyện tập',
        description: 'Câu hỏi comprehension',
        Icon: ClipboardList,
    },
];

// ─── Component ────────────────────────────────────────────────────────────────

export const ReadingNavigator = memo(function ReadingNavigator({
    activeSection,
    onSectionChange,
    hasTextError,
}: Props) {
    const hasError: Record<ReadingSection, boolean> = {
        text: hasTextError,
        glossary: false,
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
            <nav className="flex-1 overflow-y-auto p-2" aria-label="Phần nội dung bài đọc">
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
                                                'mt-0.5 h-4 w-4 shrink-0 transition-colors',
                                                isActive
                                                    ? 'text-primary'
                                                    : 'text-muted-foreground group-hover:text-foreground',
                                            )}
                                            aria-hidden="true"
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium leading-none">
                                                {label}
                                            </p>
                                            <p className="mt-1 truncate text-xs leading-none opacity-70">
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
