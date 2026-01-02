---
trigger: always_on
---

# UNILISH SERVER ARCHITECTURE & STANDARDS

## 1. Overview
The Unilish Backend is built on **Node.js** and **Express**, following the **Layered Architecture** pattern (Controller-Service-Model).
- **Goal:** Separation of concerns, scalability, testability, and type safety.
- **Core Stack:** TypeScript, MongoDB (Mongoose), Redis, Zod, Socket.io.
- **Documentation:** Swagger/OpenAPI.

---

## 2. Directory Structure (`server/src`)

```text
src/
├── @types/               # TypeScript Type Definitions
├── config/               # Configuration (Env, DB, Redis, Logger)
├── constants/            # Magic Strings & HTTP Status
│
├── controllers/          # HTTP LAYER
│   # ⚠️ NO Business Logic. Only parse input -> call service -> send response.
│   ├── auth.controller.ts
│   └── ...
│
├── docs/                 # API DOCUMENTATION 🆕
│   ├── swagger.json      # OpenAPI Definition
│   └── components.yaml   # Reusable Schemas
│
├── middlewares/          # Interceptors
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── validate.middleware.ts
│   └── ...
│
├── models/               # DATA LAYER (Schemas)
├── routes/               # API ROUTING
│
├── services/             # BUSINESS LOGIC LAYER (Core) ⭐️
│   # Returns pure data. Throws errors. No req/res usage.
│   ├── auth.service.ts
│   ├── ai/
│   └── storage/
│
├── jobs/                 # BACKGROUND JOBS (Queue/Cron) 🆕
│   ├── email.queue.ts
│   └── cleanup.cron.ts
│
├── socket/               # REALTIME HANDLERS
├── utils/                # HELPERS
│   ├── app-error.ts      # Error Class
│   ├── catch-async.ts    # Wrapper
│   └── send-response.ts  # Standard Response Wrapper 🆕
│
├── validations/          # ZOD SCHEMAS
├── app.ts                # App Setup
└── server.ts             # Entry Point

```

---

## 3. Architectural Patterns & Rules

### A. The "Three-Layer" Rule

Data flow must strictly follow: `Route` -> `Controller` -> `Service` -> `Model`

1. **Controller Layer:**
* **Input:** `req` (Body, Query, Params).
* **Action:** Call Service.
* **Output:** `res` (Standardized JSON).
* **Rule:** NEVER contain business logic (e.g., calculating scores, checking roles).


2. **Service Layer:**
* **Input:** Typed Objects (DTOs inferred from Zod).
* **Action:** Business Logic, Database Calls, 3rd Party APIs.
* **Output:** Pure Data or Throw Error.
* **Rule:** Framework agnostic (Doesn't know Express exists).


3. **Data Layer (Models):**
* **Action:** Database interactions only.



### B. Validation Strategy (Strict)

* **Zod** is the single source of truth for validation.
* Every route MUST have a validator middleware.
* **DTOs:** Use `z.infer<typeof Schema>` to type the Service inputs.

### C. Response Standards (Envelope Pattern) 🆕

**1. Error Response (Handled by `error.middleware`):**

```json
{
  "status": "error",
  "code": 400,
  "message": "Invalid email format",
  "stack": "..." (Dev only)
}

```

**2. Success Response (Use `sendResponse` utility):**
All successful APIs MUST return this consistent format:

```json
{
  "status": "success",
  "code": 200,
  "message": "Login successfully",
  "data": { ...object or array... },
  "meta": { ...pagination info... } (Optional)
}

```

### D. Hybrid Storage Strategy

* **Images:** Cloudinary (via `upload.service.ts`).
* **Media (Audio/Video):** Cloudflare R2 (via `upload.service.ts`).

---

## 4. Coding Standards

### Naming Conventions

* **Files:** `kebab-case.ts` (e.g., `user.controller.ts`).
* **Classes:** `PascalCase` (e.g., `UserService`).
* **Functions/Vars:** `camelCase`.

### Performance & Security Rules

1. **Lean Queries:** Always use `.lean()` for GET requests.
2. **Projections:** Always `.select()` fields explicitly.
3. **Environment:** Secrets MUST be validated by `config/env.ts` at startup.
4. **Logging:** Use `logger` (Winston/Pino). NO `console.log`.

### Environment Variables
```env
MONGO_URI=mongodb+srv://...
N8N_WEBHOOK_URL=https://... (For OTP Email)
```

---

## 5. Workflow: Adding a New Feature

Example: "Create a Lesson"

1. **Step 1 (DTO/Validation):** Create `validations/lesson.validation.ts`.
2. **Step 2 (Service):** Create `createLesson` in `services/lesson.service.ts`.
* Define input type using `z.infer`.
* Implement logic & DB calls.


3. **Step 3 (Controller):** Create `createLesson` in `controllers/lesson.controller.ts`.
* Call service.
* Return using `sendResponse(res, 201, "Created", data)`.


4. **Step 4 (Route):** Define POST route in `routes/v1/lesson.route.ts` + attach Zod middleware.
5. **Step 5 (Docs):** Add the endpoint definition to `docs/swagger.json`. 🆕

*Last Updated: 2026-01-02*

```