import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useCouponStats, useCoupons, useDeleteCoupon } from "../../hooks/useCouponData";
import { CouponStats } from "../../components/CouponStats/CouponStats";
import { CouponTable } from "../../components/CouponTable/CouponTable";
import { CouponFormModal } from "../../components/CouponFormModal/CouponFormModal";
import type { ICoupon } from "../../types/coupon.types";

export default function CouponPage() {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<ICoupon | null>(null);

    // Use TanStack Query hooks
    const { data: stats, isLoading: statsLoading } = useCouponStats();
    const { data: coupons = [], isLoading: couponsLoading } = useCoupons();
    const deleteCoupon = useDeleteCoupon();

    const handleCreate = () => {
        setEditingCoupon(null);
        setIsModalOpen(true);
    };

    const handleEdit = (coupon: ICoupon) => {
        setEditingCoupon(coupon);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this coupon?")) return;
        await deleteCoupon.mutateAsync(id);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingCoupon(null);
    };

    const handleSuccess = () => {
        handleModalClose();
        // No need to manually refetch - TanStack Query handles it via cache invalidation
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <PageHeader
                    title="Mã giảm giá"
                    description="Quản lý chiến dịch khuyến mãi và mã giảm giá"
                />
                <Button onClick={handleCreate} className="gap-2">
                    <Plus className="h-4 w-4" /> Tạo mã giảm giá
                </Button>
            </div>

            <CouponStats stats={stats || null} isLoading={statsLoading} />

            <div className="space-y-4">
                <CouponTable
                    coupons={coupons}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isLoading={couponsLoading}
                />
            </div>

            {isModalOpen && (
                <CouponFormModal
                    open={isModalOpen}
                    onClose={handleModalClose}
                    couponToEdit={editingCoupon}
                    onSuccess={handleSuccess}
                />
            )}
        </div>
    );
}
