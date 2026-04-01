---
description: Functional Description of the Hybrid Upload Service
---

# Dịch vụ Upload (Hybrid Storage)

## 1. Tổng quan

**Upload Service** xử lý upload file cho nền tảng Unilish với chiến lược **Hybrid Storage**.

```mermaid
flowchart LR
    subgraph Client["📱 Client/Admin"]
        A[File Input] --> B{MIME Type?}
    end
    
    B -->|image/*| C[☁️ Cloudinary]
    B -->|audio/* video/*| D[🪣 Cloudflare R2]
    
    C --> E[CDN URL]
    D --> F[Public URL]
    
    E & F --> G[✅ Save to DB]
```

| Storage | File Types | Lý do chọn |
|---------|------------|------------|
| **Cloudinary** | Images | Auto-optimize (`f_auto,q_auto`), CDN global |
| **Cloudflare R2** | Audio/Video | **Zero Egress Fees** - tiết kiệm bandwidth |

---

## 2. Yêu cầu chức năng

*   ✅ **Secure Uploads**: Chỉ authenticated users
*   ✅ **Validation**: MIME type + file size limits
*   ✅ **Auto-Optimization**: Images tự động optimize
*   ✅ **CDN Delivery**: Public URLs qua CDN

---

## 3. File Types & Limits

| Type | MIME Examples | Storage | Max Size | Use Cases |
|------|---------------|---------|----------|-----------|
| **Image** | `image/jpeg`, `image/png` | Cloudinary | 5 MB | Avatars, Thumbnails |
| **Audio** | `audio/mpeg` (mp3) | R2 | 20 MB | Pronunciation, Listening |
| **Video** | `video/mp4` | R2 | 100 MB | Video Lectures |

---

## 4. File Structure

### Server (`/server`)
| File | Chức năng | Link |
|------|-----------|------|
| `services/storage/upload.service.ts` | `uploadImage()`, `uploadMedia()` | [View](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/storage/upload.service.ts) |
| `controllers/upload.controller.ts` | HTTP handler | [View](file:///Users/nguyenlehuy/Downloads/unilish/server/src/controllers/upload.controller.ts) |
| `routes/upload.route.ts` | Multer + Route | [View](file:///Users/nguyenlehuy/Downloads/unilish/server/src/routes/upload.route.ts) |

---

## 5. API Endpoint

| Method | Endpoint | Mô tả | Auth |
|--------|----------|-------|------|
| POST | `/api/upload` | Upload any file | ✅ Required |
| POST | `/api/upload/image` | Upload image only | ✅ Required |

### Request
```
Content-Type: multipart/form-data
Body: file (binary)
```

### Response
```json
{
  "status": "success",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "type": "image"
  }
}
```

---

*Cập nhật: 2026-01-06*
