import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface RecentUser {
    id: string
    name: string
    email: string
    avatar?: string
    plan: 'free' | 'plus' | 'pro'
    joinedAt: string
}

// Mock data
const recentUsers: RecentUser[] = [
    { id: '1', name: 'Nguyễn Văn A', email: 'nguyenvana@gmail.com', plan: 'pro', joinedAt: '2 phút trước' },
    { id: '2', name: 'Trần Thị B', email: 'tranthib@gmail.com', plan: 'plus', joinedAt: '15 phút trước' },
    { id: '3', name: 'Lê Văn C', email: 'levanc@gmail.com', plan: 'free', joinedAt: '1 giờ trước' },
    { id: '4', name: 'Phạm Thị D', email: 'phamthid@gmail.com', plan: 'pro', joinedAt: '2 giờ trước' },
    { id: '5', name: 'Hoàng Văn E', email: 'hoangvane@gmail.com', plan: 'free', joinedAt: '3 giờ trước' },
]

const planColors = {
    free: 'bg-gray-100 text-gray-800',
    plus: 'bg-blue-100 text-blue-800',
    pro: 'bg-purple-100 text-purple-800',
}

const planLabels = {
    free: 'Free',
    plus: 'Plus',
    pro: 'Pro',
}

export function RecentUsers() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Học viên mới đăng ký</CardTitle>
                <CardDescription>5 học viên mới nhất trong hệ thống</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {recentUsers.map((user) => (
                        <div key={user.id} className="flex items-center gap-4">
                            <Avatar className="h-9 w-9">
                                <AvatarImage src={user.avatar} alt={user.name} />
                                <AvatarFallback>
                                    {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1 min-w-0">
                                <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className={planColors[user.plan]}>
                                    {planLabels[user.plan]}
                                </Badge>
                                <span className="text-xs text-muted-foreground hidden sm:inline-block">{user.joinedAt}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
