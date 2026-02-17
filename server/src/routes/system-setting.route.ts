import express from 'express';
import * as settingController from '../controllers/system-setting.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { ConfigController } from '../controllers/admin/config.controller.js';

const router = express.Router();

// Protect all settings routes
router.use(protect);
// router.use(restrictTo('admin')); // Enable if role check required

// Config Management
router.get('/subscription/config', ConfigController.getSubscriptionConfig);
// router.put('/subscription/config', ConfigController.updateSubscriptionConfig); // Legacy

// Draft & Publish Flow
router.post('/subscription/config/draft', ConfigController.saveDraft);
router.get('/subscription/config/draft', ConfigController.getDraft);
router.post('/subscription/config/publish', ConfigController.publishConfig);
router.get('/subscription/history', ConfigController.getHistory);

router.get('/subscription/stats', ConfigController.getSubscriptionStats);
router.post('/subscription/cache/refresh', ConfigController.refreshCache);

router.get('/', settingController.getAllSettings);
router.get('/:key', settingController.getSetting);
router.put('/:key', settingController.updateSetting);

export default router;
