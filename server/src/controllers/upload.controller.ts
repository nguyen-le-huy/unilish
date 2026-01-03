import type { Request, Response } from 'express';
import { UploadService } from '../services/storage/upload.service.js';
import { sendResponse } from '../utils/send-response.js';
import { HttpStatus } from '../constants/http-status.js';
import { AppError } from '../utils/app-error.js';
import { catchAsync } from '../utils/catch-async.js';

export class UploadController {
    /**
     * Upload a file (Image -> Cloudinary, Video/Audio -> R2)
     */
    static uploadFile = catchAsync(async (req: Request, res: Response) => {
        if (!req.file) {
            throw new AppError('No file uploaded', HttpStatus.BAD_REQUEST);
        }

        let url = '';
        const mime = req.file.mimetype;

        if (mime.startsWith('image/')) {
            url = await UploadService.uploadImage(req.file);
        } else if (mime.startsWith('audio/') || mime.startsWith('video/')) {
            url = await UploadService.uploadMedia(req.file);
        } else {
            throw new AppError('Unsupported file type. Only images, audio, and video are allowed.', HttpStatus.BAD_REQUEST);
        }

        sendResponse(res, HttpStatus.CREATED, 'File uploaded successfully', { url, type: mime });
    });
}
