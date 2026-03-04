import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { MoreHorizontal, Eye, Pencil, Archive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
    IQuestion,
    QuestionDifficulty,
    QuestionStatus,
} from '../../types';
import {
    QUESTION_STATUS_LABELS,
    QUESTION_DIFFICULTY_COLORS,
    QUESTION_SKILL_LABELS,
    QUESTION_STATUS_COLORS,
} from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortConfig = {
    field: string;
    order: 'asc' | 'desc';
};

export type ColumnAction = {
    onView: (question: IQuestion) => void;
    onEdit: (question: IQuestion) => void;
    onArchive: (question: IQuestion) => void;
    selectedIds: string[];
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: (ids: string[]) => void;
    questions: IQuestion[];
    sortConfig?: SortConfig;
    onSort: (field: string) => void;
};

// ─── Header with sort indicator ──────────────────────────────────────────────

interface SortableHeaderProps {
    label: string;
    field: string;
    sortConfig?: SortConfig;
    onSort: (field: string) => void;
}

export function SortableHeader({ label, field, sortConfig, onSort }: SortableHeaderProps) {
    const isActive = sortConfig?.field === field;
    const arrow = isActive ? (sortConfig?.order === 'asc' ? ' ↑' : ' ↓') : '';

    return (
        <button
            type="button"
            className={`flex items-center gap-1 font-medium text-xs uppercase tracking-wide hover:text-foreground transition-colors ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
            onClick={() => onSort(field)}
            aria-label={`Sắp xếp theo ${label}`}
        >
            {label}
            <span className="text-primary">{arrow}</span>
        </button>
    );
}

// ─── Cell renderers ───────────────────────────────────────────────────────────

export function DifficultyBadge({ difficulty }: { difficulty: QuestionDifficulty }) {
    return (
        <span
            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${QUESTION_DIFFICULTY_COLORS[difficulty] ?? 'bg-gray-100 text-gray-800'}`}
        >
            {difficulty}
        </span>
    );
}

export function StatusBadge({ status }: { status: QuestionStatus }) {
    return (
        <Badge variant={QUESTION_STATUS_COLORS[status] as 'default' | 'secondary' | 'outline' | 'destructive'}>
            {QUESTION_STATUS_LABELS[status]}
        </Badge>
    );
}

export function CorrectRateCell({ rate }: { rate?: number }) {
    if (rate === null || rate === undefined) {
        return <span className="text-muted-foreground text-xs">—</span>;
    }
    return (
        <div className="flex items-center gap-2 min-w-[80px]">
            <Progress value={rate} className="h-1.5 flex-1" aria-label={`Tỉ lệ đúng ${rate}%`} />
            <span className="text-xs text-muted-foreground w-8 text-right">{rate}%</span>
        </div>
    );
}

// ─── Row action menu ──────────────────────────────────────────────────────────

interface RowActionsProps {
    question: IQuestion;
    onView: (q: IQuestion) => void;
    onEdit: (q: IQuestion) => void;
    onArchive: (q: IQuestion) => void;
}

export function RowActions({ question, onView, onEdit, onArchive }: RowActionsProps) {
    return (
        <div className="flex items-center gap-1">
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onView(question)}
                        aria-label="Xem câu hỏi"
                    >
                        <Eye className="h-3.5 w-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Xem</TooltipContent>
            </Tooltip>

            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onEdit(question)}
                        aria-label="Sửa câu hỏi"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </Button>
                </TooltipTrigger>
                <TooltipContent>Sửa</TooltipContent>
            </Tooltip>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label="Thêm hành động"
                    >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem
                        onClick={() => onEdit(question)}
                    >
                        <Pencil className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => onArchive(question)}
                        className="text-destructive focus:text-destructive"
                        disabled={question.status === 'archived'}
                    >
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

// ─── Preview text ─────────────────────────────────────────────────────────────

export function StemPreview({ question }: { question: IQuestion }) {
    const text = question.stem?.text ?? '';
    const preview = text.length > 70 ? `${text.slice(0, 70)}…` : text;

    return (
        <div className="flex flex-col gap-0.5 max-w-xs">
            <span className="text-sm font-medium leading-snug line-clamp-2">
                {preview || <span className="text-muted-foreground italic">Không có text</span>}
            </span>
            <span className="text-xs text-muted-foreground">
                {QUESTION_SKILL_LABELS[question.skill]} {question.part ? `· Part ${question.part}` : ''}
            </span>
        </div>
    );
}

// ─── Relative time ────────────────────────────────────────────────────────────

export function RelativeTime({ date }: { date: string }) {
    return (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(date), { addSuffix: true, locale: vi })}
        </span>
    );
}
