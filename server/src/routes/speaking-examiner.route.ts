import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { SpeakingExaminerController } from '../controllers/speaking-examiner.controller.js';
import { getExaminerVoiceSchema } from '../validations/speaking-examiner.validation.js';

const router = express.Router();

router.use(protect);

router.get(
    '/examiner-voice',
    validate(getExaminerVoiceSchema),
    SpeakingExaminerController.getVoice,
);

export default router;
