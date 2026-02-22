import { Router } from 'express';
import { streamAudio } from '../controllers/audio.controller.js';

const router = Router();

// GET /api/audio/* — proxy R2 audio files
// Express 5 + path-to-regexp v8: named wildcard uses {*name} syntax
router.get('/{*path}', streamAudio);

export default router;
