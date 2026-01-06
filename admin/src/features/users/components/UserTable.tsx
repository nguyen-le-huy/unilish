import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { User } from "../types";
import { UserActionMenu } from "./UserActionMenu";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";

interface UserTableProps {
    users: User[];
    loading: boolean;
    onEditSubscription: (user: User) => void;
    onEditRole: (user: User) => void;
    onViewDetails: (user: User) => void;
}

export function UserTable({ users, loading, onEditSubscription, onEditRole, onViewDetails }: UserTableProps) {
    if (loading) {
        return <div className="p-8 text-center">Đang tải dữ liệu...</div>;
    }

    if (users.length === 0) {
        return <div className="p-8 text-center text-muted-foreground">Không tìm thấy học viên nào.</div>;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Học viên</TableHead>
                        <TableHead>Gói cước</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Streak</TableHead>
                        <TableHead>Coins</TableHead>
                        <TableHead>Hoạt động</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user._id}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                                    <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col">
                                    <span className="font-medium">{user.fullName}</span>
                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                    {user.role === 'admin' && <Badge variant="secondary" className="w-fit mt-1 text-[10px]">Admin</Badge>}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <Badge
                                        variant={user.subscription.plan === 'PRO' ? 'default' : user.subscription.plan === 'PLUS' ? 'secondary' : 'outline'}
                                        className="w-fit"
                                    >
                                        {user.subscription.plan}
                                    </Badge>
                                    {user.subscription.status === 'expired' && (
                                        <span className="text-[10px] text-destructive font-medium">Hết hạn</span>
                                    )}
                                    {user.subscription.plan !== 'FREE' && user.subscription.endDate && (
                                        <span className="text-[10px] text-muted-foreground">
                                            Hết hạn: {format(new Date(user.subscription.endDate), 'dd/MM/yyyy')}
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="font-medium">{user.currentLevel}</div>
                            </TableCell>
                            <TableCell>
                                <div className="font-medium">🔥 {user.stats.streak} ngày</div>
                            </TableCell>
                            <TableCell>
                                <div className="text-muted-foreground text-sm">🪙 {user.stats.coins}</div>
                            </TableCell>
                            <TableCell>
                                <span className="text-xs text-muted-foreground">
                                    {user.lastActiveAt
                                        ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true, locale: vi })
                                        : 'Chưa hoạt động'}
                                </span>
                            </TableCell>
                            <TableCell>
                                <UserActionMenu
                                    user={user}
                                    onEditSubscription={onEditSubscription}
                                    onEditRole={onEditRole}
                                    onViewDetails={onViewDetails}
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
