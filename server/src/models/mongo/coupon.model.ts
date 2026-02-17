import mongoose from "mongoose";

export enum EDiscountType {
    PERCENTAGE = 'PERCENTAGE',
    FIXED_AMOUNT = 'FIXED_AMOUNT'
}

export enum EPlanScope {
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
    ALL = 'ALL'
}

export interface ICoupon extends mongoose.Document {
    code: string;
    description?: string;
    discountType: EDiscountType;
    value: number;
    appliesToPlans: EPlanScope[];
    usageLimit?: number | null;
    usedCount: number;
    minOrderValue: number;
    startDate: Date;
    expiryDate?: Date;
    isActive: boolean;
    partnerId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CouponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    description: String,
    discountType: {
        type: String,
        enum: Object.values(EDiscountType),
        required: true
    },
    value: { type: Number, required: true },
    appliesToPlans: [{
        type: String,
        enum: Object.values(EPlanScope),
        default: EPlanScope.ALL
    }],
    usageLimit: { type: Number, default: null },
    usedCount: { type: Number, default: 0 },
    minOrderValue: { type: Number, default: 0 },
    startDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    isActive: { type: Boolean, default: true },
    partnerId: { type: String },
}, { timestamps: true });

export const Coupon = mongoose.model<ICoupon>("Coupon", CouponSchema);
