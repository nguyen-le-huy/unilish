import { BarChart2, TrendingDown, Clock, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useIeltsPracticeAnalytics } from '../../hooks/use-ielts-practice-tests';

interface Props {
  testId: string | null;
  onClose: () => void;
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

export function AnalyticsModal({ testId, onClose }: Props) {
  const open = !!testId;
  const { data, isLoading } = useIeltsPracticeAnalytics(testId ?? '');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5" />
            Thống kê bài luyện
          </DialogTitle>
          <DialogDescription>
            Dữ liệu tổng hợp từ các lượt làm bài của học viên.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : data ? (
          <div className="mt-4 grid grid-cols-2 gap-4">
            <StatCard label="Tổng lượt làm" value={data.totalAttempts} icon={Users} />
            <StatCard label="Hoàn thành" value={data.completedAttempts} icon={BarChart2} />
            <StatCard
              label="Tỉ lệ hoàn thành"
              value={`${(data.completionRate * 100).toFixed(1)}%`}
              icon={BarChart2}
            />
            <StatCard label="Điểm TB" value={data.averageNormalizedScore.toFixed(2)} icon={BarChart2} />
            <StatCard
              label="Thời gian TB"
              value={`${Math.round(data.averageDurationSeconds / 60)} phút`}
              icon={Clock}
            />
            <StatCard label="Lỗi chấm" value={data.gradingFailed} icon={TrendingDown} />
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có dữ liệu thống kê.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
