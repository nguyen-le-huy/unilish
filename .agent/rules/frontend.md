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

| **Thành phần** | **Công nghệ sử dụng** | **Vai trò & Lý do lựa chọn (Chuẩn Enterprise)** |
| --- | --- | --- |
| **Core Framework** | **React.js (Vite)** | Chuẩn công nghiệp hiện tại. Vite giúp build cực nhanh, HMR (Hot Module Replacement) tức thì. |
| **Ngôn ngữ** | **TypeScript** | **Bắt buộc.** Đảm bảo Type Safety, code dễ bảo trì (maintainable) khi team scale lên nhiều người. |
| **Server State** | **TanStack Query (React Query)** | Quản lý Caching, Deduplication, Re-validation dữ liệu từ API. Giúp app nhanh như cắt, giảm tải gọi API thừa. |
| **Client State** | **Zustand** | Chỉ dùng để lưu trạng thái UI toàn cục (Global UI State) như: Theme, Modal mở/đóng, Audio Player đang chạy bài nào. |
| **Form Management** | **React Hook Form** | Xử lý form phức tạp với hiệu năng cao (uncontrolled components), giảm render lại không cần thiết. |
| **Schema Validation** | **Zod** | Kết hợp với React Hook Form để validate dữ liệu chặt chẽ ngay từ phía Client. |
| **Styling** | **CSS Modules** (Client)<br>**TailwindCSS** (Admin) | **CSS Modules:** Scoped styles (tự động hash tên class) giúp tránh xung đột class 100%. |
| **Hiệu ứng** | **GSAP** | Dùng GSAP cho animation. |
| **Realtime Client** | **Socket.io-client** | Chuẩn mực cho kết nối 2 chiều. |
| **Video/Audio Call** | **LiveKit (hoặc PeerJS)** | *Lưu ý:* Enterprise thường chuộng **LiveKit** (Open source WebRTC infrastructure) hơn PeerJS vì độ ổn định cao hơn khi scale user. |
| **Testing** | **Vitest + React Testing Library** | **Bắt buộc** với dự án lớn. Đảm bảo tính năng không bị lỗi khi refactor code. |

---

## 3. Directory Structure: CLIENT (`/client`)

**Strategy:** Feature-First Design + CSS Modules + Testing.

**Key Principle:** Each feature is self-contained and manages its own pages, components, logic, and state.

```text
client/src/
├── app/                      # CORE CONFIG
│   ├── App.tsx               # Root Component (MobileBlocker, RouterProvider)
│   ├── ProtectedRoute.tsx    # Auth Guard Component
│   ├── router.tsx            # Route definitions (imports pages from features)
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
├── components/               # SHARED DUMB COMPONENTS ONLY
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
├── features/                 # FEATURE MODULES (Self-Contained)
│   │
│   ├── auth/                 # Authentication Feature
│   │   ├── pages/            # Auth Pages
│   │   │   ├── LoginPage/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── LoginPage.module.css
│   │   │   ├── RegisterPage/
│   │   │   └── ForgotPasswordPage/
│   │   ├── components/       # Auth-specific Components
│   │   │   ├── LoginForm/
│   │   │   └── SocialButtons/
│   │   ├── api/              # authService.ts
│   │   ├── hooks/            # useAuth.ts, useLogin.ts
│   │   ├── types/            # IUser.ts, IAuthResponse.ts
│   │   ├── store/            # auth.store.ts (Zustand - if needed)
│   │   └── index.ts          # Public API (exports pages + components)
│   │
│   ├── learning/             # Learning Feature
│   │   ├── pages/            # Learning Pages
│   │   │   ├── LessonPage/
│   │   │   │   ├── LessonPage.tsx
│   │   │   │   └── LessonPage.module.css
│   │   │   ├── LessonListPage/
│   │   │   └── QuizPage/
│   │   ├── components/       # Learning-specific Components
│   │   │   ├── VideoPlayer/  # LiveKit Integration
│   │   │   │   ├── VideoPlayer.tsx
│   │   │   │   └── VideoPlayer.module.css
│   │   │   ├── LessonCard/
│   │   │   └── QuizWidget/
│   │   ├── api/              # lessonService.ts
│   │   ├── hooks/            # useLessonQuery.ts, useQuizSubmit.ts
│   │   ├── types/            # ILesson.ts, IQuiz.ts
│   │   └── index.ts          # Public API
│   │
│   ├── marketing/            # Marketing/Landing Feature
│   │   ├── pages/
│   │   │   ├── HomePage/
│   │   │   │   ├── HomePage.tsx
│   │   │   │   └── HomePage.module.css
│   │   │   ├── AboutPage/
│   │   │   └── PricingPage/
│   │   ├── components/
│   │   │   ├── Hero/
│   │   │   ├── Features/
│   │   │   └── Testimonials/
│   │   └── index.ts
│   │
│   ├── profile/              # User Profile Feature
│   │   ├── pages/
│   │   │   ├── ProfilePage/
│   │   │   └── SettingsPage/
│   │   ├── components/
│   │   │   ├── ProfileCard/
│   │   │   └── AvatarUpload/
│   │   ├── api/              # profileService.ts
│   │   ├── hooks/            # useProfile.ts
│   │   └── index.ts
│   │
│   └── ...                   # Other features follow same pattern
│
├── hooks/                    # GLOBAL HOOKS ONLY
│   ├── useDebounce.ts
│   ├── useOnClickOutside.ts
│   └── useMediaQuery.ts
│
├── lib/                      # UTILITIES
│   ├── axios.ts              # Axios Instance
│   ├── react-query.ts        # React Query Config
│   └── utils.ts              # Class merging utility (cn)
│
├── stores/                   # GLOBAL STATE ONLY (Zustand)
│   └── theme.store.ts        # Theme, UI state (không dùng cho feature-specific state)
│
├── types/                    # GLOBAL TYPES ONLY
│   └── common.ts             # Shared types across features
│
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