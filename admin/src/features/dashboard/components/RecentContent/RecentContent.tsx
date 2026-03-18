import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/common/Loading";
import { BookOpen, FileText, Youtube, Newspaper } from "lucide-react";
import { useRecentContent } from "../../hooks/useDashboardData";

const typeIcons = {
    course: BookOpen,
    lesson: FileText,
    video: Youtube,
    news: Newspaper,
};

const typeLabels = {
    course: 'Khóa học',
    lesson: 'Bài học',
    video: 'Video',
    news: 'Tin tức',
};

const statusColors = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
};

const statusLabels = {
    published: 'Đã xuất bản',
    draft: 'Bản nháp',
    pending: 'Chờ duyệt',
};

export function RecentContent() {
    const { data: recentContent, isLoading, isError } = useRecentContent();

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Nội dung mới cập nhật</CardTitle>
                    <CardDescription>
                        <Loading size="sm" className="justify-start" />
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (isError || !recentContent) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Nội dung mới cập nhật</CardTitle>
                    <CardDescription>Không thể tải dữ liệu</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nội dung mới cập nhật</CardTitle>
                <CardDescription>Các bài học, video, tin tức gần đây</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recentContent.map((item) => {
                        const Icon = typeIcons[item.type];
                        return (
                            <div key={item.id} className="flex items-center gap-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 space-y-1 min-w-0">
                                    <p className="text-sm font-medium leading-none truncate block">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {typeLabels[item.type]} • {item.author}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="outline" className={statusColors[item.status]}>
                                        {statusLabels[item.status]}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap hidden sm:inline-block">
                                        {item.updatedAt}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
