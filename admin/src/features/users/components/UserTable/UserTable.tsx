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
import { Loading } from "@/components/common/Loading";
import type { User } from "../../types/users.types";
import { UserActionMenu } from "../UserActionMenu/UserActionMenu";
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
        return <Loading className="p-8" />;
    }

    if (!users || users.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-muted/10 rounded-lg border border-dashed">
                <p className="text-muted-foreground text-sm">Không tìm thấy học viên nào khớp với bộ lọc.</p>
            </div>
        );
    }

    return (
        <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Tài khoản</TableHead>
                        <TableHead>Vai trò</TableHead>
                        <TableHead>Gói cước</TableHead>
                        <TableHead>Mục tiêu & Level</TableHead>
                        <TableHead>Hoạt động</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => {
                        const subscriptionPlan = user.subscription?.plan ?? 'FREE';
                        const subscriptionStatus = user.subscription?.status ?? 'active';

                        const learningGoalLabels: Record<string, string> = {
                            general_communication: 'Giao tiếp',
                            exam_thptqg: 'THPTQG',
                            exam_ielts: 'IELTS',
                            exam_toeic: 'TOEIC',
                            business_work: 'Công việc',
                            travel_survival: 'Du lịch',
                        };

                        const goalLabel = user.learningGoal ? (learningGoalLabels[user.learningGoal] || user.learningGoal) : 'Chưa chọn';

                        return (
                            <TableRow key={user._id} className="hover:bg-muted/50 transition-colors">
                                <TableCell>
                                    <Avatar className="h-9 w-9 border border-border">
                                        <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                            {user.fullName?.charAt(0).toUpperCase() || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="font-medium text-sm text-foreground">{user.fullName || 'Unknown User'}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{user.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="secondary" className="capitalize font-normal">
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1.5">
                                        <Badge
                                            variant={subscriptionPlan === 'PREMIUM' ? 'default' : 'outline'}
                                            className="w-fit capitalize shadow-none font-medium"
                                        >
                                            {subscriptionPlan.toLowerCase()}
                                        </Badge>

                                        {subscriptionStatus === 'expired' && (
                                            <span className="text-[10px] text-destructive font-medium flex items-center gap-1">
                                                <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
                                                Hết hạn
                                            </span>
                                        )}

                                        {subscriptionPlan !== 'FREE' && user.subscription?.endDate && (
                                            <span className="text-[10px] text-muted-foreground">
                                                Exp: {format(new Date(user.subscription.endDate), 'dd/MM/yyyy')}
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1">
                                        <Badge variant="outline" className="w-fit font-mono text-xs shadow-none">
                                            {user.currentLevel || 'A0'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-medium line-clamp-1" title={goalLabel}>
                                            {goalLabel}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-sm font-medium">
                                            {user.lastActiveAt
                                                ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true, locale: vi })
                                                : 'Chưa hoạt động'}
                                        </span>
                                        {user.lastActiveAt && (
                                            <span className="text-[10px] text-muted-foreground hidden group-hover:block">
                                                {format(new Date(user.lastActiveAt), "HH:mm dd/MM/yyyy")}
                                            </span>
                                        )}
                                    </div>
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
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
