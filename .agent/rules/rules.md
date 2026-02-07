# UNILISH ENGINEERING HANDBOOK & CODING PROTOCOLS

## 1. Core Philosophy: The Enterprise Standard
UniLish is not a hobby project; it is a **Mission Critical Adaptive Learning Engine**. Our codebase must reflect the stability, scalability, and maintainability of a Tier-1 Tech Company (like Netflix or Uber).

**The Golden Rules:**
1.  **Code is Liability**: Write less, but write it better. Every line must be justified.
2.  **Type Safety is Non-Negotiable**: `any` is strictly forbidden. If you can't type it, you don't understand it.
3.  **Performance by Default**: We do not optimize "later". Latency (<100ms) and efficiency are baked into the design.
4.  **Security First**: Never trust user input. Validate everything at the edge.

---

## 2. Architectural Pillars

### A. The Polyglot Persistence Strategy
We use the right tool for the job. Do not force data into the wrong store.
*   **MongoDB (Atlas)**: **Operational Source of Truth**. Use for hierarchical documents (Users, Courses) where strict schemas (Mongoose) are beneficial.
*   **Neo4j (AuraDB)**: **Relationship Engine**. Use for connected data (Knowledge Maps, Prerequisites) where recursion is required.
*   **Redis (Cluster)**: **Speed Layer**. Use for caching, session management, and real-time job queues.
*   **ClickHouse**: **Analytics Layer**. Use for high-volume write-heavy logs.

### B. Feature-Sliced Design (Frontend)
We STRICTLY follow FSD to prevent "Spaghetti Code".
*   **Layers**: `app` -> `pages` -> `widgets` -> `features` -> `entities` -> `shared`.
*   **The Dependency Rule**: Arrows point DOWN. `shared` knows nothing about `features`. `features` depends on `entities`.
*   **Isolation**: Features should be self-contained. Communication happens via Composition or Global Store (Zustand), not cross-imports.

### C. The Styling Schism
*   **Client App (Consumer Facing)**: **CSS Modules** + **GSAP**. Why? Total strict control over the cascade and performance for high-fidelity animations.
*   **Admin Dashboard (Internal)**: **Tailwind CSS** + **Shadcn/UI**. Why? Development velocity and standard UI patterns.

---

## 3. Mandatory Coding Standards

### Backend (Node.js/Express)
1.  **Read Performance**: ALL `GET` requests to MongoDB **MUST** use `.lean()` and `.select()` to minimize object hydration cost.
2.  **Async Safety**: Use `catchAsync` wrappers on ALL controllers. Unhandled Promise Rejections are unacceptable.
3.  **Validation**: ALL inputs (Body, Query, Params) **MUST** be validated with **Zod** *before* reaching the controller logic.
4.  **Logging**: `console.log` is **BANNED**. Use the `Logger` service (Winston) with proper levels (`info`, `warn`, `error`, `debug`).
5.  **Environment**: NEVER hardcode secrets. Access distinct config via `config/env.ts` (validated on startup).

### Frontend (React/Vite)
1.  **State Management**:
    *   **Server State**: **TanStack Query** (Auto-caching, deduplication).
    *   **Client State**: **Zustand** (Global UI), `useState` (Local).
    *   **Side Effects**: `useEffect` is for synchronization (Subscription/DOM), **NOT** for data fetching.
2.  **Performance**:
    *   **Virtualization**: Lists > 50 items **MUST** use `react-window`.
    *   **Code Splitting**: Routes **MUST** be lazy-loaded (`React.lazy`).
    *   **Stability**: Define objects/functions outside components or use `useMemo`/`useCallback` to prevent render thrashing.
3.  **Accessibility**: All interactive elements must have `aria-label` and keyboard navigation support.

---

## 4. Development Workflow

### Pull Request & Code Review
*   **Branching**: `feat/user-login`, `fix/nav-bug`. No pushing to `main` directly.
*   **Commit Messages**: Conventional Commits (`feat: add login`, `chore: update dependencies`).
*   **Review Checklist**:
    - [ ] Logic extracted to Hooks/Services?
    - [ ] No `any` types?
    - [ ] Zod schema matches DB model?
    - [ ] Accessibility check passed?
    - [ ] Complex logic has Unit Tests?

### Testing Strategy
*   **Unit**: Test pure logic/utils (Vitest).
*   **Component**: Test reusable UI elements (React Testing Library).
*   **Integration**: Test critical User Flows (E2E).
*   **Coverage**: Target **80%** for business logic modules.

---

## 5. Security & Compliance
*   **OWASP Top 10**: We actively defend against Injection, Broken Auth, and XSS.
*   **Sanitization**: Use `dompurify` for any HTML rendering.
*   **Rate Limiting**: All public APIs must be rate-limited (Redis).
*   **Zero Trust**: Assume the client is compromised. Verify ownership on every request.

---

## 6. How to Use These Rules
**For AI Agents:**
When generating code, **YOU MUST** verify it against this document. If a requested feature violates these rules (e.g., "Add Tailwind to Client"), **REFUSE AND CORRECT** the user based on the architecture.

**For Developers:**
This is your contract. Code that violates these standards will be rejected at Code Review.

*Last Updated: 2026-02-05*