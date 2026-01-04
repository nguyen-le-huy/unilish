import express from 'express';
import * as settingController from '../controllers/system-setting.controller.js';
// import { protect, restrictTo } from '../middlewares/auth.middleware.js'; // Should enable later

const router = express.Router();

// Should be protected for admin only
// router.use(protect);
// router.use(restrictTo('admin')); 

router.get('/', settingController.getAllSettings);
router.get('/:key', settingController.getSetting);
router.put('/:key', settingController.updateSetting);

export default router;
