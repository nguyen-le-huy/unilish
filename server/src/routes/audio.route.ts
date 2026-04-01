import { Router } from 'express';
import multer from 'multer';
import {
    streamAudio,
    uploadSpeakingQuestionAudio,
    listSpeakingQuestionAudios,
    deleteSpeakingQuestionAudio,
} from '../controllers/audio.controller.js';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';

const router = Router();

// ─── Multer (memory storage, audio only, 50 MB cap) ─────────────────────────

const audioUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'));
        }
    },
});

// ─── Speaking Question Audio — Admin-only CRUD ───────────────────────────────

/**
 * @route POST /api/audio/speaking-questions/upload
 * @desc  Upload an audio file for a speaking question
 * @query part=part1|part2|part3  &questionId=<string>
 * @access Private / admin
 */
router.post(
    '/speaking-questions/upload',
    protect,
    restrictTo('admin'),
    audioUpload.single('file'),
    uploadSpeakingQuestionAudio,
);

/**
 * @route GET /api/audio/speaking-questions
 * @desc  List all question audios (optionally filtered by ?part=)
 * @access Private / admin
 */
router.get(
    '/speaking-questions',
    protect,
    restrictTo('admin'),
    listSpeakingQuestionAudios,
);

/**
 * @route DELETE /api/audio/speaking-questions
 * @desc  Delete a question audio by R2 key  — body: { key }
 * @access Private / admin
 */
router.delete(
    '/speaking-questions',
    protect,
    restrictTo('admin'),
    deleteSpeakingQuestionAudio,
);

// ─── Generic R2 audio streaming (public) ────────────────────────────────────

/**
 * @route GET /api/audio/*
 * @desc  Proxy-stream any R2 audio file by key
 * @access Public (cached 24h)
 */
// Express 5 + path-to-regexp v8: named wildcard uses {*name} syntax
router.get('/{*path}', streamAudio);

export default router;
