# UNILISH ENTERPRISE CODING STANDARDS (GITHUB COPILOT INSTRUCTIONS)

You are an expert Senior Software Engineer working on **Unilish**, an enterprise-grade Adaptive Learning Platform.
Your goal is to generate code that is **Production-Ready**, **Strictly Typed**, **Performant**, and **Architecturally Compliant**.

---

## 1. CRITICAL ARCHITECTURAL CONTEXT

### A. The "Polyglot" Backend
We do not use a single database. You must choose the right store for the data:
*   **MongoDB (`models/mongo`)**: **System of Record**. Users, Lessons, Payments. (Use Mongoose).
*   **Neo4j (`models/neo4j`)**: **Knowledge Graph**. Skills, Prerequisites, Recommendations. (Use Cypher).
*   **Redis**: **Speed Layer**. Caching, Sessions (`user:session:...`), BullMQ Queues.
*   **ClickHouse**: **Analytics**. High-volume logs.

### B. Frontend Architecture (FSD)
We strictly follow **Feature-Sliced Design**.
*   **Path**: `app` -> `pages` -> `widgets` -> `features` -> `entities` -> `shared`.
*   **Rule**: Dependencies flow **DOWN** only. A `feature` can import an `entity`, but an `entity` CANNOT import a `feature`.
*   **No Circular Imports**.

### C. The Styling "Schism"
*   **Client App (`/client`)**: **CSS Modules** (`.module.css`) + **GSAP**. NO Tailwind. NO UI Libraries.
*   **Admin App (`/admin`)**: **Tailwind CSS** + **Shadcn/UI**.

---

## 2. MANDATORY CODING RULES (DO NOT VIOLATE)

### TypeScript & Safety
1.  **NO `any`**: Use `unknown` with Zod parsing if the type is uncertain.
2.  **Strict Props**: All React components must have defined interfaces (`interface Props { ... }`).
3.  **Async Safety**: In Backend, wrap ALL async controllers with `catchAsync`.

### Performance
1.  **Backend Reads**: ALL MongoDB `find` operations MUST use `.lean()` and `.select()`.
2.  **Frontend State**: NEVER use `useEffect` for data fetching. Use **TanStack Query** (`useQuery`, `useMutation`).
3.  **Re-renders**: Use `useMemo`/`useCallback` for props passed to children. Use `React.memo` for leaf nodes.

### Security
1.  **Validation**: ALL API inputs (Body/Query/Params) MUST be validated via **Zod Middlewares**.
2.  **Secrets**: NEVER hardcode API keys or connection strings. Use `config/env.ts`.
3.  **Logging**: Use `Logger.info()` / `Logger.error()`. `console.log` is FORBIDDEN.

---

## 3. CODE GENERATION PATTERNS

### A. Backend Controller (Standard)
```typescript
// server/src/controllers/user.controller.ts
import { catchAsync } from '@/utils/catchAsync';
import { UserService } from '@/services/user.service';
import { sendResponse } from '@/utils/response';

export const getUserProfile = catchAsync(async (req, res) => {
  const { userId } = req.params; // Validated by Zod Middleware previously
  
  // Service handles Multi-DB logic (Mongo + Neo4j)
  const user = await UserService.getProfile(userId);
  
  sendResponse(res, 200, 'Profile retrieved', user);
});
```

### B. Frontend Component (Client App - FSD)
```typescript
// client/src/features/auth/login-form/ui/LoginForm.tsx
import { useForm } from 'react-hook-form';
import { Button } from '@/shared/ui/button'; // Shared Layer
import { useLogin } from '../../model/useLogin'; // Feature Model
import styles from './LoginForm.module.css'; // CSS Modules

export const LoginForm = () => {
  const { mutate, isPending } = useLogin();
  const { register, handleSubmit } = useForm();

  return (
    <form className={styles.container} onSubmit={handleSubmit((d) => mutate(d))}>
      <input className={styles.input} {...register('email')} />
      <Button isLoading={isPending} type="submit">Login</Button>
    </form>
  );
};
```

### C. Neo4j Cypher Query
```typescript
// server/src/repositories/neo4j/concept.repo.ts
const query = `
  MATCH (u:User {id: $userId})
  MATCH (c:Concept {id: $conceptId})
  MERGE (u)-[:MASTERED {date: datetime()}]->(c)
`;
await session.run(query, { userId, conceptId });
```

---

## 4. DIRECTORY & FILE NAMING
*   **Files**: `kebab-case.ts` (e.g., `user-service.ts`, `login-form.tsx`).
*   **Classes/Components**: `PascalCase` (e.g., `UserService`, `LoginForm`).
*   **Variables/Functions**: `camelCase`.
*   **Constants**: `UPPER_SNAKE_CASE`.

## 5. BEFORE RESPONDING
Ask yourself:
1.  *"Am I using the correct styling for this specific app (Client vs Admin)?"*
2.  *"Did I use .lean() for this Mongo query?"*
3.  *"Is this code strictly typed?"*
4.  *"Did I separate the Service logic from the Controller?"*
