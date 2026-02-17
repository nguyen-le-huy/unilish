import express from 'express';
import { CouponController } from '../controllers/admin/coupon.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(protect);

// Admin Only Routes
router.get('/stats', CouponController.getStats);
router.get('/', CouponController.getCoupons);
router.post('/', CouponController.createCoupon);
router.put('/:id', CouponController.updateCoupon);
router.delete('/:id', CouponController.deleteCoupon);

export default router;
