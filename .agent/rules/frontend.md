---
trigger: always_on
---


# UNILISH PROJECT ARCHITECTURE & CONTEXT

## 1. Project Identity
**Unilish** is a comprehensive EdTech platform offering Contextual Learning.
- **Architecture:** Monorepo-style (Client, Admin, Server).
- **Core Stack:** MERN (MongoDB, Express, React, Node.js).
- **Key Features:** AI Speaking Coach, RAG Chatbot, YouTube Gap-Fill, Contextual Lessons.

---

## 2. Technology Stack (Frontend)

| Category | Client (User App) | Admin (CMS) |
| :--- | :--- | :--- |
| **Framework** | React 18+ (Vite) | React 18+ (Vite) |
| **Language** | TypeScript (Strict) | TypeScript (Strict) |
| **Styling Strategy** | **Hybrid:**<br>1. Marketing Pages: **CSS Modules**<br>2. App Dashboard: **Tailwind + Shadcn/UI** | **Unified:**<br>100% **Tailwind + Shadcn/UI** |
| **Server State** | TanStack Query (React Query) v5 | TanStack Query (React Query) v5 |
| **Client State** | Zustand | Zustand |
| **Routing** | React Router Dom v6+ | React Router Dom v6+ |
| **Forms** | React Hook Form + Zod | React Hook Form + Zod |
| **Media Handling** | Cloudinary (Images) + R2 (Audio/Video) | Custom `FileUploader` (Hybrid) |

---

## 3. Directory Structure: CLIENT (`/client`)

We follow a **Feature-Sliced Design (Lite)** approach.

```text
client/src/
├── app/                      # GLOBAL CONFIGURATION
│   ├── router.tsx            # Route definitions
│   ├── providers.tsx         # Provider Wrappers (QueryClient, Auth, Theme)
│   └── global.css            # Tailwind directives + CSS Reset
│
├── assets/                   # STATIC ASSETS
│   ├── fonts/
│   ├── icons/
│   └── images/
│
├── components/               # DUMB COMPONENTS (UI Library - Reusable)
│   ├── ui/                   # Shadcn UI (Button, Input, Card...)
│   ├── common/               # App-specific shared UI (Logo, Loading, ThemeToggle)
│   └── layouts/              # Layout Wrappers
│       ├── MarketingLayout.tsx  # Header/Footer for Landing
│       └── DashboardLayout.tsx  # Sidebar/Navbar for App
│
├── config/                   # ENVIRONMENTAL CONFIG
│   ├── env.ts                # Environment validations (API_URL)
│   └── paths.ts              # Route path constants
│
├── features/                 # BUSINESS MODULES (Smart Components + Logic)
│   ├── auth/                 # Login, Register
│   ├── courses/              # Course listing, details
│   ├── learning/             # Lesson logic (Video, Quiz, Recorder)
│   ├── chat/                 # AI Chatbot logic
│   └── ...
│       ├── api/              # Axios calls specific to feature
│       ├── hooks/            # React Query hooks (useLesson, useSubmitQuiz)
│       ├── components/       # UI components specific to feature
│       ├── types/            # TypeScript interfaces specific to feature
│       └── index.ts          # Public export
│
├── hooks/                    # GLOBAL CUSTOM HOOKS
│   ├── useDebounce.ts
│   └── useOnClickOutside.ts
│
├── lib/                      # CORE LIBRARIES CONFIG
│   ├── axios.ts              # Custom Axios Instance (Interceptors)
│   ├── react-query.ts        # QueryClient Configuration
│   ├── socket.ts             # Socket.io Client Instance
│   └── utils.ts              # Shadcn utils (cn wrapper)
│
├── pages/                    # ROUTE ENTRY POINTS
│   ├── marketing/            # LANDING PAGES (Use CSS Modules)
│   │   ├── home/             # HomePage.tsx + Home.module.css
│   │   ├── about/
│   │   └── components/       # Marketing-specific UI components
│   └── dashboard/            # APP PAGES (Use Tailwind)
│       ├── DashboardHome.tsx
│       └── LearningSession.tsx
│
├── stores/                   # GLOBAL CLIENT STATE (Zustand)
└── types/                    # GLOBAL TYPES
├── App.tsx                   # Root Component
└── main.tsx                  # Application Entry Point
```

---

## 4. Directory Structure: ADMIN (`/admin`)

Optimized for Data Management, Forms, and Content Editing.

```text
admin/src/
├── app/                  # Global configuration (Router, Providers)
│
├── components/           # SHARED DUMB COMPONENTS
│   ├── ui/               # Shadcn UI (Matches Client's UI)
│   ├── common/           # Admin-specific UI
│   │   ├── DataTable.tsx # Reusable TanStack Table wrapper
│   │   ├── PageHeader.tsx
│   │   └── FileUploader.tsx # Hybrid upload (R2/Cloudinary)
│   └── layouts/          # AdminLayout (Sidebar, Header)
│
├── config/               # Navigation items, Env
│
├── features/             # CMS MODULES
│   ├── auth/             # Admin Login
│   ├── users/            # User Management (Table, Ban, Edit)
│   ├── lessons/          # CONTENT EDITOR (Complex Logic)
│   │   ├── components/
│   │   │   ├── editors/  # Specialized Editors
│   │   │   │   ├── GapFillEditor.tsx (Youtube Gap-Fill Tool)
│   │   │   │   └── QuizEditor.tsx
│   │   │   └── LessonForm.tsx
│   │   └── ...
│   ├── analytics/        # Charts & Stats
│   └── ...
│
├── hooks/                # Global hooks (useUpload)
├── lib/                  # Axios (Admin instance), Utils
├── pages/                # Route Entry Points (UsersPage, LessonsPage)
├── stores/               # Admin State (Sidebar toggle)
└── types/                # Global Types

```

---

## 5. Coding Rules & Guidelines (Strict Compliance)

### A. Styling Rules 🎨

1. **Client/Marketing:** MUST use **CSS Modules** (`.module.css`) for high-fidelity, custom designs. DO NOT use Tailwind utility classes for layout in marketing pages unless necessary for basic flex/grid.
2. **Client/Dashboard:** MUST use **Tailwind CSS** and **Shadcn/UI**.
3. **Admin:** MUST use **Tailwind CSS** and **Shadcn/UI** exclusively.

### B. State Management Rules 🧠

1. **Async Data (API):** ALWAYS use **React Query** custom hooks (placed in `features/*/hooks`).
* *Example:* `useCourses` (Query), `useSubmitLesson` (Mutation).


2. **UI State:** Use **Zustand** for global UI state (Sidebar, Modals).
3. **No Redux:** Do not use Redux.

### C. Component Architecture 🏗️

1. **Smart vs. Dumb:**
* **Dumb Components (`src/components`):** UI only, receive props, reusable, no API logic.
* **Smart Components (`src/features/*/components`):** Connect to stores, call hooks, handle business logic.


2. **Co-location:** Keep logic, styles, and types close to where they are used (inside `features/`).

### D. Imports & Types 📝

1. **Absolute Imports:** Always use `@/` alias.
* ✅ `import { Button } from '@/components/ui/button'`
* ❌ `import { Button } from '../../components/ui/button'`


2. **Strict Typing:** No `any`. Define interfaces in `types.ts` within features.

---

## 6. AI Code Generation Workflow

When generating code for a new feature (e.g., "YouTube Gap Fill"), follow this sequence:

1. **Define Structure:** Create folder `@/features/youtube-learning`.
2. **Types First:** Define data models in `@/features/youtube-learning/types`.
3. **API Layer:** Create axios calls in `@/features/youtube-learning/api`.
4. **Data Hooks:** Create React Query hooks in `@/features/youtube-learning/hooks`.
5. **UI Components:** Build Smart Components in `@/features/youtube-learning/components` using Shadcn.
6. **Page Assembly:** Assemble components into a page in `@/pages/dashboard/YoutubePage.tsx`.