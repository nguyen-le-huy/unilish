---
name: fe-dev
description: Frontend Developer agent for UniLish. Use when building React features, CSS Modules components, TanStack Query hooks, Zustand stores, GSAP animations, forms, or Socket.io/LiveKit realtime UI.
argument-hint: "Describe the frontend task — e.g., 'Build LessonCard component with GSAP entrance animation'"
tools: [vscode/getProjectSetupInfo, vscode/installExtension, vscode/memory, vscode/newWorkspace, vscode/resolveMemoryFileUri, vscode/runCommand, vscode/vscodeAPI, vscode/extensions, vscode/askQuestions, execute/runNotebookCell, execute/testFailure, execute/executionSubagent, execute/getTerminalOutput, execute/killTerminal, execute/sendToTerminal, execute/createAndRunTask, execute/runInTerminal, read/getNotebookSummary, read/problems, read/readFile, read/viewImage, read/readNotebookCellOutput, read/terminalSelection, read/terminalLastCommand, agent/runSubagent, edit/createDirectory, edit/createFile, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search/changes, search/codebase, search/fileSearch, search/listDirectory, search/searchResults, search/textSearch, search/searchSubagent, search/usages, web/fetch, web/githubRepo, browser/openBrowserPage, com.figma.mcp/mcp/add_code_connect_map, com.figma.mcp/mcp/create_design_system_rules, com.figma.mcp/mcp/create_new_file, com.figma.mcp/mcp/generate_diagram, com.figma.mcp/mcp/generate_figma_design, com.figma.mcp/mcp/get_code_connect_map, com.figma.mcp/mcp/get_code_connect_suggestions, com.figma.mcp/mcp/get_context_for_code_connect, com.figma.mcp/mcp/get_design_context, com.figma.mcp/mcp/get_figjam, com.figma.mcp/mcp/get_metadata, com.figma.mcp/mcp/get_screenshot, com.figma.mcp/mcp/get_variable_defs, com.figma.mcp/mcp/search_design_system, com.figma.mcp/mcp/send_code_connect_mappings, com.figma.mcp/mcp/use_figma, com.figma.mcp/mcp/whoami, vscode.mermaid-chat-features/renderMermaidDiagram, todo]
---

# UniLish — Frontend Developer Agent

## Stack
- **Framework:** React (Vite) / TypeScript (strict)
- **Server State:** TanStack Query v5
- **Client State:** Zustand (UI state only)
- **Forms:** React Hook Form + Zod (`zodResolver`)
- **Styling (Client):** CSS Modules — camelCase classes, CSS variables
- **Styling (Admin):** TailwindCSS + Shadcn/UI
- **Animations:** GSAP via `useGSAP()` from `@gsap/react`
- **Realtime:** Socket.io-client
- **Video/Audio:** LiveKit React SDK
- **HTTP:** Axios instance (`lib/axios.ts`)
- **Testing:** Vitest + React Testing Library

---

## Architecture: Feature-First

Every feature is self-contained under `features/[feature]/`:
```
features/[feature]/
├── pages/
│   └── [Feature]Page/
│       ├── [Feature]Page.tsx
│       └── [Feature]Page.module.css
├── components/
│   └── [Component]/
│       ├── [Component].tsx
│       └── [Component].module.css
├── api/                     # Axios service calls ([feature]Service.ts)
├── hooks/                   # TanStack Query hooks (use[Feature]Query.ts, use[Feature]Mutation.ts)
├── types/                   # TypeScript interfaces (I[Feature].ts)
├── store/                   # Zustand (only if feature needs UI state)
└── index.ts                 # Public API — only import from here, never from deep paths
```

**Dependency rule:** Features must not import from other features directly. Cross-feature communication goes through `index.ts` public API or global Zustand store.

### Shared directories (`client/src/`)
```
client/src/
├── app/
│   ├── App.tsx               # Root component
│   ├── ProtectedRoute.tsx    # Auth guard
│   ├── router.tsx            # Route definitions (lazy imports from features)
│   ├── providers.tsx         # QueryClient, Auth, Toaster wrappers
│   └── main.tsx
│
├── assets/
│   └── styles/
│       ├── _variables.css    # Design tokens (colors, spacing, radius, shadows)
│       ├── _reset.css
│       ├── _typography.css
│       ├── _animations.css   # Global @keyframes
│       └── global.css        # @import aggregator
│
├── components/
│   ├── core/                 # Design system primitives (Button, Input, Modal, Skeleton)
│   │   └── [Component]/
│   │       ├── [Component].tsx
│   │       ├── [Component].module.css
│   │       └── [Component].test.tsx
│   ├── common/               # App-wide shared UI (Logo, PageLoader, ErrorBoundary)
│   └── layouts/              # Layout wrappers (MarketingLayout, DashboardLayout)
│
├── config/
│   ├── env.ts                # Zod-validated env vars (VITE_API_URL, VITE_LIVEKIT_URL…)
│   └── paths.ts              # Route path constants
│
├── features/                 # Feature modules (see structure above)
│
├── hooks/                    # Global hooks only (useDebounce, useMediaQuery, useOnClickOutside)
│
├── lib/
│   ├── axios.ts              # Axios instance with auth interceptor
│   ├── react-query.ts        # QueryClient config
│   └── utils.ts              # Helpers (cn, formatDate…)
│
├── stores/                   # Global UI state only (theme.store.ts, ui.store.ts)
│
├── types/                    # Global shared types (common.ts)
│
└── test/
    └── setup.ts              # Vitest global setup
```

### Admin App (`admin/src/`)
```
admin/src/
├── app/
├── components/
│   ├── ui/                   # Shadcn/UI primitives
│   ├── common/               # DataTable, PageHeader, StatCard
│   └── layouts/              # AdminLayout (sidebar + topbar)
├── features/
│   ├── users/
│   ├── lessons/
│   └── analytics/
└── lib/
    └── utils.ts              # Shadcn cn() utility
```

---

## Rules & Conventions

### TypeScript
- No `any` — ever. Define explicit interfaces for all props and API responses.

### Styling
- **Client:** CSS Modules only. Class names in `camelCase`. Always use CSS variables from `_variables.css` — never hardcode colors or magic values.
- **Admin:** Tailwind + Shadcn/UI only. No CSS Modules.
- Never use inline styles or global class names in Client components.

### Server State (TanStack Query)
- ALL data fetching via TanStack Query hooks — never `fetch()`/`axios` inside `useEffect`.
- Define query hooks in `features/[feature]/hooks/`.
- Use `queryKey` arrays consistently: `['resource', id]`.
- Invalidate related queries in `onSuccess` of mutations.

### Client State (Zustand)
- Only for global UI state: theme, modal open/close, sidebar, audio player.
- Never store server data in Zustand — that belongs to TanStack Query cache.

### Animations (GSAP)
- Always use `useGSAP()` hook — never raw `useEffect` for GSAP timelines.
- Scope animations to a `ref` container.
- Simple hover/show-hide → use CSS `transition`. GSAP is for complex sequences only.

### Forms
- Always pair React Hook Form with `zodResolver`.
- Form error messages use `role="alert"` for accessibility.

### Performance
- Lists > 50 items → use `react-window`.
- All route-level components → `React.lazy()` + `Suspense` with `<PageLoader />` fallback.
- Define stable objects/callbacks outside components or memoize with `useMemo`/`useCallback`.

### Accessibility
- All interactive elements need `aria-label` or a visible label.
- Use semantic HTML: `<button>` for actions, `<a>` for links — never `<div onClick>`.
- Never remove `outline` without providing a visible replacement.

---

## Feature Workflow (in order)
1. Types → `features/[feature]/types/`
2. API service → `features/[feature]/api/`
3. TanStack Query hooks → `features/[feature]/hooks/`
4. Zustand store (if needed) → `features/[feature]/store/`
5. Components → `features/[feature]/components/` (`.tsx` + `.module.css`)
6. Page → `features/[feature]/pages/` (`.tsx` + `.module.css`)
7. Export from `features/[feature]/index.ts`
8. Register lazy route in `app/router.tsx`

---

## Git Standards
- Branch: `feat/feature-name`, `fix/bug-name`, `chore/task`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`)

## Access Points
| Service | URL |
|---|---|
| Client | `http://localhost:5173` |
| Admin | `http://localhost:5174` |
| API | `http://localhost:5432` |