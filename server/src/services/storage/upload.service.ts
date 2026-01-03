import { v2 as cloudinary } from 'cloudinary';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';
import { HttpStatus } from '../../constants/http-status.js';

// Configure Cloudinary only if creds are present to avoid immediate crash on import
if (env.CLOUDINARY_CLOUD_NAME) {
    cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY || '',
        api_secret: env.CLOUDINARY_API_SECRET || '',
    });
}

// Configure R2
// Only initialize if Account ID is provided to avoid invalid URL error
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
    /**
     * Upload image to Cloudinary
     */
    static async uploadImage(file: Express.Multer.File): Promise<string> {
        if (!env.CLOUDINARY_CLOUD_NAME) {
            throw new AppError('Cloudinary not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'unilish',
                    resource_type: 'image',
                    format: 'webp', // Optimize by default
                    transformation: [{ quality: 'auto', fetch_format: 'auto' }]
                },
                (error, result) => {
                    if (error) return reject(new AppError(`Cloudinary Error: ${error.message}`, HttpStatus.BAD_GATEWAY));
                    resolve(result?.secure_url || '');
                }
            );

            uploadStream.end(file.buffer);
        });
    }

    /**
     * Upload audio/video to Cloudflare R2
     */
    static async uploadMedia(file: Express.Multer.File): Promise<string> {
        if (!r2Client || !env.R2_BUCKET_NAME) {
            throw new AppError('R2 Storage not configured', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Clean filename: timestamp + sanitized original name
        const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        try {
            const upload = new Upload({
                client: r2Client,
                params: {
                    Bucket: env.R2_BUCKET_NAME,
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                },
            });

            await upload.done();

            // Return URL
            // If R2_PUBLIC_DOMAIN is set, use it (e.g. https://cdn.unilish.com)
            // Otherwise fallback to R2 dev URL (e.g. https://<bucket>.r2.dev)
            // Note: R2 Dev URL requires authentication by default unless public access is enabled.
            const domain = env.R2_PUBLIC_DOMAIN
                ? env.R2_PUBLIC_DOMAIN
                : `https://${env.R2_BUCKET_NAME}.r2.dev`;

            // Ensure domain doesn't end with slash
            const baseUrl = domain.endsWith('/') ? domain.slice(0, -1) : domain;

            return `${baseUrl}/${fileName}`;
        } catch (error) {
            console.error('R2 Upload Error:', error);
            throw new AppError('Failed to upload media to R2', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
