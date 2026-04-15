# Unilish — GitHub Copilot Instructions

You are a Senior Engineer on **Unilish**, an AI-Powered Adaptive Language Learning Platform.
Generate code that is **production-ready**, **strictly typed**, and **architecturally compliant** with the rules below.

---

## 1. Project Overview

**Monorepo** with 3 apps:

| App | Path | Port | Styling |
|---|---|---|---|
| User-facing Client | `client/` | `5173` | CSS Modules + GSAP |
| Admin CMS | `admin/` | `5174` | TailwindCSS + Shadcn/UI |
| API Server | `server/` | `5432` | — |

---

## 2. Architecture

### Backend: Controller → Service → Repository

- **Controller** — Zod middleware validates input → calls Service → returns response. Zero business logic.
- **Service** — All business logic. The **only** layer that can call multiple repositories or external APIs.
- **Repository** — Pure data access. Two types:
  - `repositories/mongo/` — extends `BaseMongoRepository`, Mongoose only.
  - `repositories/vector/` — extends `BaseVectorRepository`, Pinecone SDK only.

### Frontend: Feature-First

Each feature under `features/[feature]/` owns its `pages/`, `components/`, `api/`, `hooks/`, `types/`, and `index.ts` (public API). No cross-feature direct imports.

### Data Stores

| Store | Use For |
|---|---|
| MongoDB Atlas (Mongoose) | Users, Lessons, Submissions, Progress |
| Pinecone | Vector embeddings, semantic search, RAG |
| Redis + BullMQ | Sessions, cache, background jobs, leaderboard |
| Cloudflare R2 | Raw audio / video / PDF |
| Cloudinary | Images (auto-WebP, CDN) |

---

## 3. Mandatory Rules

### TypeScript
- `any` is **forbidden** — use `unknown` + Zod `.parse()` for uncertain types.
- All React components must have explicit `interface Props`.

### Backend
- ALL async controllers → wrapped in `catchAsync`.
- ALL MongoDB reads → `.lean()` + `.select()`. No exceptions.
- ALL API inputs (body/query/params) → Zod middleware **before** controller.
- `console.log` is **banned** → use `Logger.info/warn/error` (Winston).
- Secrets → only via `config/env.ts` (Zod-validated on startup).
- `helmet` + `cors` + `rate-limit` → initialized in `app.ts` before any routes.
- Throw `AppError` for operational errors (4xx). Let global handler catch programmer errors.

### Frontend
- **Client** → CSS Modules only. No Tailwind, no inline styles, no UI libraries.
- **Admin** → Tailwind + Shadcn/UI only. No CSS Modules.
- Data fetching → **TanStack Query** (`useQuery`/`useMutation`). Never `useEffect` for fetching.
- Complex animations → **GSAP** via `useGSAP()`. Never raw `useEffect` for GSAP timelines.
- Zustand → UI state only (theme, modals, sidebar). Never server data.
- Lists > 50 items → `react-window`.
- All routes → `React.lazy()` + `Suspense`.
- CSS class names → `camelCase` (`.submitButton`, `.isActive`).
- CSS values → always use variables from `_variables.css`. No hardcoded hex/px.

---

## 4. Code Patterns

### Backend Controller
```typescript
// server/src/controllers/lesson.controller.ts
export const getLesson = catchAsync(async (req: Request, res: Response) => {
  const lesson = await lessonService.getById(req.params.id);
  res.status(200).json({ success: true, data: lesson });
});
```

### Backend Service (Polyglot)
```typescript
// server/src/services/lesson.service.ts
export class LessonService {
  static async create(data: CreateLessonDto) {
    const lesson = await LessonMongoRepo.create(data);               // MongoDB
    await KnowledgeVectorRepo.upsert({ id: lesson._id.toString(), ...data }); // Pinecone
    return lesson;
  }
}
```

### MongoDB Repository
```typescript
// server/src/repositories/mongo/lesson.mongo.repo.ts
export class LessonMongoRepo {
  static async findById(id: string) {
    return LessonModel.findById(id).select('title level tags').lean(); // lean() + select() MANDATORY
  }
}
```

### TanStack Query Hook
```typescript
// client/src/features/learning/hooks/useLessonQuery.ts
export const useLessonQuery = (lessonId: string) =>
  useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => lessonService.getById(lessonId),
    enabled: !!lessonId,
    staleTime: 5 * 60 * 1000,
  });
```

### React Component (Client — CSS Modules)
```typescript
// client/src/features/auth/components/LoginForm/LoginForm.tsx
import styles from './LoginForm.module.css';

interface Props { onSuccess?: () => void; }

export const LoginForm = ({ onSuccess }: Props) => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });
  return (
    <form className={styles.form} onSubmit={handleSubmit(onSuccess)}>
      <input {...register('email')} aria-label="Email" className={styles.input} />
      {errors.email && <span role="alert" className={styles.error}>{errors.email.message}</span>}
    </form>
  );
};
```

### GSAP Animation
```typescript
// Always useGSAP(), never raw useEffect for timelines
const ref = useRef<HTMLDivElement>(null);
useGSAP(() => {
  gsap.from(ref.current, { opacity: 0, y: 30, duration: 0.6, ease: 'power3.out' });
}, { scope: ref });
```

---

## 5. Naming Conventions

| Type | Convention | Example |
|---|---|---|
| Files | `kebab-case` | `lesson.mongo.repo.ts`, `login-form.tsx` |
| Classes / Components | `PascalCase` | `LessonService`, `LoginForm` |
| Variables / Functions | `camelCase` | `getLesson`, `lessonId` |
| Constants / Env | `UPPER_SNAKE_CASE` | `OPENAI_MODEL`, `JWT_SECRET` |
| CSS Module classes | `camelCase` | `.submitButton`, `.isActive` |
| Feature hooks | `use[Feature][Action]` | `useLessonQuery`, `useLoginMutation` |

---

## 6. AI & Services Reference

| Service | Variable | Default |
|---|---|---|
| OpenAI LLM | `OPENAI_MODEL` | `gpt-5.4-mini-2026-03-17` |
| OpenAI TTS | `OPENAI_TTS_MODEL` | `gpt-4o-mini-tts-2025-12-15` |
| OpenAI Realtime | `OPENAI_REALTIME_MODEL` | `gpt-realtime-mini-2025-12-15` |
| Transcription | `DEEPGRAM_API_KEY` | Deepgram |
| Pronunciation | `AZURE_SPEECH_KEY` | Azure AI Speech (`southeastasia`) |
| TTS (expressive) | `ELEVENLABS_API_KEY` | ElevenLabs |
| Embeddings | `text-embedding-3-small` | 1536 dims, Pinecone metric: `cosine` |

---

## 7. Pre-Generation Checklist

Before writing any code, verify:

1. Which app? `/client` (CSS Modules) or `/admin` (Tailwind)?
2. MongoDB read? → `.lean()` + `.select()` added?
3. Async controller? → wrapped in `catchAsync`?
4. API input? → Zod middleware in route, not inline?
5. Data fetch in React? → TanStack Query, not `useEffect`?
6. GSAP animation? → `useGSAP()`, not raw `useEffect`?
7. Business logic in Service layer, not Controller?
8. Right store? Mongo for documents, Pinecone for vectors, Redis for cache/queues.
9. Secrets via `config/env.ts`, not hardcoded?
10. `Logger` instead of `console.log`?
