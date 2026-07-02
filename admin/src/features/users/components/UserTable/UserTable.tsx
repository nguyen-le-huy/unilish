import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/common/Loading";
import type { User } from "../../types/users.types";
import { UserActionMenu } from "../UserActionMenu/UserActionMenu";
import { formatDistanceToNow, format } from "date-fns";
import { vi } from "date-fns/locale";
import { useLearningGoals } from "@/features/curriculum/goals";

interface UserTableProps {
    users: User[];
    loading: boolean;
    onEditRole: (user: User) => void;
    onViewDetails: (user: User) => void;
}

const learningGoalLabels: Record<string, string> = {
    general_communication: 'Giao tiếp',
    exam_thptqg: 'THPTQG',
    exam_ielts: 'IELTS',
    exam_toeic: 'TOEIC',
    business_work: 'Công việc',
    travel_survival: 'Du lịch',
};

const normalizeGoal = (goal: string | null | undefined): string | null => {
    if (!goal || !goal.trim()) return null;
    return learningGoalLabels[goal] ?? goal;
};

export function UserTable({ users, loading, onEditRole, onViewDetails }: UserTableProps) {
    const { data: learningGoalsResponse } = useLearningGoals({ page: 1, limit: 100 });
    const learningGoalTitleById = useMemo(() => {
        const map = new Map<string, string>();
        const goals = learningGoalsResponse?.data ?? [];

        goals.forEach((goal) => {
            map.set(goal._id, goal.title);
        });

        return map;
    }, [learningGoalsResponse?.data]);

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
                        <TableHead>Mục tiêu & Level</TableHead>
                        <TableHead>Hoạt động</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => {
                        const learningGoalFromProfile = user.learningGoal ? normalizeGoal(user.learningGoal) : null;
                        const learningGoalFromRef =
                            typeof user.learningGoalId === 'object' && user.learningGoalId
                                ? normalizeGoal(user.learningGoalId.slug ?? user.learningGoalId.title)
                                : null;
                        const learningGoalFromId =
                            typeof user.learningGoalId === 'string'
                                ? learningGoalTitleById.get(user.learningGoalId) ?? null
                                : null;

                        const goalLabel = learningGoalFromProfile ?? learningGoalFromRef ?? learningGoalFromId ?? 'Chưa chọn';

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
