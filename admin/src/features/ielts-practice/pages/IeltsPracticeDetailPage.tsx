/* ──────────────────────────────────────────────────────────────
 * IeltsPracticeDetailPage — View test detail, version history,
 * analytics, and manage status (FR-14, FR-17, FR-18)
 * ────────────────────────────────────────────────────────────── */

import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Edit, BarChart2, History, Send, Pause, Play, Archive, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/PageHeader';
import { IeltsStatusBadge } from '../components/StatusBadge/StatusBadge';
import { useIeltsPracticeTestDetail, useIeltsPracticeVersionHistory, useIeltsPracticeAnalytics } from '../hooks/use-ielts-practice-tests';
import { useUpdateIeltsPracticeStatus, useValidateIeltsPracticePublish } from '../hooks/use-ielts-practice-mutations';
import { SKILL_LABELS } from '../types';

const IeltsPracticeDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: test, isLoading, isError } = useIeltsPracticeTestDetail(id);
  const { data: history } = useIeltsPracticeVersionHistory(id);
  const { data: analytics } = useIeltsPracticeAnalytics(id);
  const { mutate: updateStatus, isPending: isStatusUpdating } = useUpdateIeltsPracticeStatus();
  const { mutate: validate, data: validation, isPending: isValidating } = useValidateIeltsPracticePublish();

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !test) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive font-medium">Không tìm thấy đề</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/ielts-practice')}>
          Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/ielts-practice')}
          className="gap-1 text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại danh sách
        </Button>
      </div>

      <div className="mb-1 flex items-center gap-2">
        <span className="capitalize text-sm text-muted-foreground">{SKILL_LABELS[test.skill]}</span>
        <span className="text-muted-foreground">·</span>
        <span className="font-mono text-xs text-muted-foreground">{test.questionType}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-sm text-muted-foreground">v{test.version}</span>
      </div>
      <PageHeader title={test.name}>
        <IeltsStatusBadge status={test.status} />
        <Button onClick={() => navigate(`/ielts-practice/${id}/edit`)} className="gap-2">
          <Edit className="h-4 w-4" />
          Chỉnh sửa
        </Button>
      </PageHeader>

      {/* ── Stats Grid ───────────────────────────────────── */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Thời lượng</p>
          <p className="text-xl font-bold">{test.durationMinutes} phút</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Lượt làm</p>
          <p className="text-xl font-bold">{analytics?.totalAttempts ?? test.attemptCount ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Hoàn thành</p>
          <p className="text-xl font-bold">
            {analytics
              ? `${(analytics.completionRate * 100).toFixed(0)}%`
              : '—'}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/20 p-4">
          <p className="text-xs text-muted-foreground">Điểm TB</p>
          <p className="text-xl font-bold">
            {analytics ? analytics.averageNormalizedScore.toFixed(2) : '—'}
          </p>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <section className="mt-6 rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Quản lý trạng thái</h2>
        <div className="flex flex-wrap gap-3">
          {test.status !== 'active' && (
            <Button
              onClick={() => validate(id!)}
              disabled={isValidating}
              variant="outline"
            >
              {isValidating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Kiểm tra publish
            </Button>
          )}
          {(test.status === 'draft' || test.status === 'paused' || test.status === 'archived') && (
            <Button
              onClick={() => updateStatus({ id: id!, payload: { status: 'active' } })}
              disabled={isStatusUpdating}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Publish
            </Button>
          )}
          {test.status === 'active' && (
            <Button
              variant="outline"
              onClick={() => updateStatus({ id: id!, payload: { status: 'paused' } })}
              disabled={isStatusUpdating}
              className="gap-2 text-yellow-700"
            >
              <Pause className="h-4 w-4" />
              Tạm dừng
            </Button>
          )}
          {test.status === 'paused' && (
            <Button
              variant="outline"
              onClick={() => updateStatus({ id: id!, payload: { status: 'active' } })}
              disabled={isStatusUpdating}
              className="gap-2 text-green-700"
            >
              <Play className="h-4 w-4" />
              Kích hoạt lại
            </Button>
          )}
          {(test.status === 'active' || test.status === 'paused') && (
            <Button
              variant="outline"
              onClick={() => {
                if (window.confirm('Lưu trữ đề này?'))
                  updateStatus({ id: id!, payload: { status: 'archived' } });
              }}
              disabled={isStatusUpdating}
              className="gap-2 text-destructive"
            >
              <Archive className="h-4 w-4" />
              Lưu trữ
            </Button>
          )}
        </div>

        {validation && (
          <div
            className={`mt-4 rounded-lg border p-4 ${
              validation.valid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
            }`}
          >
            <p className={`text-sm font-semibold ${validation.valid ? 'text-green-700' : 'text-red-700'}`}>
              {validation.valid ? '✓ Hợp lệ' : '✗ Lỗi'}
            </p>
            {validation.errors.length > 0 && (
              <ul className="mt-2 list-inside list-disc text-sm text-red-600">
                {validation.errors.map((err, i) => (
                  <li key={i}>
                    <span className="font-mono text-xs">{err.path}</span>: {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      {/* ── Version History ──────────────────────────────── */}
      <section className="mt-6 rounded-lg border p-6">
        <div className="mb-4 flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Lịch sử phiên bản</h2>
        </div>
        {history && history.length > 0 ? (
          <div className="space-y-2">
            {history.map((v) => (
              <div key={v._id} className="flex items-center justify-between rounded-lg border bg-muted/10 px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-mono text-xs">v{v.version}</Badge>
                  <IeltsStatusBadge status={v.status} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(v.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có lịch sử phiên bản.</p>
        )}
      </section>

      {/* ── Analytics ────────────────────────────────────── */}
      <section className="mt-6 rounded-lg border p-6">
        <div className="mb-4 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Thống kê</h2>
        </div>
        {analytics ? (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Tổng lượt làm</p>
              <p className="text-lg font-semibold">{analytics.totalAttempts}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Hoàn thành</p>
              <p className="text-lg font-semibold">{analytics.completedAttempts}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Thời gian TB</p>
              <p className="text-lg font-semibold">{Math.round(analytics.averageDurationSeconds / 60)} phút</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có dữ liệu thống kê.</p>
        )}
      </section>
    </div>
  );
};

export default IeltsPracticeDetailPage;
