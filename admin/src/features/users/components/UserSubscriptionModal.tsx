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
import { useUpdateSubscription } from "../hooks/useUsers";
import { useState, useEffect } from "react";

interface UserSubscriptionModalProps {
    user: User | null;
    open: boolean;
    onClose: () => void;
}

export function UserSubscriptionModal({ user, open, onClose }: UserSubscriptionModalProps) {
    const { mutate: updateSubscription, isPending } = useUpdateSubscription();
    const [plan, setPlan] = useState<"FREE" | "PLUS" | "PRO">("FREE");
    const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");

    useEffect(() => {
        if (user) {
            setPlan(user.subscription.plan);
            // Default period to monthly as we don't track period in User model explicitly for UI default
            // unless we prefer yearly.
        }
    }, [user]);

    const handleSubmit = () => {
        if (!user) return;
        updateSubscription(
            { id: user._id, payload: { plan, period } },
            {
                onSuccess: () => {
                    onClose();
                },
            }
        );
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Cập nhật gói cước</DialogTitle>
                    <DialogDescription>
                        Thay đổi gói cước cho học viên <b>{user?.email}</b>.
                        <br />
                        Hành động này sẽ cập nhật trạng thái gói thành Active ngay lập tức.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm font-medium">Gói cước</label>
                        <Select value={plan} onValueChange={(v) => setPlan(v as "FREE" | "PLUS" | "PRO")}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Chọn gói" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="FREE">FREE (Miễn phí)</SelectItem>
                                <SelectItem value="PLUS">PLUS (Cơ bản)</SelectItem>
                                <SelectItem value="PRO">PRO (Nâng cao)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <label className="text-right text-sm font-medium">Thời hạn</label>
                        <Select value={period} onValueChange={(v) => setPeriod(v as "monthly" | "yearly")}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Chọn thời hạn" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="monthly">1 Tháng (+30 ngày)</SelectItem>
                                <SelectItem value="yearly">1 Năm (+365 ngày)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button onClick={handleSubmit} disabled={isPending}>
                        {isPending ? "Đang xử lý..." : "Lưu thay đổi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
