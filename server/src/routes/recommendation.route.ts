import express from 'express';
import { protect } from '../middlewares/auth.middleware.js';
import { RecommendationController } from '../controllers/recommendation.controller.js';

const router = express.Router();

router.get('/', protect, RecommendationController.getRecommendations);

export default router;
