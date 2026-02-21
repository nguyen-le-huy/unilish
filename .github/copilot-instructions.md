# UNILISH ENTERPRISE CODING STANDARDS (GITHUB COPILOT INSTRUCTIONS)

You are an expert Senior Software Engineer working on **Unilish**, an AI-Powered Adaptive Language Learning Platform.
Your goal is to generate code that is **Production-Ready**, **Strictly Typed**, **Performant**, and **Architecturally Compliant**.

---

## 1. CRITICAL ARCHITECTURAL CONTEXT

### A. The Polyglot Persistence Strategy
We do NOT use a single database. Choose the correct store for the data type:

| Store | Technology | Use Case |
| --- | --- | --- |
| **Operational DB** | **MongoDB Atlas** (Mongoose) | System of Record: Users, Lessons, Progress, Payments |
| **Vector DB** | **Pinecone Serverless** | Semantic Search, Adaptive Recommendations, RAG Chatbot |
| **Speed Layer** | **Redis (Cluster)** | Session cache, BullMQ job queues, real-time leaderboard |
| **Analytics** | **ClickHouse** | High-volume user behavior logs, ML pipeline input |
| **Object Storage** | **Cloudflare R2** | Raw audio/video/PDF (S3-compatible, zero egress fees) |
| **Media CDN** | **Cloudinary (Enterprise)** | Auto-format (WebP/AVIF), adaptive bitrate streaming |

> ⚠️ **IMPORTANT**: The project uses **Pinecone**, NOT Neo4j. There is no graph database. Vector embeddings power all knowledge/recommendation features.

### B. Server Architecture: Service-Repository Pattern
3-layer separation — never skip layers:
*   **Controller** (`controllers/`): HTTP adapter only. Validates input (Zod), calls Service, returns response.
*   **Service** (`services/`): Business logic. The ONLY layer that orchestrates across multiple repositories.
*   **Repository** (`repositories/`): Data access only. Two sub-types:
    *   `repositories/mongo/` — extends `BaseMongoRepository`, uses Mongoose only.
    *   `repositories/vector/` — extends `BaseVectorRepository`, uses Pinecone SDK only.

### C. Frontend: Feature-First Architecture
*   **Client (`/client`)**: Feature-First Design with self-contained feature modules.
*   **Admin (`/admin`)**: CRUD-optimized structure with Shadcn/UI components.
*   **Layer dependency**: `app` → `pages` → `features` → `components` → `lib`. No circular imports.

### D. The Styling "Schism" — CRITICAL, NEVER VIOLATE
*   **Client App (`/client`)**: **CSS Modules** (`.module.css`) + **GSAP**. **NO Tailwind. NO UI Libraries.**
*   **Admin App (`/admin`)**: **Tailwind CSS** + **Shadcn/UI**. No CSS Modules.

---

## 2. MANDATORY CODING RULES (DO NOT VIOLATE)

### TypeScript & Safety
1.  **NO `any`**: Use `unknown` + Zod `.parse()` if the type is uncertain.
2.  **Strict Props**: All React components MUST have explicit `interface Props { ... }`.
3.  **Async Safety**: ALL async Express controllers MUST be wrapped with `catchAsync`.
4.  **Error Handling**: Throw `AppError` for operational errors. Let the global error handler catch programmer errors.

### Performance
1.  **Backend Reads**: ALL MongoDB `find` / `findOne` operations MUST use `.lean()` and `.select()`.
2.  **Frontend State**: NEVER use `useEffect` for data fetching. Use **TanStack Query** (`useQuery`, `useMutation`).
3.  **Lists**: Lists > 50 items MUST use `react-window` (virtualization).
4.  **Code Splitting**: All routes MUST be lazy-loaded with `React.lazy`.
5.  **Re-renders**: Use `useMemo` / `useCallback` for props passed to children. Use `React.memo` for pure leaf nodes.

### Security
1.  **Validation**: ALL API inputs (Body/Query/Params) MUST pass a **Zod middleware** before reaching the controller.
2.  **Secrets**: NEVER hardcode API keys or connection strings. Use `config/env.ts` (validated by Zod on startup).
3.  **Logging**: `console.log` is **BANNED**. Use `Logger.info()` / `Logger.warn()` / `Logger.error()` (Winston).
4.  **Security Middleware**: `helmet`, `cors`, and `rate-limit` MUST be initialized in `app.ts` before any routes.

---

## 3. CODE GENERATION PATTERNS

### A. Backend Controller (Standard)
```typescript
// server/src/controllers/user.controller.ts
import { catchAsync } from '@/utils/catchAsync';
import { UserService } from '@/services/user.service';
import { sendResponse } from '@/utils/response';

export const getUserProfile = catchAsync(async (req, res) => {
  const { userId } = req.params; // Already validated by Zod middleware
  const user = await UserService.getProfile(userId);
  sendResponse(res, 200, 'Profile retrieved', user);
});
```

### B. Backend Service (Polyglot — Mongo + Pinecone)
```typescript
// server/src/services/lesson.service.ts
import { LessonMongoRepo } from '@/repositories/mongo/lesson.mongo.repo';
import { KnowledgeVectorRepo } from '@/repositories/vector/knowledge.vector.repo';

export class LessonService {
  // Service is the ONLY layer that talks to multiple repos
  static async createLesson(data: CreateLessonDto) {
    // 1. Save content to MongoDB (Source of Truth)
    const lesson = await LessonMongoRepo.create(data);
    // 2. Generate and upsert embedding to Pinecone
    await KnowledgeVectorRepo.upsert({ id: lesson._id.toString(), ...data });
    return lesson;
  }
}
```

### C. MongoDB Repository (Lean + Select required)
```typescript
// server/src/repositories/mongo/user.mongo.repo.ts
import { UserModel } from '@/models/mongo/user.model';

export class UserMongoRepo {
  static async findById(userId: string) {
    // .lean() + .select() are MANDATORY for all reads
    return UserModel.findById(userId).select('name email role').lean();
  }
}
```

### D. Pinecone Vector Repository
```typescript
// server/src/repositories/vector/knowledge.vector.repo.ts
import { getPineconeIndex } from '@/config/database.pinecone';

export class KnowledgeVectorRepo {
  static async similaritySearch(vector: number[], topK = 5) {
    const index = getPineconeIndex();
    return index.query({ vector, topK, includeMetadata: true });
  }
}
```

### E. Frontend Component (Client App — CSS Modules)
```typescript
// client/src/features/auth/components/LoginForm/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../validation/login.schema';
import { useLogin } from '../hooks/useLogin';
import styles from './LoginForm.module.css'; // CSS Modules — MANDATORY for /client

interface Props {
  onSuccess?: () => void;
}

export const LoginForm = ({ onSuccess }: Props) => {
  const { mutate, isPending } = useLogin({ onSuccess });
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form className={styles.container} onSubmit={handleSubmit((d) => mutate(d))}>
      <input className={styles.input} {...register('email')} aria-label="Email" />
      {errors.email && <span className={styles.error}>{errors.email.message}</span>}
      <button className={styles.submitButton} type="submit" disabled={isPending}>
        {isPending ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};
```

### F. TanStack Query Hook (Data Fetching)
```typescript
// client/src/features/learning/hooks/useLessonQuery.ts
import { useQuery } from '@tanstack/react-query';
import { lessonApi } from '../api/lessonService';

export const useLessonQuery = (lessonId: string) => {
  return useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => lessonApi.getById(lessonId),
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

---

## 4. DIRECTORY & FILE NAMING
*   **Files**: `kebab-case.ts` / `kebab-case.tsx` (e.g., `user.mongo.repo.ts`, `login-form.tsx`).
*   **Classes/Components**: `PascalCase` (e.g., `UserService`, `LessonMongoRepo`, `LoginForm`).
*   **Variables/Functions**: `camelCase`.
*   **Constants/Env Keys**: `UPPER_SNAKE_CASE`.
*   **CSS Module classes**: `camelCase` (e.g., `.submitButton`, `.isActive`).

---

## 5. KEY DIRECTORY PATHS

```
server/src/
├── config/           # env.ts, database.mongo.ts, database.pinecone.ts, redis.ts
├── controllers/      # HTTP layer only — thin, no business logic
├── services/         # Business logic — orchestrates across repos
├── repositories/
│   ├── mongo/        # Mongoose-only operations
│   └── vector/       # Pinecone SDK-only operations
├── models/
│   ├── mongo/        # Mongoose schemas
│   └── vector/       # Vector metadata type definitions
├── middlewares/      # auth, error, validate (Zod)
├── validations/      # Zod schemas for all API inputs
├── jobs/             # BullMQ queues + workers
├── socket/           # Socket.io + Redis adapter
└── utils/            # logger.ts (Winston), catchAsync, sendResponse

client/src/
├── features/         # Self-contained feature modules (api/, hooks/, components/, pages/, types/)
├── components/
│   ├── core/         # Design system (CSS Modules + Vitest tests)
│   ├── common/       # App-specific shared UI (Logo, PageLoader)
│   └── layouts/      # MarketingLayout, DashboardLayout
├── assets/styles/    # _variables.css, _reset.css, _typography.css, global.css
├── stores/           # Zustand (UI state ONLY — theme, modals)
└── lib/              # axios.ts, react-query.ts, utils.ts

admin/src/
├── features/         # CMS modules (users, lessons, analytics)
├── components/
│   ├── ui/           # Shadcn/UI components
│   └── layouts/      # AdminLayout
└── lib/              # utils.ts (cn helper)
```

---

## 6. BEFORE GENERATING ANY CODE — CHECK THESE
1.  *"Which app is this for: `/client` (CSS Modules + GSAP) or `/admin` (Tailwind + Shadcn)?"*
2.  *"Is this a read query? Did I add `.lean()` and `.select()` to the Mongoose call?"*
3.  *"Is my React component typed? Does it have `interface Props`?"*
4.  *"Is business logic in the Service layer, not the Controller?"*
5.  *"Am I using the right data store? (Mongo for documents, Pinecone for vectors, Redis for cache/queues)"*
6.  *"Is every async controller wrapped in `catchAsync`?"*
7.  *"Are all API inputs validated by a Zod schema before reaching the controller?"*
