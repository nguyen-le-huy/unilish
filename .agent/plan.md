# Plan: Migrate Marketing Home & Dashboard Home from `pages/` to `features/`

## 1) Current State Audit

### Observed structure
- `client/src/pages/marketing/home/Home.tsx` (landing home entry)
- `client/src/pages/marketing/components/*` (Hero, Carousel, Rating, Introduction, Feedback, FAQ, EndInvitation)
- `client/src/pages/dashboard/home/Home.tsx` (dashboard home entry)
- Router currently imports both pages directly from `@/pages/*` in `client/src/app/router.tsx`

### Compliance gaps vs project rules
- Home pages are in `pages/` instead of feature modules, causing feature logic/UI dispersion.
- Marketing section components live under `pages/marketing/components`, not inside a self-contained feature slice.
- Dashboard home uses layout import path `@/components/layouts/dashboard/MarketingLayout` (naming mismatch).

### Constraints to preserve
- Keep current URLs unchanged (`/`, `/marketing`, `/dashboard`).
- Keep route lazy-loading in `router.tsx`.
- Keep Client styling strategy: CSS Modules only.
- No behavioral/UI scope expansion during migration.

---

## 2) Target Architecture (Feature-First)

## 2.1 Folder blueprint

```text
client/src/features/
├── marketing/
│   ├── pages/
│   │   └── home-page/
│   │       ├── home-page.tsx
│   │       └── home-page.module.css
│   ├── components/
│   │   ├── hero/
│   │   │   ├── hero.tsx
│   │   │   └── hero.module.css
│   │   ├── carousel/
│   │   ├── rating/
│   │   ├── introduction/
│   │   ├── feedback/
│   │   ├── faq/
│   │   └── end-invitation/
│   └── index.ts
│
└── dashboard/
	 ├── pages/
	 │   └── home-page/
	 │       ├── home-page.tsx
	 │       └── home-page.module.css
	 ├── components/
	 │   └── (future dashboard widgets only)
	 └── index.ts
```

## 2.2 Layer responsibilities
- `app/router.tsx`: only route composition + lazy imports.
- `features/marketing`: owns marketing home page and its section components.
- `features/dashboard`: owns dashboard home page screen-level logic.
- `components/layouts/*`: shared layout wrappers only (no page business logic).

---

## 3) File-by-File Migration Map

## 3.1 Marketing
- Move `client/src/pages/marketing/home/Home.tsx` -> `client/src/features/marketing/pages/home-page/home-page.tsx`
- Move `client/src/pages/marketing/home/Home.module.css` -> `client/src/features/marketing/pages/home-page/home-page.module.css`
- Move each section component:
  - `.../pages/marketing/components/Hero/*` -> `.../features/marketing/components/hero/*`
  - `.../Carousel/*` -> `.../components/carousel/*`
  - `.../Rating/*` -> `.../components/rating/*`
  - `.../Introduction/*` -> `.../components/introduction/*`
  - `.../Feedback/*` -> `.../components/feedback/*`
  - `.../FAQ/*` -> `.../components/faq/*`
  - `.../EndInvitation/*` -> `.../components/end-invitation/*`
- Add `client/src/features/marketing/index.ts` exporting `MarketingHomePage`.

## 3.2 Dashboard
- Move `client/src/pages/dashboard/home/Home.tsx` -> `client/src/features/dashboard/pages/home-page/home-page.tsx`
- Move `client/src/pages/dashboard/home/Home.module.css` -> `client/src/features/dashboard/pages/home-page/home-page.module.css`
- Add `client/src/features/dashboard/index.ts` exporting `DashboardHomePage`.

## 3.3 Router update
- Replace lazy imports in `client/src/app/router.tsx`:
  - `@/pages/marketing/home/Home` -> `@/features/marketing/pages/home-page/home-page`
  - `@/pages/dashboard/home/Home` -> `@/features/dashboard/pages/home-page/home-page`

## 3.4 Layout naming cleanup (non-breaking, same behavior)
- Rename dashboard layout file for clarity:
  - `client/src/components/layouts/dashboard/MarketingLayout.tsx`
  - -> `client/src/components/layouts/dashboard/DashboardLayout.tsx`
- Update imports in dashboard feature page accordingly.

---

## 4) Implementation Rollout Plan (Safe Sequence)

1. **Create destination feature folders**
	- Scaffold target folders/files under `features/marketing` and `features/dashboard`.
2. **Move marketing files first**
	- Move home page + all section components.
	- Fix relative imports to absolute aliases (`@/...`) where possible.
3. **Move dashboard home files**
	- Move dashboard home page and keep behavior unchanged (logout + navigate).
4. **Update router imports**
	- Point lazy routes to new feature page paths.
5. **Add feature barrel exports**
	- `features/marketing/index.ts`, `features/dashboard/index.ts`.
6. **Clean old `pages/` leftovers**
	- Remove migrated files/folders only after successful type/lint checks.
7. **Run validation**
	- TypeScript check + lint in `client`.

---

## 5) Definition of Done (Enterprise Acceptance)

- No route path changes and no regression on `/`, `/marketing`, `/dashboard`.
- `client/src/pages/marketing/*` and `client/src/pages/dashboard/*` no longer host migrated home implementations.
- Home implementations are fully feature-owned under `client/src/features/marketing` and `client/src/features/dashboard`.
- `router.tsx` keeps `React.lazy` route-level code splitting.
- No `any`, no style-system violation (CSS Modules maintained).
- `tsc` and lint pass for client app.

---

## 6) Risks & Mitigations

- **Risk:** broken relative imports after moves.
  - **Mitigation:** standardize imports to `@/` aliases during migration.
- **Risk:** case-sensitive path issues in CI/Linux.
  - **Mitigation:** normalize file naming to one convention and verify all import casing.
- **Risk:** dead references from old `pages/*` paths.
  - **Mitigation:** global search for `@/pages/marketing/home|@/pages/dashboard/home` before cleanup.

---

## 7) Rollback Strategy

- Keep migration in one feature branch.
- If regression occurs, revert only router import commit first to restore runtime quickly.
- Reapply migration in smaller commits: marketing first, dashboard second.

---

## 8) Optional Optimization After Migration (Phase 2)

- Add `features/marketing/pages/home-page/index.ts` and `features/dashboard/pages/home-page/index.ts` for cleaner imports.
- Introduce lightweight route modules (`marketing.routes.ts`, `dashboard.routes.ts`) to keep `app/router.tsx` small.
- Add component tests for critical marketing sections and dashboard home logout CTA flow.

