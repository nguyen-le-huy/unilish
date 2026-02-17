---
trigger: always_on
---

# UNILISH SERVER ARCHITECTURE & STANDARDS (ENTERPRISE)

## 1. Technology Stack (Enterprise Standard)

| **Thành phần** | **Công nghệ sử dụng** | **Vai trò & Lý do lựa chọn (Chuẩn Enterprise)** |
| --- | --- | --- |
| **Runtime** | **Node.js** | Môi trường chạy JavaScript hiệu năng cao. |
| **Framework** | **Express.js** | Framework quen thuộc, linh hoạt. **Lưu ý:** Phải cấu hình các Middleware bảo mật (Helmet, Cors, Rate-limit) ngay từ đầu. |
| **Ngôn ngữ** | **TypeScript** | **Bắt buộc.** Không viết JS thuần. TypeScript giúp code trong sáng, dễ refactor và tránh 90% lỗi ngớ ngẩn (`undefined is not a function`). |
| **API Docs** | **Swagger (swagger-jsdoc)** | Tự động sinh trang tài liệu API `/api-docs` từ comment trong code. Frontend nhìn vào đó để tích hợp, không cần chat hỏi Backend. |
| **Database ORM** | **Mongoose (MongoDB) + Pinecone** | • **Mongoose:** Quản lý Schema MongoDB chặt chẽ.<br>• **Pinecone:** Vector database - Semantic search, Knowledge retrieval, Personalized recommendations |
| **Message Queue** | **BullMQ + Redis** | **(Thay thế node-cron)**. Quản lý tác vụ nền (Gửi mail, chấm điểm AI). Đảm bảo job không bị mất khi server restart, hỗ trợ chạy lại (retry) khi lỗi. |
| **Realtime** | **Socket.io + Redis Adapter** | Redis Adapter giúp đồng bộ tin nhắn khi bạn mở rộng (scale) lên nhiều server khác nhau. |
| **Validation** | **Zod** | Validation siêu mạnh. Dùng làm Middleware để chặn các request rác ngay từ cửa ngõ, không cho lọt vào Controller. |
| **Logging** | **Winston** (hoặc Morgan) | Ghi log ra file hoặc bắn lên hệ thống giám sát (Datadog/Sentry) theo chuẩn JSON. Tuyệt đối không dùng `console.log` trên Production. |
| **Architecture** | **Service-Repository Pattern** | Mô hình 3 lớp: **Controller** (Giao tiếp) -> **Service** (Logic nghiệp vụ) -> **Data Access** (Truy xuất DB). |

---

## 2. Directory Structure (`server/src`)

```text
src/
├── @types/                   # Global Type Definitions
├── config/                   # Configuration
│   ├── env.ts                # Env validation (Zod)
│   ├── database.mongo.ts     # Mongoose Connection
│   ├── database.pinecone.ts  # Pinecone Client Connection
│   └── redis.ts              # Redis Client
│
├── constants/                # Magic Strings, HTTP Status
│
├── controllers/              # HTTP ADAPTER LAYER
│   ├── auth.controller.ts
│   └── ...
│
├── interfaces/               # CONTRACT DEFINITIONS
│   ├── services/             # Service Interfaces
│   ├── repositories/         # Repository Interfaces
│   │   ├── IUserRepository.ts
│   │   └── IGraphRepository.ts
│   └── ...
│
├── middlewares/              # HTTP INTERCEPTORS
│   ├── security/             # Security Middlewares
│   │   ├── helmet.ts         # Header Security
│   │   ├── cors.ts           # CORS Config
│   │   └── rate-limit.ts     # DDOS Protection
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── validate.middleware.ts
│   └── logger.middleware.ts
│
├── models/                   # DATA MODELS
│   ├── mongo/                # Mongoose Schemas
│   │   ├── user.model.ts
│   │   └── lesson.model.ts
│   └── vector/               # Vector Embeddings
│       └── knowledge-vector.ts
│
├── repositories/             # DATA ACCESS LAYER (Polyglot)
│   ├── base/                 # Generic Repository Bases
│   │   ├── base.mongo.repo.ts
│   │   └── base.vector.repo.ts
│   ├── mongo/                # MongoDB Implementations
│   │   └── user.mongo.repo.ts
│   ├── vector/               # Pinecone Implementations
│       └── knowledge.vector.repo.ts
│
├── routes/                   # API ROUTING
│
├── services/                 # BUSINESS LOGIC LAYER
│   # Orchestrates data between MongoRepo, GraphRepo and External APIs.
│   ├── auth.service.ts
│   ├── learning.service.ts   # Uses both Mongo (Lessons) & Pinecone (Context)
│   └── ...
│
├── jobs/                     # BACKGROUND WORKERS (BullMQ)
│   ├── queues/               # Queue Definitions
│   │   └── email.queue.ts
│   └── workers/              # Job Processors
│       └── email.worker.ts
│
├── socket/                   # REALTIME LAYER
│   ├── handlers/             # Event Handlers
│   ├── middlewares/          # Socket Auth
│   └── adapter.ts            # Redis Adapter Config (For Scaling)
│
├── utils/                    # SHARED UTILITIES
│   ├── logger.ts             # Winston (File + Console + Datadog transport)
│   └── ...
│
├── validations/              # ZOD SCHEMAS
├── tests/                    # TESTING
│   ├── unit/
│   ├── integration/
│   └── factories/            # Test Data Factories
│
├── app.ts                    # Express App Setup
└── server.ts                 # Entry Point

```

---

## 3. Architectural Patterns & Rules

### A. The "Polyglot Repository" Rule

Since we use both MongoDB and Pinecone, strict separation is required:

1. **Service Layer:** The ONLY place that can talk to multiple repositories.
* *Example:* `LearningService` fetches Lesson content from `MongoRepository` AND fetches related context embeddings from `VectorRepository`.


2. **Repository Layer:**
* **Mongo Repos:** Extends `BaseMongoRepository`. Only touches Mongoose.
* **Vector Repos:** Extends `BaseVectorRepository`. Only touches Pinecone SDK.



### B. Validation & Security Strategy

1. **Zod:** Used for API Input validation AND Environment Variable validation.
2. **Security First:** `Helmet`, `Cors`, and `Rate-limit` MUST be initialized in `app.ts` before any routes.
3. **Strict Types:** No `any`. Use generics for Repository return types.

### C. Realtime Scaling Rule

* **State:** Socket.io servers are stateless.
* **Adapter:** MUST use `@socket.io/redis-adapter` to broadcast events across multiple server instances.
* **Auth:** Socket connection MUST be authenticated via JWT in the handshake middleware.

---

## 4. Coding Standards

### Logging (Winston)

Logs must be structured (JSON) and transported correctly based on environment:

* **Dev:** Console (Colorized).
* **Prod:** File (Rotation) OR Monitoring Service (Datadog/Sentry).
* **Rule:** `console.log` is FORBIDDEN. Use `Logger.info()`, `Logger.error()`.

### Error Handling

* **Operational Errors:** Throw `AppError` (e.g., "User not found").
* **Programmer Errors:** Let the Global Error Handler catch them (e.g., Crash).
* **Async:** All Async Controller methods MUST be wrapped in `catchAsync()`.

---

## 5. Workflow: Adding a Contextual Lesson Feature

1. **Step 1 (Models):** Define `Lesson` in `models/mongo` and `ConceptVector` in `models/vector`.
2. **Step 2 (Repos):**
* Create `LessonMongoRepo` (CRUD content).
* Create `ConceptVectorRepo` (Manage embeddings/search).


3. **Step 3 (Service):** Create `LessonService`. Inject both repos.
* *Logic:* Save lesson to Mongo -> generate embedding -> upsert to Pinecone.


4. **Step 4 (Controller):** Validate input via Zod -> Call Service -> Return Response.

*Last Updated: 2026-02-05*