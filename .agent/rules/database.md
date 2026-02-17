---
trigger: always_on
---

# UNILISH DATABASE ARCHITECTURE & STORAGE STANDARDS

## 1. Overview: Polyglot Persistence Strategy

UniLish adopts a **Polyglot Persistence** architecture. Instead of forcing all data into a single monolithic database, we utilize specialized data stores to optimize for specific use cases:

* **Document Store (MongoDB):** For flexible, hierarchical data (Users, Lessons).
* **Vector Database (Pinecone):** For semantic search and adaptive learning (Knowledge Maps).
* **In-Memory Store (Redis):** For high-speed caching and real-time features.
* **Columnar Store (ClickHouse):** For high-volume analytics and logging.

---

## 2. Core Database Systems

| **Thành phần** | **Công nghệ sử dụng** | **Vai trò & Lý do lựa chọn (Chuẩn Enterprise)** |
| --- | --- | --- |
| **Operational DB (NoSQL)** | **MongoDB Atlas** | **Primary Database:** Sử dụng bản Enterprise/Atlas để có tính năng *Sharding* (chia nhỏ dữ liệu khi scale lớn) và *Point-in-time Recovery* (khôi phục dữ liệu theo từng giây). Lưu trữ User Profile, Learning Progress, Logs. |
| **Knowledge Graph** | **Pinecone** | **Vector Database:** Semantic search engine cho adaptive learning. |
| **Distributed Cache** | **Redis (Cluster Mode)** | **Caching & Pub/Sub:** Cấu hình Cluster để chịu tải lớn. Dùng cho: <br>1. **Session Store:** Lưu phiên đăng nhập.<br>2. **BullMQ:** Quản lý hàng đợi job nền.<br>3. **Real-time Leaderboard:** Bảng xếp hạng cập nhật tức thì. |
| **Object Storage** | **Cloudflare R2** | **Media Storage:** Lưu trữ file gốc (Raw Audio/Video/PDF). R2 được chọn vì tuân thủ chuẩn S3 API (dễ dàng migrate sang AWS S3 nếu cần) và **Zero Egress Fees** (tối ưu chi phí băng thông cho media nặng). |
| **Media Pipeline** | **Cloudinary (Enterprise)** | **Digital Asset Management (DAM):** Không chỉ lưu ảnh, mà đóng vai trò là CDN và bộ xử lý media tự động (Auto-format WebP/Avif, Adaptive Bitrate Streaming cho video) giúp tối ưu trải nghiệm người dùng cuối. |
| **Data Warehouse** | **ClickHouse** (hoặc BigQuery) | **(Mới - Bắt buộc cho Enterprise):** Kho dữ liệu phân tích. Dùng để lưu Logs hành vi user (User Tracking), lịch sử học tập lâu dài để chạy các thuật toán Machine Learning cải thiện gợi ý (Recommendation). |

---







---

## 4. Data Modeling Strategy

### MongoDB Schemas (Mongoose)

Managed via strict schemas in `server/src/models`.

* **User:** Auth info, Settings, Subscription Status.
* **LearningSession:** Snapshot of a specific study session.
* **Submission:** User answers, AI corrections, Scores.

### Vector Model (Pinecone)

Managed via Pinecone SDK.

* **Vectors:** `Concept`, `Vocabulary`, `GrammarRule`, `Lesson`.
* **Metadata:**
* `id`: String
* `type`: "vocabulary" | "grammar" | "lesson"
* `tags`: Array<String>



---

## 5. Connection & Security Standards

1. **Drivers:**
* MongoDB: **Mongoose** (ODM) for strict schema validation.
* Pinecone: **Pinecone SDK** for vector operations.


2. **Environment Variables:**
* Connection strings must **never** be hardcoded. Use `config/env.ts` validated by **Zod**.


3. **Indexing:**
* MongoDB: Indexes required on all foreign keys and frequently queried fields (`email`, `slug`).
* Pinecone: Metadata filtering for efficient retrieval.



*Last Updated: 2026-02-05*