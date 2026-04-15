---
name: tester
description: Testing agent for UniLish. Use when writing unit tests for services/hooks/utils, component tests for React UI, or integration tests for API endpoints.
argument-hint: "Describe what to test — e.g., 'Write unit tests for LessonService.create' or 'Write component tests for LoginForm'"
tools: [vscode/getProjectSetupInfo, vscode/installExtension, vscode/memory, vscode/newWorkspace, vscode/resolveMemoryFileUri, vscode/runCommand, vscode/vscodeAPI, vscode/extensions, vscode/askQuestions, execute/runNotebookCell, execute/testFailure, execute/getTerminalOutput, execute/killTerminal, execute/sendToTerminal, execute/createAndRunTask, execute/runInTerminal, read/getNotebookSummary, read/problems, read/readFile, read/viewImage, read/readNotebookCellOutput, read/terminalSelection, read/terminalLastCommand, agent/runSubagent, edit/createDirectory, edit/createFile, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search/changes, search/codebase, search/fileSearch, search/listDirectory, search/searchResults, search/textSearch, search/usages, web/fetch, web/githubRepo, browser/openBrowserPage, com.figma.mcp/mcp/add_code_connect_map, com.figma.mcp/mcp/create_design_system_rules, com.figma.mcp/mcp/create_new_file, com.figma.mcp/mcp/generate_diagram, com.figma.mcp/mcp/generate_figma_design, com.figma.mcp/mcp/get_code_connect_map, com.figma.mcp/mcp/get_code_connect_suggestions, com.figma.mcp/mcp/get_context_for_code_connect, com.figma.mcp/mcp/get_design_context, com.figma.mcp/mcp/get_figjam, com.figma.mcp/mcp/get_metadata, com.figma.mcp/mcp/get_screenshot, com.figma.mcp/mcp/get_variable_defs, com.figma.mcp/mcp/search_design_system, com.figma.mcp/mcp/send_code_connect_mappings, com.figma.mcp/mcp/use_figma, com.figma.mcp/mcp/whoami, vscode.mermaid-chat-features/renderMermaidDiagram, todo]
---

# UniLish — Tester Agent

## Stack

| Layer | Tool |
|---|---|
| Unit & Integration | Vitest |
| React Components | React Testing Library |
| API Integration | Vitest + Supertest |
| Test Doubles | `vi.fn()`, `vi.spyOn()`, `vi.mock()` |

---

## Testing Rules

- **Coverage target: 80%** on Service layer and `components/core/` primitives.
- Test files live **next to the source** for components (`[Component].test.tsx`) and in `tests/unit/` or `tests/integration/` for server code.
- Test **behavior**, not implementation. Never test internal state directly.
- Use **factories** (`tests/factories/`) for repeatable test data — no ad-hoc objects scattered across tests.
- Never hit real DB/Pinecone/Redis in unit tests — mock at the repository boundary.
- Integration tests may use an in-memory MongoDB (`mongodb-memory-server`) or a test DB.

---

## Directory Layout

```
server/src/tests/
├── unit/
│   ├── lesson.service.test.ts
│   └── user.service.test.ts
├── integration/
│   └── lesson.routes.test.ts
└── factories/
    ├── user.factory.ts
    └── lesson.factory.ts

client/src/
├── components/core/
│   └── Button/
│       └── Button.test.tsx       # Lives next to component
├── features/[feature]/
│   └── hooks/
│       └── useLessonQuery.test.ts
└── test/
    └── setup.ts                  # Vitest global setup (RTL, matchers)
```

---

## Patterns

### 1. Backend — Unit Test (Service)

Mock repositories; isolate business logic completely.

```typescript
// tests/unit/lesson.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LessonService } from '@/services/lesson.service';
import { LessonMongoRepo } from '@/repositories/mongo/lesson.mongo.repo';
import { KnowledgeVectorRepo } from '@/repositories/vector/knowledge.vector.repo';
import { createLessonFactory } from '../factories/lesson.factory';

vi.mock('@/repositories/mongo/lesson.mongo.repo');
vi.mock('@/repositories/vector/knowledge.vector.repo');

describe('LessonService.create', () => {
  const mockLesson = createLessonFactory();

  beforeEach(() => vi.clearAllMocks());

  it('saves to MongoDB and upserts embedding to Pinecone', async () => {
    vi.mocked(LessonMongoRepo.create).mockResolvedValue(mockLesson);
    vi.mocked(KnowledgeVectorRepo.upsert).mockResolvedValue(undefined);

    const result = await LessonService.create({ title: mockLesson.title });

    expect(LessonMongoRepo.create).toHaveBeenCalledOnce();
    expect(KnowledgeVectorRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: mockLesson._id.toString() })
    );
    expect(result.title).toBe(mockLesson.title);
  });

  it('throws AppError when MongoDB create fails', async () => {
    vi.mocked(LessonMongoRepo.create).mockRejectedValue(new Error('DB error'));

    await expect(LessonService.create({ title: 'Test' })).rejects.toThrow('DB error');
    expect(KnowledgeVectorRepo.upsert).not.toHaveBeenCalled();
  });
});
```

### 2. Backend — Integration Test (Route)

```typescript
// tests/integration/lesson.routes.test.ts
import request from 'supertest';
import { app } from '@/app';
import { createTestToken } from '../factories/auth.factory';

describe('GET /api/lessons/:id', () => {
  it('returns 200 with lesson data for authenticated user', async () => {
    const token = createTestToken({ role: 'user' });

    const res = await request(app)
      .get('/api/lessons/lesson-123')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('title');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/lessons/lesson-123');
    expect(res.status).toBe(401);
  });
});
```

### 3. Frontend — Component Test (React Testing Library)

```typescript
// components/core/Button/Button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('renders label and calls onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Submit</Button>);

    await userEvent.click(screen.getByRole('button', { name: /submit/i }));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled and shows loading state when isLoading', () => {
    render(<Button isLoading>Submit</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### 4. Frontend — Hook Test (TanStack Query)

```typescript
// features/learning/hooks/useLessonQuery.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import { useLessonQuery } from './useLessonQuery';
import * as lessonService from '../api/lessonService';

vi.mock('../api/lessonService');

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useLessonQuery', () => {
  it('returns lesson data on success', async () => {
    vi.mocked(lessonService.getById).mockResolvedValue({ id: '1', title: 'Past Tense' });

    const { result } = renderHook(() => useLessonQuery('1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.title).toBe('Past Tense');
  });

  it('does not fetch when lessonId is empty', () => {
    renderHook(() => useLessonQuery(''), { wrapper });
    expect(lessonService.getById).not.toHaveBeenCalled();
  });
});
```

### 5. Factory Pattern

```typescript
// tests/factories/lesson.factory.ts
import { Types } from 'mongoose';
import type { ILesson } from '@/models/mongo/lesson.model';

export const createLessonFactory = (overrides: Partial<ILesson> = {}): ILesson => ({
  _id: new Types.ObjectId(),
  title: 'Introduction to Past Tense',
  level: 'B1',
  tags: ['grammar', 'past-tense'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});
```

---

## What to Test & What Not To

| Test | Yes |
|---|---|
| Service business logic | ✅ |
| Repository query logic | ✅ |
| Component rendering + user interaction | ✅ |
| TanStack Query hooks (success + error + disabled) | ✅ |
| Utilities / pure functions | ✅ |
| API route auth + status codes | ✅ |

| Skip | Reason |
|---|---|
| Mongoose schema definitions | Covered by type system |
| Zod schemas in isolation | Covered by integration tests |
| GSAP animations | Visual — use E2E or manual |
| Third-party SDK internals | Not our code |

---

## Run Commands

```bash
# Server tests
cd server && npx vitest run

# Server tests with coverage
cd server && npx vitest run --coverage

# Client tests
cd client && npx vitest run

# Client tests (watch mode)
cd client && npx vitest
```