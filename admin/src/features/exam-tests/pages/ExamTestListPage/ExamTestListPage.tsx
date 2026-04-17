import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    GraduationCap,
    Plus,
    Search,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDebounce } from '@/hooks/useDebounce';
import { EXAM_FORMAT_LABELS, EXAM_STATUS_LABELS } from '../../constants';
import { AnalyticsModal } from '../../components/AnalyticsModal/AnalyticsModal';
import { ExamTestTable } from '../../components/ExamTestTable/ExamTestTable';
import { VersionHistoryModal } from '../../components/VersionHistoryModal/VersionHistoryModal';
import { useExamTests } from '../../hooks/useExamTests';
import { useUpdateExamTestStatus } from '../../hooks/useExamTestMutations';
import type { ExamFormat, ExamTestStatus, IExamTestFilters } from '../../types';

const PAGE_SIZE = 20;

export default function ExamTestListPage() {
    const navigate = useNavigate();

    const [formatFilter, setFormatFilter] = useState<ExamFormat | 'all'>('all');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, 350);
    const [statusFilter, setStatusFilter] = useState<ExamTestStatus | 'all'>('all');
    const [page, setPage] = useState(1);

    const [analyticsId, setAnalyticsId] = useState<string | null>(null);
    const [historyId, setHistoryId] = useState<string | null>(null);

    const filters = useMemo<IExamTestFilters>(
        () => ({
            page,
            limit: PAGE_SIZE,
            search: debouncedSearch || undefined,
            format: formatFilter === 'all' ? undefined : formatFilter,
            status: statusFilter === 'all' ? undefined : statusFilter,
        }),
        [page, debouncedSearch, formatFilter, statusFilter],
    );

    const { data, isLoading } = useExamTests(filters);
    const { mutate: updateStatus } = useUpdateExamTestStatus();

    const totalPages = data?.totalPages ?? 1;

    return (
        <div className="flex flex-col gap-6 p-6">
            <PageHeader
                title="Quản lý Bài Thi"
                description="Quản lý đề thi thử TOEIC L&R và IELTS theo chuẩn quốc tế."
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Tạo bài thi
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => navigate('/exam-tests/create/toeic')}>
                            <BookOpen className="mr-2 h-4 w-4 text-amber-600" />
                            Đề thi TOEIC L&R
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exam-tests/create?format=ielts')}>
                            <GraduationCap className="mr-2 h-4 w-4 text-purple-600" />
                            Đề thi IELTS
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </PageHeader>

            <Tabs
                value={formatFilter}
                onValueChange={(value) => {
                    setFormatFilter(value as ExamFormat | 'all');
                    setPage(1);
                }}
            >
                <TabsList>
                    {(['all', 'toeic_lr', 'ielts'] as const).map((format) => (
                        <TabsTrigger key={format} value={format}>
                            {EXAM_FORMAT_LABELS[format]}
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        className="pl-9"
                        placeholder="Tìm tên đề thi..."
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                    />
                </div>
                <Select
                    value={statusFilter}
                    onValueChange={(value) => {
                        setStatusFilter(value as ExamTestStatus | 'all');
                        setPage(1);
                    }}
                >
                    <SelectTrigger className="w-44">
                        <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {(Object.entries(EXAM_STATUS_LABELS) as [ExamTestStatus, string][]).map(
                            ([status, label]) => (
                                <SelectItem key={status} value={status}>
                                    {label}
                                </SelectItem>
                            ),
                        )}
                    </SelectContent>
                </Select>
            </div>

            <ExamTestTable
                data={data?.data ?? []}
                isLoading={isLoading}
                onUpdateStatus={(id, status) => updateStatus({ id, payload: { status } })}
                onOpenVersionHistory={setHistoryId}
                onOpenAnalytics={setAnalyticsId}
            />

            {totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                        Trang {page}/{totalPages} · {data?.total ?? 0} bài thi
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((prev) => prev - 1)}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((prev) => prev + 1)}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <AnalyticsModal testId={analyticsId} onClose={() => setAnalyticsId(null)} />
            <VersionHistoryModal testId={historyId} onClose={() => setHistoryId(null)} />
        </div>
    );
}
