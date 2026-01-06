import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { User } from "../types";
import { useUpdateRole } from "../hooks/useUsers";
import { useState, useEffect } from "react";

interface UserRoleModalProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserRoleModal({ user, open, onOpenChange }: UserRoleModalProps) {
    const [role, setRole] = useState<User["role"]>("student");

    const updateRole = useUpdateRole();

    useEffect(() => {
        if (user) {
            setRole(user.role);
        }
    }, [user]);

    const handleSave = () => {
        if (!user) return;
        updateRole.mutate(
            { id: user._id, payload: { role } },
            {
                onSuccess: () => {
                    onOpenChange(false);
                },
            }
        );
    };

    if (!user) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Phân quyền người dùng</DialogTitle>
                    <DialogDescription>
                        Thay đổi quyền hạn truy cập hệ thống cho {user.fullName}.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-medium">Vai trò</label>
                        <Select
                            value={role}
                            onValueChange={(value) => setRole(value as User["role"])}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn vai trò" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="student">Học viên (Student)</SelectItem>
                                <SelectItem value="content_creator">Nội dung (Content Creator)</SelectItem>
                                <SelectItem value="admin">Quản trị viên (Admin)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                            * Admin: Toàn quyền hệ thống.
                            <br />* Content Creator: Quản lý khóa học, bài học.
                            <br />* Student: Chỉ có quyền học tập.
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Hủy
                    </Button>
                    <Button onClick={handleSave} disabled={updateRole.isPending}>
                        {updateRole.isPending ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
