---
trigger: always_on
---

# UNILISH PROJECT RULES

## 1. Core Philosophy
- **Performance First:** Optimize for Time to Interactive
- **Feature-Sliced Design:** FSD architecture
- **Type Safety:** TypeScript strict mode, no `any`
- **Zero Tech Debt:** Refactor immediately

---

## 2. Frontend Rules

### Rendering & Bundle
| Rule | Implementation |
|------|----------------|
| Code Splitting | `React.lazy()` for routes |
| Heavy Libs | Lazy load with `useInView` |
| Lists > 50 items | Use `react-window` |
| Imports | Direct file imports, avoid barrel files |

### State Management
| Tool | Rule |
|------|------|
| React Query | Use `select` option, `staleTime > 0` |
| Zustand | Atomic selectors: `useStore(s => s.isOpen)` |
| Props | Use `useMemo` for stable objects/arrays |

### Media
- Images: Cloudinary with `f_auto,q_auto`, explicit dimensions
- Fonts: `font-display: swap`

---

## 3. Backend Rules

### MongoDB
| Rule | Implementation |
|------|----------------|
| Indexes | Required for all queries |
| GET requests | Always `.lean()` |
| Projections | Always `.select('-password -__v')` |

### API
- Compression: Gzip/Brotli enabled
- Parallelism: `Promise.all()` for independent ops
- Pagination: Always paginate lists
- Rate Limiting: Required for public endpoints

---

## 4. Code Standards

### Component Structure
```
1. Imports (External → Internal → Styles)
2. Types/Interfaces
3. Component Definition
4. Hooks → Computed → Effects → Handlers
5. Return JSX
```

### Logic Extraction
- Component > 150 lines → Extract to custom hook
- UI components = "dumb" (visuals only)

---

## 5. Notifications (Sonner)

### When to Use
| ✅ Show Toast | ❌ Don't Use Toast |
|---------------|-------------------|
| Login success/failure | Form validation errors |
| Profile updated | Critical actions (use Modal) |
| Network errors | Every state change |

### Duration
| Type | Duration |
|------|----------|
| Success | 3000ms |
| Error | 5000ms |
| Loading | Until resolved |

### Centralized Service
```typescript
// src/lib/notification.ts
notify.auth.loginSuccess()
notify.auth.loginError(message)
notify.learning.streakSaved(days)
```

---

## 6. Strict DON'Ts

| ❌ Forbidden | ✅ Use Instead |
|-------------|----------------|
| `useEffect` for fetching | React Query |
| `useEffect` to sync state | Derived state |
| `console.log` in commits | Logger/Remove |
| `any` type | `unknown` + Zod |
| Magic numbers/strings | `constants/` folder |
| `alert()` / `confirm()` | Toast/Modal |
| Mix CSS Modules + Tailwind | Separate by page type |

---

*Last Updated: 2026-01-02*
