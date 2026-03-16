import express from 'express';
import { LanguageController } from '../controllers/language.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
    createLanguageSchema,
    getLanguageByCodeSchema,
    getLanguagesSchema,
    toggleLanguageStatusSchema,
    updateLanguageSchema,
} from '../validations/language.validation.js';

const router = express.Router();

router.use(protect);

router.get('/', validate(getLanguagesSchema), LanguageController.getLanguages);
router.get('/:code', validate(getLanguageByCodeSchema), LanguageController.getLanguageByCode);

router.post('/', restrictTo('admin', 'content_creator'), validate(createLanguageSchema), LanguageController.createLanguage);
router.put('/:code', restrictTo('admin', 'content_creator'), validate(updateLanguageSchema), LanguageController.updateLanguage);
router.patch(
    '/:code/toggle',
    restrictTo('admin', 'content_creator'),
    validate(toggleLanguageStatusSchema),
    LanguageController.toggleLanguageStatus,
);

export default router;
