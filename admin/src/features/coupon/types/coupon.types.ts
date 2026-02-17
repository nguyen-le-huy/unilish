export type EDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export const EDiscountType = {
    PERCENTAGE: 'PERCENTAGE' as EDiscountType,
    FIXED_AMOUNT: 'FIXED_AMOUNT' as EDiscountType
} as const;

export type EPlanScope = 'MONTHLY' | 'YEARLY' | 'ALL';
export const EPlanScope = {
    MONTHLY: 'MONTHLY' as EPlanScope,
    YEARLY: 'YEARLY' as EPlanScope,
    ALL: 'ALL' as EPlanScope
} as const;

export interface ICoupon {
    _id: string;
    code: string;
    description?: string;
    discountType: EDiscountType;
    value: number;
    appliesToPlans: EPlanScope[];
    usageLimit?: number | null;
    usedCount: number;
    minOrderValue: number;
    startDate: string;
    expiryDate?: string;
    isActive: boolean;
    partnerId?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CouponStats {
    activeCoupons: number;
    totalRedeemed: number;
    revenueSaved: number;
}
