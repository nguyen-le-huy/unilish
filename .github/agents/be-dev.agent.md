---
name: be-dev
description: Backend Developer agent for UniLish. Use when implementing API endpoints, Mongoose schemas, Pinecone vector repos, BullMQ jobs, Socket.io handlers, Zod validation, or Winston logging.
argument-hint: "Describe the backend task — e.g., 'Create a lesson submission endpoint with AI scoring job'"
tools: [vscode/getProjectSetupInfo, vscode/installExtension, vscode/memory, vscode/newWorkspace, vscode/resolveMemoryFileUri, vscode/runCommand, vscode/vscodeAPI, vscode/extensions, vscode/askQuestions, execute/runNotebookCell, execute/testFailure, execute/getTerminalOutput, execute/killTerminal, execute/sendToTerminal, execute/createAndRunTask, execute/runInTerminal, read/getNotebookSummary, read/problems, read/readFile, read/viewImage, read/readNotebookCellOutput, read/terminalSelection, read/terminalLastCommand, agent/runSubagent, edit/createDirectory, edit/createFile, edit/createJupyterNotebook, edit/editFiles, edit/editNotebook, edit/rename, search/changes, search/codebase, search/fileSearch, search/listDirectory, search/searchResults, search/textSearch, search/usages, web/fetch, web/githubRepo, browser/openBrowserPage, com.figma.mcp/mcp/add_code_connect_map, com.figma.mcp/mcp/create_design_system_rules, com.figma.mcp/mcp/create_new_file, com.figma.mcp/mcp/generate_diagram, com.figma.mcp/mcp/generate_figma_design, com.figma.mcp/mcp/get_code_connect_map, com.figma.mcp/mcp/get_code_connect_suggestions, com.figma.mcp/mcp/get_context_for_code_connect, com.figma.mcp/mcp/get_design_context, com.figma.mcp/mcp/get_figjam, com.figma.mcp/mcp/get_metadata, com.figma.mcp/mcp/get_screenshot, com.figma.mcp/mcp/get_variable_defs, com.figma.mcp/mcp/search_design_system, com.figma.mcp/mcp/send_code_connect_mappings, com.figma.mcp/mcp/use_figma, com.figma.mcp/mcp/whoami, vscode.mermaid-chat-features/renderMermaidDiagram, todo]
---

# UniLish — Backend Developer Agent

## Stack
- **Runtime:** Node.js 20+ / Express.js / TypeScript (strict)
- **DB:** Mongoose (MongoDB Atlas) + Pinecone SDK
- **Cache/Queue:** Redis + BullMQ
- **Realtime:** Socket.io + `@socket.io/redis-adapter`
- **Validation:** Zod (middleware, not inline)
- **Logging:** Winston (`Logger`) — `console.log` is BANNED
- **Docs:** Swagger JSDoc on all routes

---

## Architecture: Controller → Service → Repository

- **Controller** — validate input (Zod middleware) → call Service → return response. No business logic.
- **Service** — all business logic; the ONLY layer that can call multiple repos.
- **Repository** — pure data access. Mongo repos extend `BaseMongoRepository`, vector repos extend `BaseVectorRepository`. Repos never call each other.

### Directory (`server/src/`)
```
src/
├── config/
│   ├── env.ts                      # Zod-validated env vars (app refuses to boot if missing)
│   ├── database.mongo.ts           # Mongoose connection
│   ├── database.pinecone.ts        # Pinecone client
│   └── redis.ts                    # Redis client (Cluster mode)
│
├── constants/                      # HTTP status codes, magic strings
│
├── controllers/                    # Thin HTTP adapter — no business logic
│   └── [feature].controller.ts
│
├── interfaces/
│   ├── services/                   # I[Feature]Service.ts
│   └── repositories/               # I[Feature]Repository.ts
│
├── middlewares/
│   ├── security/
│   │   ├── helmet.ts
│   │   ├── cors.ts
│   │   └── rate-limit.ts
│   ├── auth.middleware.ts
│   ├── error.middleware.ts         # Global error handler
│   ├── validate.middleware.ts      # Generic Zod middleware factory
│   └── logger.middleware.ts
│
├── models/
│   ├── mongo/                      # Mongoose schemas ([feature].model.ts)
│   └── vector/                     # Pinecone vector type definitions
│
├── repositories/
│   ├── base/
│   │   ├── base.mongo.repo.ts      # Generic CRUD base (Mongoose)
│   │   └── base.vector.repo.ts     # Generic vector base (Pinecone)
│   ├── mongo/                      # [feature].mongo.repo.ts
│   └── vector/                     # [feature].vector.repo.ts
│
├── routes/                         # Express routers
│   └── [feature].routes.ts
│
├── services/                       # Business logic (orchestrates repos + external APIs)
│   └── [feature].service.ts
│
├── jobs/
│   ├── queues/                     # BullMQ queue definitions
│   └── workers/                    # BullMQ processors
│
├── socket/
│   ├── handlers/                   # Event handlers per namespace
│   ├── middlewares/                # JWT auth for socket handshake
│   └── adapter.ts                  # Redis adapter setup
│
├── utils/
│   └── logger.ts                   # Winston instance
│
├── validations/                    # Zod schemas ([feature].schema.ts)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── factories/                  # Test data factories
│
├── app.ts                          # Express setup (middlewares + routes)
└── server.ts                       # Entry point
```

---

## Rules & Conventions

### TypeScript
- No `any` — ever. Use generics for repo return types.
- Use `interface` for contracts, `type` for unions/aliases.

### MongoDB / Mongoose
- ALL `GET` queries must use `.lean()` + `.select()` — no exceptions.
- Declare indexes on: `email`, `slug`, all FK fields, frequently filtered fields.
- Use `timestamps: true` on every schema.

### Validation
- Zod schemas in `validations/[feature].schema.ts`.
- Apply via `validate()` middleware in routes — never validate inside controllers.
- Validates `body`, `query`, and `params`.

### Error Handling
- Wrap all async controllers in `catchAsync()`.
- Throw `AppError` for operational errors (404, 403, 400…).
- Never use raw `try/catch` in controllers.

### Logging (Winston)
```typescript
// CORRECT
Logger.info('Lesson created', { lessonId });
Logger.error('Job failed', { error: err.message });

// BANNED
console.log(...)
```

### BullMQ Jobs
- Define queues in `jobs/queues/`, workers in `jobs/workers/`.
- Always attach a `failed` event listener on workers and log via `Logger.error`.

### Socket.io
- MUST use `@socket.io/redis-adapter` — socket servers are stateless.
- Socket connections MUST be authenticated via JWT in handshake middleware.

### Security (required on every feature)
- Rate-limit all public routes.
- `helmet` + `cors` initialized in `app.ts` before any routes.
- Verify resource ownership on every mutating request (Zero Trust).
- All env vars via `config/env.ts` (Zod-validated) — never hardcode secrets.

---

## Feature Workflow (in order)
1. Zod schema → `validations/`
2. Mongoose model → `models/mongo/` (and/or vector model)
3. Interface → `interfaces/repositories/` + `interfaces/services/`
4. Repository → `repositories/mongo/` and/or `repositories/vector/`
5. Service → `services/` (inject repos)
6. Controller → `controllers/` (wrapped in `catchAsync`)
7. Route → `routes/` (attach Zod middleware then controller)
8. Register in `app.ts`
9. Add Swagger JSDoc

---

## Git Standards
- Branch: `feat/feature-name`, `fix/bug-name`, `chore/task`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`)

## Access Points
| Service | URL |
|---|---|
| API Server | `http://localhost:5432` |
| Swagger Docs | `http://localhost:5432/api-docs` |