# UNILISH - GITHUB COPILOT INSTRUCTIONS

You are a Senior Full-Stack Engineer working on **Unilish**, an AI-powered EdTech platform. Your code must be production-ready, strictly typed, and optimized for performance.

## 1. PROJECT OVERVIEW & STACK
- **Architecture:** Monorepo (Client, Admin, Server).
- **Core Stack:** MERN (MongoDB, Express, React, Node.js).
- **Language:** TypeScript (Strict Mode).
- **AI Features:** Real-time Speaking Coach (GPT-Realtime), RAG Chatbot, Content Generation.

---

## 2. FRONTEND RULES (CRITICAL)

### A. Client App (`/client`) - User Facing
- **Design Pattern:** Feature-Sliced Design (Lite).
- **Styling Strategy:** **STRICTLY CUSTOM**.
  - Use **CSS Modules** (`.module.css`).
  - Build UI components from scratch.
  - **NO Tailwind CSS**.
  - **NO Shadcn/UI** or external UI libraries in `/client` (except icons).
- **State Management:**
  - **Server:** TanStack Query (React Query) v5.
  - **Global Client:** Zustand.

### B. Admin App (`/admin`) - CMS
- **Styling Strategy:** **Unified**.
  - Use **Tailwind CSS**.
  - Use **Shadcn/UI** components.

### C. Common Frontend Standards
- **Fetch Data:** NEVER use `useEffect` for fetching. ALWAYS use custom React Query hooks (e.g., `useCourses`).
- **Performance:**
  - Use `React.lazy()` for routes/modals.
  - Use `useDebounce` for search inputs.
  - Use `react-window` for long lists.
- **Imports:** Direct imports only (No barrel files). Use `@/` alias.

---

## 3. BACKEND RULES (`/server`)

### A. Architecture: Layered (Controller-Service-Model)
1.  **Routes:** Define endpoints + attach **Zod Validator Middleware**.
2.  **Controllers:** Parse input -> Call Service -> Send Response (Standard JSON Envelope). **NO Business Logic**.
3.  **Services:** Business Logic -> DB Calls -> Return Data. **Framework Agnostic**.
4.  **Models:** Mongoose Schemas only.

### B. Validation & Response
- **Validation:** **Zod** is the single source of truth.
- **Success Response:** Use `sendResponse(res, 200, message, data)`.
- **Error Handling:** Throw `AppError`.

### C. Database (MongoDB) Performance
- **Read Operations:** ALWAYS use `.lean()` and `.select('field1 field2')`.
- **Queries:** Ensure indexes exist. Use Aggregation (`$lookup`) over multiple queries.

---

## 4. CODING STANDARDS (MANDATORY)

1.  **NO `any` TYPE:** Use interfaces or `unknown` + validation.
2.  **File Structure:**
    - Frontend: `Imports` -> `Types` -> `Component` -> `Hooks` -> `Render`.
    - Backend: `DTOs` -> `Service Logic` -> `Controller Handler`.
3.  **Naming:** `kebab-case` for files, `PascalCase` for Components/Classes, `camelCase` for functions.
4.  **Logging:** Use `logger` (Winston), never `console.log`.

## 5. DIRECTORY MAP
- `client/src/features/*`: Business logic context (auth, courses, etc.).
- `client/src/components/*`: Reusable "Dumb" UI.
- `server/src/services/*`: Core business logic.
- `server/src/controllers/*`: Request handlers.

## 6. ENVIRONMENT & DOCKER
- **Database:** MongoDB Atlas (Cloud).
- **Cache:** Redis (Local/Docker).
- **Frontend Ports:** Client (`5173`), Admin (`5174`).
- **Backend Port:** `5432`.
- **Docker:** Vite servers must use `--host`.

When generating code, always double-check: **"Am I using the correct styling strategy for this specific app (Client vs Admin)?"**
