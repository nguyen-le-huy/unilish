import { v2 as cloudinary } from 'cloudinary';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { HttpStatus } from '../constants/http-status.js';
import { logger } from '../utils/logger.js';

if (env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY || '',
        api_secret: env.CLOUDINARY_API_SECRET || '',
    });
}

const r2Client = env.R2_ACCOUNT_ID
    ? new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID || '',
            secretAccessKey: env.R2_SECRET_ACCESS_KEY || '',
        },
    })
    : null;

export class UploadService {
    static async uploadImage(file: Express.Multer.File, folder?: string): Promise<string> {
        if (!env.CLOUDINARY_CLOUD_NAME) {
            throw new AppError('Cloudinary not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const targetFolder = folder?.trim() ? folder.trim() : 'unilish';

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: targetFolder,
                    resource_type: 'image',
                    format: 'webp',
                    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
                },
                (error, result) => {
                    if (error) return reject(new AppError(`Cloudinary Error: ${error.message}`, HttpStatus.BAD_GATEWAY));
                    resolve(result?.secure_url || '');
                },
            );

            uploadStream.end(file.buffer);
        });
    }

    static async uploadMedia(file: Express.Multer.File, folder?: string): Promise<string> {
        if (!r2Client || !env.R2_BUCKET_NAME) {
            throw new AppError('R2 Storage not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
        const normalizedFolder = folder
            ?.trim()
            .replace(/^\/+|\/+$/g, '')
            .replace(/[^a-zA-Z0-9/_-]/g, '_');
        const key = normalizedFolder ? `${normalizedFolder}/${fileName}` : fileName;

        try {
            const upload = new Upload({
                client: r2Client,
                params: {
                    Bucket: env.R2_BUCKET_NAME,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                },
            });

            await upload.done();

            const domain = env.R2_PUBLIC_DOMAIN
                ? env.R2_PUBLIC_DOMAIN
                : `https://${env.R2_BUCKET_NAME}.r2.dev`;

            const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;

            return `${baseUrl}/${key}`;
        } catch (error) {
            logger.error('R2 Upload Error:', error);
            throw new AppError('Failed to upload media to R2', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Upload a speaking question audio file to a structured R2 path:
     * `speaking-questions/{part}/{questionId}.{ext}`
     */
    static async uploadSpeakingQuestionAudio(
        file: Express.Multer.File,
        part: string,
        questionId: string,
    ): Promise<{ key: string; url: string }> {
        if (!r2Client || !env.R2_BUCKET_NAME) {
            throw new AppError('R2 Storage not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const ext = file.originalname.split('.').pop() ?? 'mp3';
        const key = `speaking-questions/${part}/${questionId}.${ext}`;

        try {
            const upload = new Upload({
                client: r2Client,
                params: {
                    Bucket: env.R2_BUCKET_NAME,
                    Key: key,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                },
            });

            await upload.done();

            const domain = env.R2_PUBLIC_DOMAIN ?? `https://${env.R2_BUCKET_NAME}.r2.dev`;
            const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;

            return { key, url: `${baseUrl}/${key}` };
        } catch (error) {
            logger.error('R2 Speaking Audio Upload Error:', error);
            throw new AppError('Failed to upload speaking question audio', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Delete an object from R2 by its key.
     */
    static async deleteR2Object(key: string): Promise<void> {
        if (!r2Client || !env.R2_BUCKET_NAME) {
            throw new AppError('R2 Storage not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        try {
            await r2Client.send(
                new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }),
            );
        } catch (error) {
            logger.error('R2 Delete Error:', error);
            throw new AppError('Failed to delete object from R2', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
