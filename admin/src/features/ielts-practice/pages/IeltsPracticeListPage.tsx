/* ──────────────────────────────────────────────────────────────
 * IeltsPracticeListPage — Admin list/search/filter IELTS practice
 * FR-12: List with search/filter/skill/status/pagination
 * FR-17: Publish/pause/archive actions
 * FR-18: Version history & analytics access
 * ────────────────────────────────────────────────────────────── */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pencil,
  Eye,
  BarChart2,
  History,
  Send,
  Pause,
  Play,
  Archive,
  Trash2,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebounce } from '@/hooks/useDebounce';
import { IeltsStatusBadge } from '../components/StatusBadge/StatusBadge';
import { useIeltsPracticeTests } from '../hooks/use-ielts-practice-tests';
import {
  useHardDeleteIeltsPractice,
  useUpdateIeltsPracticeStatus,
  useValidateIeltsPracticePublish,
} from '../hooks/use-ielts-practice-mutations';
import {
  type AdminTestFilters,
  type IeltsSkill,
  type ContentStatus,
  SKILL_LABELS,
} from '../types';
import { VersionHistoryModal } from '../components/VersionHistoryModal/VersionHistoryModal';
import { AnalyticsModal } from '../components/AnalyticsModal/AnalyticsModal';

const PAGE_SIZE = 20;
const SKILL_OPTIONS: Array<IeltsSkill | 'all'> = ['all', 'listening', 'reading', 'writing', 'speaking'];
const STATUS_OPTIONS: Array<ContentStatus | 'all'> = ['all', 'draft', 'active', 'paused', 'archived'];

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 7 }).map((_, j) => (
        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
      ))}
    </TableRow>
  );
}

const IeltsPracticeListPage = () => {
  const navigate = useNavigate();

  // ── Filters ────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 350);
  const [skillFilter, setSkillFilter] = useState<IeltsSkill | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [page, setPage] = useState(1);

  const queryFilters = useMemo<AdminTestFilters>(
    () => ({
      page,
      limit: PAGE_SIZE,
      search: debouncedSearch || undefined,
      skill: skillFilter === 'all' ? undefined : skillFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }),
    [page, debouncedSearch, skillFilter, statusFilter],
  );

  // ── Data ───────────────────────────────────────────────
  const { data, isLoading, isError, error, refetch } = useIeltsPracticeTests(queryFilters);
  const { mutate: updateStatus, mutateAsync: updateStatusAsync } = useUpdateIeltsPracticeStatus();
  const validatePublish = useValidateIeltsPracticePublish();
  const { mutate: hardDeleteTest } = useHardDeleteIeltsPractice();

  // ── Modal states ───────────────────────────────────────
  const [historyTestId, setHistoryTestId] = useState<string | null>(null);
  const [analyticsTestId, setAnalyticsTestId] = useState<string | null>(null);

  const handleStatusChange = useCallback(
    (id: string, status: 'active' | 'paused' | 'archived') => {
      updateStatus({ id, payload: { status } });
    },
    [updateStatus],
  );

  const handlePublish = useCallback(
    async (id: string) => {
      const validation = await validatePublish.mutateAsync(id);
      if (!validation.valid) {
        const message = validation.errors
          .map((item) => `${item.path}: ${item.message}`)
          .join('\n');
        window.alert(`Đề chưa đủ điều kiện publish:\n${message}`);
        return;
      }
      await updateStatusAsync({ id, payload: { status: 'active' } });
    },
    [validatePublish, updateStatusAsync],
  );

  const handleHardDelete = useCallback(
    (id: string, title: string) => {
      if (!window.confirm(`Xoá vĩnh viễn đề "${title}"? Thao tác này không thể hoàn tác.`)) return;
      hardDeleteTest(id);
    },
    [hardDeleteTest],
  );

  const tests = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="IELTS Practice"
        description="Quản lý đề luyện IELTS theo kỹ năng"
      >
        <Button onClick={() => navigate('/ielts-practice/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          Tạo đề mới
        </Button>
      </PageHeader>

      {/* ── Filter bar ──────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm tiêu đề / slug…"
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <Select
          value={skillFilter}
          onValueChange={(v) => {
            setSkillFilter(v as typeof skillFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Kỹ năng" />
          </SelectTrigger>
          <SelectContent>
            {SKILL_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'Tất cả kỹ năng' : SKILL_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v as typeof statusFilter);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Trạng thái" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s === 'all' ? 'Tất cả trạng thái' : s.charAt(0).toUpperCase() + s.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Error state ─────────────────────────────────── */}
      {isError && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center">
          <p className="font-medium text-destructive">Không thể tải danh sách</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {(error as Error)?.message ?? 'Vui lòng thử lại sau.'}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────── */}
      {!isError && (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Kỹ năng</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Phiên bản</TableHead>
                <TableHead>Lượt làm</TableHead>
                <TableHead>Cập nhật</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : tests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground text-sm">Chưa có đề luyện IELTS nào</p>
                      <p className="text-muted-foreground text-xs">Thử thay đổi bộ lọc hoặc tạo đề mới</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                tests.map((test) => (
                  <TableRow key={test._id} className="hover:bg-muted/40">
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">{test.name}</span>
                        <span className="text-muted-foreground text-xs">{test.slug}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {SKILL_LABELS[test.skill]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {test.questionType}
                    </TableCell>
                    <TableCell>
                      <IeltsStatusBadge status={test.status} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        v{test.version}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {test.attemptCount ?? 0}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(test.updatedAt).toLocaleDateString('vi-VN')}
                    </TableCell>

                    {/* ── Actions dropdown ───────────────── */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Hành động</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => navigate(`/ielts-practice/${test._id}/edit`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Chỉnh sửa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/ielts-practice/${test._id}`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Xem chi tiết
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAnalyticsTestId(test._id)}>
                            <BarChart2 className="mr-2 h-4 w-4" />
                            Thống kê
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setHistoryTestId(test._id)}>
                            <History className="mr-2 h-4 w-4" />
                            Lịch sử phiên bản
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(test.status === 'draft' || test.status === 'archived') && (
                            <DropdownMenuItem
                              onClick={() => void handlePublish(test._id)}
                              className="text-green-700"
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {test.status === 'active' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(test._id, 'paused')}
                              className="text-yellow-700"
                            >
                              <Pause className="mr-2 h-4 w-4" />
                              Tạm dừng
                            </DropdownMenuItem>
                          )}
                          {test.status === 'paused' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(test._id, 'active')}
                              className="text-green-700"
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Kích hoạt lại
                            </DropdownMenuItem>
                          )}
                          {test.status !== 'archived' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(test._id, 'archived')}
                              className="text-destructive focus:text-destructive"
                            >
                              <Archive className="mr-2 h-4 w-4" />
                              Lưu trữ
                            </DropdownMenuItem>
                          )}
                          {(test.status === 'draft' || test.status === 'archived') && (test.attemptCount ?? 0) === 0 && (
                            <DropdownMenuItem
                              onClick={() => handleHardDelete(test._id, test.name)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Xóa vĩnh viễn
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Trang {page} / {totalPages} · {data?.total ?? 0} đề
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Modals ──────────────────────────────────────── */}
      <VersionHistoryModal testId={historyTestId} onClose={() => setHistoryTestId(null)} />
      <AnalyticsModal testId={analyticsTestId} onClose={() => setAnalyticsTestId(null)} />
    </div>
  );
};

export default IeltsPracticeListPage;
