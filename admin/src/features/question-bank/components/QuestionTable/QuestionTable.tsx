import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import type { IQuestion } from '../../types';
import {
    SortableHeader,
    StatusBadge,
    DifficultyBadge,
    CorrectRateCell,
    RowActions,
    StemPreview,
    RelativeTime,
    type SortConfig,
} from './columns';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    data: IQuestion[];
    isLoading: boolean;
    selectedIds: string[];
    sortConfig?: SortConfig;
    onSort: (field: string) => void;
    onToggleSelect: (id: string) => void;
    onToggleSelectAll: (ids: string[]) => void;
    onView: (question: IQuestion) => void;
    onEdit: (question: IQuestion) => void;
    onArchive: (question: IQuestion) => void;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow({ index }: { index: number }) {
    return (
        <TableRow key={index}>
            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
            <TableCell><Skeleton className="h-4 w-5" /></TableCell>
            <TableCell>
                <div className="flex flex-col gap-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                </div>
            </TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16" /></TableCell>
            <TableCell><Skeleton className="h-5 w-14" /></TableCell>
            <TableCell><Skeleton className="h-3 w-20" /></TableCell>
            <TableCell><Skeleton className="h-4 w-16" /></TableCell>
            <TableCell><Skeleton className="h-7 w-20" /></TableCell>
        </TableRow>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
    return (
        <TableRow>
            <TableCell colSpan={9} className="h-40 text-center">
                <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground text-sm">Không tìm thấy câu hỏi nào</p>
                    <p className="text-muted-foreground text-xs">Thử thay đổi bộ lọc hoặc tạo câu hỏi mới</p>
                </div>
            </TableCell>
        </TableRow>
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function QuestionTable({
    data,
    isLoading,
    selectedIds,
    sortConfig,
    onSort,
    onToggleSelect,
    onToggleSelectAll,
    onView,
    onEdit,
    onArchive,
}: Props) {
    const allPageIds = data.map((q) => q._id);
    const isAllSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.includes(id));
    const isIndeterminate = !isAllSelected && allPageIds.some((id) => selectedIds.includes(id));

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        {/* Select all */}
                        <TableHead className="w-10 px-4">
                            <Checkbox
                                checked={isIndeterminate ? 'indeterminate' : isAllSelected}
                                onCheckedChange={(checked) => {
                                    if (checked) {
                                        onToggleSelectAll(allPageIds);
                                    } else {
                                        onToggleSelectAll([]);
                                    }
                                }}
                                aria-label="Chọn tất cả"
                            />
                        </TableHead>
                        {/* # */}
                        <TableHead className="w-10 text-muted-foreground text-xs">#</TableHead>
                        {/* Stem */}
                        <TableHead className="min-w-[240px]">
                            <SortableHeader label="Câu hỏi" field="stem.text" sortConfig={sortConfig} onSort={onSort} />
                        </TableHead>
                        {/* Difficulty */}
                        <TableHead className="w-24">
                            <SortableHeader label="Độ khó" field="difficulty" sortConfig={sortConfig} onSort={onSort} />
                        </TableHead>
                        {/* Status */}
                        <TableHead className="w-28">
                            <SortableHeader label="Trạng thái" field="status" sortConfig={sortConfig} onSort={onSort} />
                        </TableHead>
                        {/* Usage */}
                        <TableHead className="w-16">
                            <SortableHeader label="Lần dùng" field="usageCount" sortConfig={sortConfig} onSort={onSort} />
                        </TableHead>
                        {/* Correct rate */}
                        <TableHead className="w-28">
                            <SortableHeader label="Tỉ lệ đúng" field="avgCorrectRate" sortConfig={sortConfig} onSort={onSort} />
                        </TableHead>
                        {/* Updated */}
                        <TableHead className="w-32">
                            <SortableHeader label="Cập nhật" field="updatedAt" sortConfig={sortConfig} onSort={onSort} />
                        </TableHead>
                        {/* Actions */}
                        <TableHead className="w-24 text-right pr-4">
                            <span className="sr-only">Hành động</span>
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {isLoading
                        ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} index={i} />)
                        : data.length === 0
                        ? <EmptyState />
                        : data.map((question, index) => (
                            <TableRow
                                key={question._id}
                                data-state={selectedIds.includes(question._id) ? 'selected' : undefined}
                                className="group"
                            >
                                {/* Checkbox */}
                                <TableCell className="px-4">
                                    <Checkbox
                                        checked={selectedIds.includes(question._id)}
                                        onCheckedChange={() => onToggleSelect(question._id)}
                                        aria-label={`Chọn câu hỏi ${index + 1}`}
                                    />
                                </TableCell>
                                {/* Row number */}
                                <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                                {/* Stem preview */}
                                <TableCell>
                                    <StemPreview question={question} />
                                </TableCell>
                                {/* Difficulty */}
                                <TableCell>
                                    <DifficultyBadge difficulty={question.difficulty} />
                                </TableCell>
                                {/* Status */}
                                <TableCell>
                                    <StatusBadge status={question.status} />
                                </TableCell>
                                {/* Usage count */}
                                <TableCell className="text-sm tabular-nums">
                                    {question.usageCount ?? 0}
                                </TableCell>
                                {/* Correct rate */}
                                <TableCell>
                                    <CorrectRateCell rate={question.avgCorrectRate} />
                                </TableCell>
                                {/* Updated */}
                                <TableCell>
                                    <RelativeTime date={question.updatedAt} />
                                </TableCell>
                                {/* Actions */}
                                <TableCell className="text-right pr-2">
                                    <RowActions
                                        question={question}
                                        onView={onView}
                                        onEdit={onEdit}
                                        onArchive={onArchive}
                                    />
                                </TableCell>
                            </TableRow>
                        ))
                    }
                </TableBody>
            </Table>
        </div>
    );
}
