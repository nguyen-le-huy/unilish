import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useEffect } from "react";
import type { ICoupon } from "../../types/coupon.types";
import { EDiscountType, EPlanScope } from "../../types/coupon.types";
import { useForm, Controller } from "react-hook-form";
import { useCreateCoupon, useUpdateCoupon } from "../../hooks/useCouponData";

interface Props {
    open: boolean;
    onClose: () => void;
    couponToEdit?: ICoupon | null;
    onSuccess: () => void;
}

export function CouponFormModal({ open, onClose, couponToEdit, onSuccess }: Props) {
    const defaultValues = {
        code: "",
        description: "",
        discountType: EDiscountType.FIXED_AMOUNT,
        value: 0,
        appliesToPlans: EPlanScope.ALL,
        usageLimit: null as number | null,
        minOrderValue: 0,
        expiryDate: "",
        isActive: true,
    };

    const createCoupon = useCreateCoupon();
    const updateCoupon = useUpdateCoupon();

    const { register, handleSubmit, reset, control, watch } = useForm({
        defaultValues
    });

    useEffect(() => {
        if (couponToEdit) {
            reset({
                ...couponToEdit,
                appliesToPlans: couponToEdit.appliesToPlans[0] || EPlanScope.ALL, // Simplify to single select for MVP
                expiryDate: couponToEdit.expiryDate ? new Date(couponToEdit.expiryDate).toISOString().split('T')[0] : ""
            });
        } else {
            reset(defaultValues);
        }
    }, [couponToEdit, open]);

    const onSubmit = async (data: any) => {
        const payload = {
            ...data,
            appliesToPlans: [data.appliesToPlans],
            value: Number(data.value),
            minOrderValue: Number(data.minOrderValue),
            usageLimit: data.usageLimit ? Number(data.usageLimit) : null,
            expiryDate: data.expiryDate ? new Date(data.expiryDate) : null
        };

        if (couponToEdit) {
            await updateCoupon.mutateAsync({ id: couponToEdit._id, data: payload });
        } else {
            await createCoupon.mutateAsync(payload);
        }

        onSuccess();
        onClose();
    };

    const isLoading = createCoupon.isPending || updateCoupon.isPending;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{couponToEdit ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
                    <DialogDescription>
                        Set up discount codes for marketing campaigns.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Mã giảm giá (Code)</Label>
                            <Input
                                id="code"
                                placeholder="VD: TET2026"
                                {...register("code", { required: true })}
                                className="uppercase"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="isActive">Trạng thái</Label>
                            <div className="flex items-center space-x-2 pt-2">
                                <Controller
                                    name="isActive"
                                    control={control}
                                    render={({ field }) => (
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    )}
                                />
                                <span className="text-sm text-muted-foreground">
                                    {watch("isActive") ? "Đang hoạt động" : "Tạm dừng"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Mô tả (Nội bộ)</Label>
                        <Input
                            id="description"
                            placeholder="VD: Dành cho sinh viên mới nhập học"
                            {...register("description")}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Loại giảm giá</Label>
                            <Controller
                                name="discountType"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={EDiscountType.FIXED_AMOUNT}>Giảm tiền mặt (VND)</SelectItem>
                                            <SelectItem value={EDiscountType.PERCENTAGE}>Giảm theo %</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Giá trị giảm</Label>
                            <Input
                                type="number"
                                placeholder="VD: 50000 hoặc 20"
                                {...register("value", { required: true, min: 0 })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Áp dụng cho gói</Label>
                            <Controller
                                name="appliesToPlans"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={EPlanScope.ALL}>Tất cả các gói</SelectItem>
                                            <SelectItem value={EPlanScope.MONTHLY}>Chỉ gói Tháng</SelectItem>
                                            <SelectItem value={EPlanScope.YEARLY}>Chỉ gói Năm</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Giá trị đơn tối thiểu</Label>
                            <Input
                                type="number"
                                placeholder="0 = Không yêu cầu"
                                {...register("minOrderValue")}
                            />
                            <p className="text-[10px] text-muted-foreground">Đơn hàng phải &ge; mức này mới được dùng mã.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Giới hạn lượt dùng</Label>
                            <Input
                                type="number"
                                {...register("usageLimit")}
                                placeholder="Để trống = Vô hạn"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ngày hết hạn</Label>
                            <Input
                                type="date"
                                {...register("expiryDate")}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose}>
                            Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? "Đang lưu..." : (couponToEdit ? "Cập nhật" : "Tạo mã")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
