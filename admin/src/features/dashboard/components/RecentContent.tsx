import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, FileText, Youtube, Newspaper } from "lucide-react"

interface ContentItem {
    id: string
    title: string
    type: 'course' | 'lesson' | 'video' | 'news'
    status: 'published' | 'draft' | 'pending'
    updatedAt: string
    author: string
}

// Mock data
const recentContent: ContentItem[] = [
    { id: '1', title: 'IELTS Speaking Part 2 - Describe a Person', type: 'lesson', status: 'published', updatedAt: '10 phút trước', author: 'Admin' },
    { id: '2', title: 'TED Talk: The Power of Vulnerability', type: 'video', status: 'pending', updatedAt: '30 phút trước', author: 'Content Editor' },
    { id: '3', title: 'CNN News: Climate Change Impact', type: 'news', status: 'draft', updatedAt: '1 giờ trước', author: 'AI Generated' },
    { id: '4', title: 'Unit 5: Business English - Meetings', type: 'course', status: 'published', updatedAt: '2 giờ trước', author: 'Admin' },
    { id: '5', title: 'Grammar: Past Perfect Tense', type: 'lesson', status: 'published', updatedAt: '3 giờ trước', author: 'Content Editor' },
]

const typeIcons = {
    course: BookOpen,
    lesson: FileText,
    video: Youtube,
    news: Newspaper,
}

const typeLabels = {
    course: 'Khóa học',
    lesson: 'Bài học',
    video: 'Video',
    news: 'Tin tức',
}

const statusColors = {
    published: 'bg-green-100 text-green-800',
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
}

const statusLabels = {
    published: 'Đã xuất bản',
    draft: 'Bản nháp',
    pending: 'Chờ duyệt',
}

export function RecentContent() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Nội dung mới cập nhật</CardTitle>
                <CardDescription>Các bài học, video, tin tức gần đây</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recentContent.map((item) => {
                        const Icon = typeIcons[item.type]
                        return (
                            <div key={item.id} className="flex items-center gap-4">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <p className="text-sm font-medium leading-none truncate max-w-[200px]">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {typeLabels[item.type]} • {item.author}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className={statusColors[item.status]}>
                                        {statusLabels[item.status]}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {item.updatedAt}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
    )
}
