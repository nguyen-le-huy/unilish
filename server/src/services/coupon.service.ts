import { Coupon, EDiscountType } from '../models/mongo/coupon.model.js';
import type { ICoupon } from '../models/mongo/coupon.model.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';

export class CouponService {
    /**
     * Get list of coupons with filtering/pagination
     */
    static async getCoupons(query: any) {
        // Simple implementation for now
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        return coupons;
    }

    /**
     * Create new coupon
     */
    static async createCoupon(data: Partial<ICoupon>) {
        if (!data.code) {
            throw new AppError('Coupon code is required', HttpStatus.BAD_REQUEST);
        }
        const existing = await Coupon.findOne({ code: data.code });
        if (existing) {
            throw new AppError('Coupon code already exists', HttpStatus.BAD_REQUEST);
        }
        return Coupon.create(data);
    }

    /**
     * Update coupon
     */
    static async updateCoupon(id: string, data: Partial<ICoupon>) {
        const coupon = await Coupon.findByIdAndUpdate(id, data, { new: true });
        if (!coupon) {
            throw new AppError('Coupon not found', HttpStatus.NOT_FOUND);
        }
        return coupon;
    }

    /**
     * Delete coupon (Soft delete by setting isActive=false preferred, but let's allow delete for admin)
     */
    static async deleteCoupon(id: string) {
        return Coupon.findByIdAndDelete(id);
    }

    /**
     * Get Stats for Admin Dashboard
     */
    static async getStats() {
        const totalActive = await Coupon.countDocuments({
            isActive: true,
            $or: [
                { expiryDate: { $gt: new Date() } },
                { expiryDate: null } // No expiry
            ]
        });

        // Calculate total redeemed count
        const allCoupons = await Coupon.find().select('usedCount value discountType');
        const totalRedeemed = allCoupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

        // Estimate Revenue Saved (Only accurate for Fixed Amount without Transaction history)
        // For Percentage, we can't know without Order history. 
        // We'll simplisticly sum (value * usedCount) for Fixed and handle Percentage as 0 or estimative.
        // But user asked for it. Let's return a "best effort" or 0 if percentage.
        const revenueSaved = allCoupons.reduce((sum, c) => {
            if (c.discountType === EDiscountType.FIXED_AMOUNT) {
                return sum + (c.value * (c.usedCount || 0));
            }
            return sum; // Ignore percentage for now as we don't have base price history here
        }, 0);

        return {
            activeCoupons: totalActive,
            totalRedeemed,
            revenueSaved
        };
    }
}
