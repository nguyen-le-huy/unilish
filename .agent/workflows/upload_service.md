---
description: Setup Hybrid Upload Service (Cloudinary + R2)
---

# Hybrid Upload Service Setup Workflow

This workflow guides you through setting up a robust upload service using Cloudinary for images (optimization) and Cloudflare R2 for heavy media (zero egress fees).

## 1. Install Dependencies
// turbo
1. Install required packages for file handling and storage SDKs.
   ```bash
   cd server
   npm install multer cloudinary @aws-sdk/client-s3 @aws-sdk/lib-storage
   npm install -D @types/multer
   ```

## 2. Configure Environment Variables
1. Define validation schema in `server/src/config/env.ts`.
   - Add `CLOUDINARY_*` and `R2_*` variables to Zod schema.
2. Update `.env` file with credentials.
   ```env
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...

   # Cloudflare R2
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=...
   R2_PUBLIC_DOMAIN=... (Optional)
   ```

## 3. Implement Service Logic
1. Create `server/src/services/storage/upload.service.ts`.
   - Initialize `cloudinary` v2.
   - Initialize `S3Client` (AWS SDK v3) pointed to Cloudflare R2 endpoint.
   - **Method `uploadImage`**: Use `cloudinary.uploader.upload_stream` for images.
   - **Method `uploadMedia`**: Use `@aws-sdk/lib-storage` `Upload` for R2 multipart uploads.

## 4. Implement Controller
1. Create `server/src/controllers/upload.controller.ts`.
   - Use `catchAsync` wrapper.
   - check `req.file`.
   - Detect MIME type:
     - If `image/*` -> Call `UploadService.uploadImage`.
     - If `audio/*` or `video/*` -> Call `UploadService.uploadMedia`.
   - Return standard response:
     ```json
     {
       "status": "success",
       "data": { "url": "...", "type": "..." }
     }
     ```

## 5. Setup Route & Middleware
1. Create `server/src/routes/upload.route.ts`.
   - Configure `multer` to use `memoryStorage` (Buffer).
   - Define POST `/` endpoint.
   - Apply `protect` middleware (Authentication required).
2. Register route in `server/src/app.ts`.
   ```typescript
   import uploadRouter from './routes/upload.route.js';
   app.use('/api/upload', uploadRouter);
   ```

## 6. Verify Implementation
// turbo
1. Create a test script `server/test-upload.ts` to verify functionality without frontend.
   - Use `axios` and `form-data`.
   - Simulate Auth (Login/Register/Sync).
   - Upload sample buffer.
2. Run the test.
   ```bash
   npx tsx server/test-upload.ts
   ```
