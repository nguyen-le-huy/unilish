---
trigger: always_on
---

# UNILISH PROJECT ARCHITECTURE & CONTEXT

## 1. Project Identity

**Unilish** is a comprehensive EdTech platform offering Contextual Learning.

* **Architecture:** Monorepo-style (Client, Admin, Server).
* **Core Stack:** MERN (MongoDB, Express, React, Node.js).

---

## 2. Technology Stack (Frontend)

| Category | Client (User App) | Admin (CMS) |
| --- | --- | --- |
| **Core Framework** | **React 18+ (Vite)**<br>

<br>*(Build siêu tốc, HMR tức thì)* | **React 18+ (Vite)** |
| **Language** | **TypeScript (Strict)**<br>

<br>*(Bắt buộc để dễ maintain)* | **TypeScript (Strict)** |
| **Styling** | **CSS Modules** (`*.module.css`)<br>

<br>*(Scoped styles, tránh xung đột 100%)* | **Tailwind CSS + Shadcn/UI**<br>

<br>*(Phát triển nhanh)* |
| **State Management** | **TanStack Query** (Server State)<br>

<br>**Zustand** (Global UI State) | **TanStack Query**<br>

<br>**Zustand** |
| **Form Handling** | **React Hook Form + Zod**<br>

<br>*(Hiệu năng cao, validate chặt)* | **React Hook Form + Zod** |
| **Animation** | **GSAP**<br>

<br>*(Hiệu ứng phức tạp, mượt mà)* | CSS Transitions cơ bản |
| **Realtime/Media** | **Socket.io** (Signaling)<br>

<br>**LiveKit** (WebRTC Infrastructure) | Custom FileUploader |
| **Testing** | **Vitest + React Testing Library**<br>

<br>*(Bắt buộc cho Logic & Components)* | N/A |

---

## 3. Directory Structure: CLIENT (`/client`)

**Strategy:** Feature-Sliced Design (Lite) + CSS Modules + Testing.

```text
client/src/
├── app/                      # CORE CONFIG
│   ├── App.tsx               # Root Component (MobileBlocker, RouterProvider)
│   ├── ProtectedRoute.tsx    # Auth Guard Component
│   ├── router.tsx            # Route definitions
│   ├── providers.tsx         # Wrappers (QueryClient, Clerk Auth, Toaster)
│   └── main.tsx              # Entry point
│
├── assets/                   # ASSETS & GLOBAL STYLES
│   ├── fonts/
│   ├── icons/
│   └── styles/               # CSS ARCHITECTURE
│       ├── _variables.css    # Colors, Spacing, Radius (--primary: #007bff)
│       ├── _reset.css        # CSS Reset
│       ├── _typography.css   # Global Font Sizes
│       ├── _animations.css   # Global Keyframes
│       └── global.css        # Main import file
│
├── components/               # SHARED DUMB COMPONENTS
│   ├── core/                 # CUSTOM DESIGN SYSTEM (CSS Modules)
│   │   ├── Button/           # Isolated Component
│   │   │   ├── Button.tsx
│   │   │   ├── Button.module.css
│   │   │   └── Button.test.tsx # Unit Test (Vitest)
│   │   ├── Input/
│   │   ├── Modal/
│   │   └── Skeleton/
│   │
│   ├── common/               # App-specific Shared UI
│   │   ├── Logo/
│   │   ├── PageLoader/       # Dùng GSAP cho loading animation
│   │   └── ErrorBoundary/
│   │
│   └── layouts/              # Layout Wrappers
│       ├── MarketingLayout/
│       └── DashboardLayout/
│
├── config/                   # CONSTANTS
│   ├── env.ts                # Validate ENV (LiveKit URL, API URL)
│   └── paths.ts
│
├── features/                 # BUSINESS MODULES
│   ├── auth/
│   ├── learning/
│   │   ├── api/              # lessonService.ts
│   │   ├── hooks/            # useLessonQuery.ts
│   │   ├── components/
│   │   │   ├── VideoPlayer/  # Logic LiveKit/Video
│   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   └── VideoPlayer.module.css
│   │   ├── types/            # ILesson.ts
│   │   └── index.ts          # Public API
│   └── ...
│
├── hooks/                    # GLOBAL HOOKS
│   ├── useDebounce.ts
│   └── useOnClickOutside.ts
│
├── lib/                      # UTILITIES
│   ├── axios.ts              # Axios Instance
│   ├── react-query.ts        # React Query Config
│   └── utils.ts              # Class merging utility (cn)
│
├── pages/                    # ROUTE ENTRY POINTS
│   ├── marketing/
│   └── dashboard/
│
├── stores/                   # GLOBAL STATE (Zustand)
│   └── auth.store.ts         # Auth state (Zustand)
│
├── types/                    # GLOBAL TYPES
└── test/                     # TEST SETUP
    └── setup.ts              # Vitest config

```

---

## 4. Directory Structure: ADMIN (`/admin`)

**Strategy:** Optimized for CRUD & Management speed.

```text
admin/src/
├── app/
├── components/               # SHARED COMPONENTS
│   ├── ui/                   # SHADCN UI (Button, Input, Table...)
│   ├── common/               # Admin specific (DataTable, PageHeader)
│   └── layouts/              # AdminLayout
├── features/                 # CMS MODULES
│   ├── users/
│   ├── lessons/              # Lesson Editor
│   └── analytics/
├── lib/                      # UTILITIES
│   └── utils.ts              # Shadcn utility (cn)
└── ...

```

---

## 5. Coding Rules & Guidelines (Strict Compliance)

### A. Styling Rules

1. **Client (User App):**
* **MUST** use **CSS Modules** (`.module.css`).
* **MUST** use CSS Variables from `@/assets/styles/_variables.css`.
* **Animation:** Use **GSAP** for complex interactions (Page transitions, Hero effects).
* *Naming:* camelCase for classes (e.g., `.submitButton`, `.isActive`).


2. **Admin (CMS):**
* **MUST** use **Tailwind CSS** + **Shadcn/UI**.



### B. State Management Rules

1. **Server State:** ALWAYS use **TanStack Query** (Caching, Deduplication).
2. **Client State:** Use **Zustand** for UI state only.
3. **Realtime State:** Use **LiveKit** SDK hooks for managing Room/Participant state (not Redux/Zustand).

### C. Testing Strategy (Enterprise Mandatory)

1. **Unit Tests:** Use **Vitest** for all generic utilities (`lib/`) and complex hooks (`hooks/`).
2. **Component Tests:** Use **React Testing Library** for core UI components (`components/core`).
3. **Rule:** Không merge code nếu coverage dưới 80% cho các module quan trọng.

---

## 6. AI Code Generation Workflow

### **Scenario A: Generating for CLIENT (Visuals)**

1. **Prompt:** "Create a landing page Hero section."
2. **Requirement:** "Use **CSS Modules** for layout. Use **GSAP** to animate the headline entering from the left."
3. **Process:**
* `Hero.tsx` (Markup + GSAP `useGSAP` hook).
* `Hero.module.css` (Static styling).



### **Scenario B: Generating for CLIENT (Realtime)**

1. **Prompt:** "Create a Voice Room component."
2. **Requirement:** "Use **LiveKit** React SDK."
3. **Process:**
* Implement `<LiveKitRoom>` provider.
* Use `useTracks` hook to render audio tiles.



*Last Updated: 2026-02-05*