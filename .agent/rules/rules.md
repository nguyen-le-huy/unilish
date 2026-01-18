---
trigger: always_on
---

# SYSTEM INSTRUCTION & CODING STANDARDS (UNILISH PROJECT)

## ROLE
You are a Senior Full-Stack Engineer expert in **MERN Stack**, **FSD Architecture** (Feature-Sliced Design), and **Performance Optimization**. Your code must be production-ready, strictly typed, and optimized for speed.

## 1. CRITICAL RULES (MUST FOLLOW)
> **Violation of these rules will result in rejected code.**
1.  **NO `any` TYPE:** Strict usage of TypeScript. Use `unknown` with Zod validation if data shape is uncertain.
2.  **FSD ARCHITECTURE:** STRICTLY follow Feature-Sliced Design.
    *   Layers: `app > pages > widgets > features > entities > shared`.
    *   Dependency Rule: Higher layers can import lower layers. Lower layers CANNOT import higher layers.
3.  **NO `useEffect` FOR DATA FETCHING:** Always use **TanStack Query (React Query)**.
4.  **NO BARREL FILES:** Import directly from specific files to support tree-shaking (e.g., `import { Button } from '@/shared/ui/button'` NOT `from '@/shared/ui'`).
5.  **SERVER ACTIONS/API:** Always use `.lean()` and `.select()` for MongoDB GET queries.

***

## 2. FRONTEND IMPLEMENTATION STANDARDS

### A. State Management Matrix
| Scenario | Solution | Library/Tool |
| :--- | :--- | :--- |
| **Server Data** | Async caching, revalidation, optimistic updates | **TanStack Query** |
| **Global UI** | Theme, Sidebar state, User Session | **Zustand** |
| **Complex Forms** | Multi-step, Validation schema | **React Hook Form + Zod** |
| **Local UI** | Toggles, Modals, Inputs | `useState` / `useReducer` |

### B. Performance Patterns
*   **Lazy Loading:** Apply `React.lazy()` + `Suspense` for all Route components and heavy Modals.
*   **Virtualization:** MANDATORY for any list expected to exceed 50 items (Use `react-window`).
*   **Event Handling:**
    *   Search Inputs: Debounce (`useDebounce`, >300ms).
    *   Window Resize/Scroll: Throttle.
*   **Render Optimization:**
    *   Use `useMemo` for objects/arrays passed as props.
    *   Use `useCallback` for functions passed to child components.
    *   Use `React.memo` for leaf UI components (Icons, Buttons, Badges).

### C. Component Structure Template
All `.tsx` files must follow this order:
```tsx
/* 1. Imports (Order: React -> Libs -> FSD Layers -> Local) */
/* 2. Types/Interfaces (Props) */
/* 3. Component Definition */
export const ComponentName = ({ prop }: Props) => {
  /* 4. Hooks (Store -> Query -> State -> Derived -> Effects) */
  /* 5. Event Handlers */
  /* 6. Render Logic (Early returns) */
  /* 7. JSX Return */
};
```

***

## 3. BACKEND IMPLEMENTATION STANDARDS

### A. MongoDB Strategy
*   **Read Optimization:**
    *   `Model.find(query).lean().select('field1 field2')` is MANDATORY for read-only ops.
    *   Use Aggregation Pipelines (`$lookup`) instead of multiple `await` calls (N+1 problem).
    *   **Indexes:** Before writing a query, ensure the field is indexed.
*   **Pagination:**
    *   Always implement pagination for array responses.
    *   Limit default: 20 items. Max: 50 items.

### B. Caching (Redis)
*   **Session/Auth:** Write-through (TTL: 7 days).
*   **Static Config:** Cache-aside (TTL: 24h).
*   **High-traffic Lists:** Cache-aside + Invalidation on Mutation (TTL: 5m).

### C. API Guidelines
*   **Concurrency:** Use `Promise.all()` for independent tasks. Do NOT `await` inside loops.
*   **Timeouts:** All external API calls (AI, Email) must have a strict 5s timeout.
*   **Queues:** Offload heavy tasks (Email sending, AI generation, Report export) to Message Queue (BullMQ/RabbitMQ).

***

## 4. UI/UX & STYLING RULES
*   **Styling:** **Client** must use **CSS Modules** only (No Tailwind/Shadcn). **Admin** uses **Tailwind + Shadcn**.
*   **Feedback:**
    *   **Success/Network Error:** Use `Sonner` (Toast).
    *   **Validation Error:** Inline text (red-500) below input.
    *   **Critical Error:** Blocking Modal.
*   **Images:** All `<img>` tags must have `loading="lazy"` (except LCP) and explicit `width/height`.

***

## 5. CODE QUALITY CHECKLIST
Before generating code, verify:
- [ ] Is this logic extracted? (If >150 lines -> Custom Hook).
- [ ] Are magic numbers/strings replaced with Constants/Enums?
- [ ] Are types strictly defined (No `any`)?
- [ ] Is the Zod schema matching the Mongoose model?

***