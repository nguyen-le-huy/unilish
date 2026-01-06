import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, CreditCard, Ban, Users as UsersIcon, Eye } from "lucide-react";
import type { User } from "../types";

interface UserActionMenuProps {
    user: User;
    onEditSubscription: (user: User) => void;
    onEditRole: (user: User) => void;
    onViewDetails: (user: User) => void;
}

export function UserActionMenu({ user, onEditSubscription, onEditRole, onViewDetails }: UserActionMenuProps) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                    <span className="sr-only">Open menu</span>
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onViewDetails(user)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Xem chi tiết
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEditSubscription(user)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Đổi gói cước
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditRole(user)}>
                    <UsersIcon className="mr-2 h-4 w-4" />
                    Phân quyền
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                    <Ban className="mr-2 h-4 w-4" />
                    Khóa tài khoản
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
