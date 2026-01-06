---
trigger: always_on
---

# UNILISH PROJECT RULES

## 1. Core Philosophy
- **Performance First:** Optimize for Time to Interactive.
- **Feature-Sliced Design:** Adhere to FSD architecture.
- **Type Safety:** TypeScript strict mode, absolute NO `any`.
- **Zero Tech Debt:** Refactor as you go.

---

## 2. Frontend Rules

### Rendering & Bundle
| Rule | Implementation |
|------|----------------|
| **Code Splitting** | `React.lazy()` for all routes & heavy modals. |
| **Virtualization** | Use `react-window` for lists > 50 items. |
| **Imports** | Direct file imports, avoid barrel files. |
| **Images** | `loading="lazy"` (below fold), `fetchpriority="high"` (LCP). |
| **Events** | Debounce search/resize (>300ms), Throttle scroll. |

### State Management Strategy
| Type | Tool | Purpose |
|------|------|---------|
| **Server State** | **React Query** | API data, Caching. `staleTime: 5m` for static data. |
| **Global Client** | **Zustand** | Theme, Auth, Language, Global UI (Sidebar). |
| **Local State** | **useState** | Form inputs, simple toggles, component-isolated state. |
| **Forms** | **React Hook Form** | Complex forms & validation (Zod). |

### Performance & Optimization
- **Memoization:**
  - Use `useMemo` for expensive computations or reference stability (objects/arrays).
  - Use `useCallback` for functions passed to purely functional child components.
  - Use `React.memo` for heavy UI components that re-render often with same props.
- **Context API:** Split `StateContext` and `DispatchContext` to prevent unnecessary re-renders.

### Media & Assets
- **Images:** Cloudinary/R2 with `format=auto,quality=auto`, exact dimensions.
- **Fonts:** Self-host or optimized CDN with `font-display: swap`.

---

## 3. Backend Rules

### MongoDB & Data Access
| Rule | Implementation |
|------|----------------|
| **Indexes** | Mandatory for query fields. Check with `explain()`. |
| **Read Ops** | Always `.lean()` for GET requests. |
| **Projections** | Always `.select(...)` to fetch ONLY needed fields. |
| **N+1** | Use Aggregation Pipelines (`$lookup`) or virtuals. |
| **Pagination** | Mandatory. Cursor-based preferred or Offset (limit 20-50). |

### Redis Caching
| Data | Strategy | TTL |
|------|----------|-----|
| Sessions | Write-through | 7 days |
| Config | Cache-aside | 24 hrs |
| API Lists | Cache-aside + Invalidate | 5 mins |

### API Performance
- **Compression:** Gzip/Brotli enabled (>1KB).
- **Concurrency:** `Promise.all()` for independent I/O.
- **Timeouts:** Strict 5s for external APIs.
- **Queues:** Offload Email/AI tasks to Message Queue.

---

## 4. Code Standards

### Component Structure
```tsx
// 1. Imports
// 2. Types/Interfaces
// 3. Component Definition
// 4. Hooks (State -> Queries -> Computed -> Effects)
// 5. Handlers
// 6. Return JSX
```

### Logic Extraction
- **>150 lines:** Extract to custom hook or sub-component.
- **UI Components:** "Dumb" (Visuals only, no business logic).

---

## 5. Notifications (Sonner)

- **Use Toast:** Login status, Network errors, Success actions.
- **Don't Use Toast:** Form validation (inline), Critical (Modal).
- **Service:** Centralized via `lib/notification.ts`.

---

## 6. Strict DON'Ts

- ❌ `useEffect` for data fetching (Use React Query).
- ❌ `useEffect` for syncing state (Use Derived State).
- ❌ `console.log` in production.
- ❌ `any` type (Use `unknown` + Zod).
- ❌ Magic strings/numbers (Use constants).
- ❌ Mixing CSS Modules & Tailwind (Stick to page type rule).

---

*Last Updated: 2026-01-06*
