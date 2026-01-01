# UNILISH PROJECT RULES: PERFORMANCE, CLEAN CODE & ARCHITECTURE

## 1. CORE PHILOSOPHY
- **Performance First:** Every component/function is optimized for speed (Time to Interactive) and memory.
- **Feature-Sliced Design:** Code must strictly follow the FSD architecture (Features > Shared).
- **Type Safety:** TypeScript `strict` mode is mandatory. No `any`, no `@ts-ignore`.
- **Zero Tech Debt:** Refactor immediately if a "smell" is detected.

---

## 2. FRONTEND OPTIMIZATION RULES (CLIENT & ADMIN)

### A. Rendering & Bundle Size
1.  **Code Splitting (Aggressive):**
    - **MUST** use `React.lazy()` for all Route-level components.
    - **MUST** lazy load heavy UI libs (Charts, Maps, Editor, Video Players) only when visible (`useInView`).
2.  **Import Strategy (No Barrel File Hell):**
    - ❌ **AVOID** exporting everything in `index.ts` recursively. It breaks Tree Shaking and slows down Vite HMR.
    - ✅ Import directly from the file if possible: `import { Button } from '@/components/ui/button'` (instead of generic folder import).
3.  **List Virtualization:**
    - If a list can exceed **50 items** (Vocab list, Leaderboard), **MUST** use virtualization (`react-window` or `tanstack/virtual`). DO NOT render 100 DOM nodes invisibly.

### B. Media & Assets (UX Performance)
1.  **Images:**
    - **Cloudinary:** ALWAYS use `f_auto,q_auto`.
    - **CLS Prevention:** Images MUST have explicit `width` and `height` (or aspect-ratio) to prevent layout shifts.
    - **Lazy Loading:** All images "below the fold" must have `loading="lazy"`.
2.  **Fonts:**
    - Use `font-display: swap` to ensure text is visible immediately.

### C. State Management & Re-renders
1.  **React Query (Server State):**
    - **Stale Time:** Default `staleTime` should be > 0 (e.g., 60s) to avoid fetching on every focus.
    - **Selectors:** ALWAYS use the `select` option to transform data.
      - ❌ `const { data } = useQuery(...)` -> `const users = data.filter(...)` (Runs on every render).
      - ✅ `useQuery({ ..., select: data => data.filter(...) })` (Runs only when data changes).
2.  **Zustand (Client State):**
    - **Atomic Selectors:** Select ONLY what you need.
    - ❌ `const { isOpen, toggle } = useStore()`
    - ✅ `const isOpen = useStore(s => s.isOpen)`
3.  **Stability:**
    - Objects/Arrays passed as props MUST be stable (use `useMemo` or define outside component) to prevent child re-renders.

### D. Styling Performance
1.  **Tailwind:** Use `clsx` or `tailwind-merge` (`cn` utility) for conditional classes. Never use template literals for class manipulation manually.
2.  **CSS Modules:** Do not use ID selectors (`#header`). Use Class selectors only.

---

## 3. BACKEND OPTIMIZATION RULES (SERVER)

### A. Database (MongoDB)
1.  **Indexing Strategy:**
    - Queries without indexes are **FORBIDDEN**. Use `.explain()` to verify.
    - Use **Compound Indexes** for queries with equality + range/sort (Equality First Rule).
2.  **Lean & Select:**
    - **ALWAYS** use `.lean()` for GET requests.
    - **ALWAYS** use `.select('-__v -password')` to reduce payload size.
3.  **Connection Pooling:** Ensure Mongoose connection is reused, do not create new connections per request.

### B. API Performance
1.  **Compression:** Enable Gzip/Brotli compression (`compression` middleware) for all JSON responses.
2.  **Parallelism:**
    - ❌ `await User.create(); await Email.send();`
    - ✅ `Promise.all([User.create(), Email.send()]);` (If operations are independent).
3.  **Pagination:** APIs returning lists MUST implement cursor-based or offset-based pagination. NEVER return "all" records.

### C. Security
1.  **Rate Limiting:** Public APIs (Login, Register) MUST have rate limits (Redis-based).
2.  **Sanitization:** Use `helmet` for headers and Zod for ALL input validation.

---

## 4. CLEAN CODE & TESTING STANDARDS

### A. Component Structure (The "Sandwich" Rule)
1.  **Imports** (Grouped: External -> Internal -> Styles)
2.  **Types/Interfaces**
3.  **Component Definition**
4.  **Hooks Calls** (Top level)
5.  **Computed Values** (Derived state)
6.  **Effects** (Keep minimal)
7.  **Handlers**
8.  **Return (JSX)**

### B. Business Logic Extraction
- **Rule of Thumb:** If a component exceeds **150 lines**, extract logic to a Custom Hook (`useFeatureLogic.ts`).
- UI Components should be "dumb" (Visuals only). Smart logic lives in Hooks or Services.

### C. Testing Strategy
1.  **Unit Tests:** Critical utilities (price calculation, formatting) MUST have Unit Tests (`Vitest`).
2.  **E2E Tests:** Critical User Flows (Login -> Learn -> Quiz) SHOULD be tested later.

### D. Comments
- **DO NOT** comment *what* code does (Code tells what).
- **DO** comment *why* code exists (Business context or complex workaround).

---

## 5. NEGATIVE CONSTRAINTS (STRICT)

1.  **DO NOT** use `useEffect` for data fetching. Use React Query.
2.  **DO NOT** use `useEffect` to sync state (e.g., `props` change -> update `state`). Use Derived State instead.
3.  **DO NOT** leave `console.log` in commits (Configure Husky/Lint to block).
4.  **DO NOT** mix Marketing styles (CSS Modules) with Dashboard styles (Tailwind) in the same file.
5.  **DO NOT** use `any`. Use `unknown` + Zod validation.
6.  **DO NOT** hardcode Magic Numbers/Strings. Extract to `constants/`.