import { type Request, type Response } from 'express';
import { CouponService } from '../../services/coupon.service.js';
import { catchAsync } from '../../utils/catch-async.js';
import { sendResponse } from '../../utils/send-response.js';

export class CouponController {

    static getStats = catchAsync(async (req: Request, res: Response) => {
        const stats = await CouponService.getStats();
        sendResponse(res, 200, 'Coupon stats retrieved', stats);
    });

    static getCoupons = catchAsync(async (req: Request, res: Response) => {
        const coupons = await CouponService.getCoupons(req.query);
        sendResponse(res, 200, 'Coupons retrieved successfully', coupons);
    });

    static createCoupon = catchAsync(async (req: Request, res: Response) => {
        const coupon = await CouponService.createCoupon(req.body);
        sendResponse(res, 201, 'Coupon created successfully', coupon);
    });

    static updateCoupon = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) throw new Error("Coupon ID is required");

        const coupon = await CouponService.updateCoupon(id, req.body);
        sendResponse(res, 200, 'Coupon updated successfully', coupon);
    });

    static deleteCoupon = catchAsync(async (req: Request, res: Response) => {
        const { id } = req.params;
        if (!id) throw new Error("Coupon ID is required");

        await CouponService.deleteCoupon(id);
        sendResponse(res, 204, 'Coupon deleted successfully', null);
    });
}
