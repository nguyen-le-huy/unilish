import express from 'express';
import multer from 'multer';
import { UploadController } from '../controllers/upload.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Configure Multer for memory storage
// Files are stored in memory as Buffer objects
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit (Adjust as needed for video)
    },
});

/**
 * @route POST /api/upload
 * @desc Upload a file (Image or Media)
 * @access Private
 */
router.post('/', protect, upload.single('file'), UploadController.uploadFile);
router.post('/image', protect, upload.single('file'), UploadController.uploadFile);

export default router;
