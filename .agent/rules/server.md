---
trigger: always_on
---

# UNILISH SERVER ARCHITECTURE & STANDARDS (ENTERPRISE)

## 1. Overview

The Unilish Backend is built on **Node.js** and **Express**, following **Clean Architecture** with **Polyglot Persistence** (MongoDB + Neo4j).

* **Goal:** High scalability, loose coupling, and type safety.
* **Core Stack:** TypeScript, MongoDB (Mongoose), **Neo4j**, Redis (BullMQ + Socket Adapter), Zod.
* **Documentation:** Swagger/OpenAPI (Auto-generated).

---

## 2. Directory Structure (`server/src`)

```text
src/
├── @types/                   # Global Type Definitions
├── config/                   # Configuration
│   ├── env.ts                # Env validation (Zod)
│   ├── database.mongo.ts     # Mongoose Connection
│   ├── database.neo4j.ts     # Neo4j Driver Connection
│   └── redis.ts              # Redis Client
│
├── constants/                # Magic Strings, HTTP Status
│
├── controllers/              # HTTP ADAPTER LAYER
│   ├── auth.controller.ts
│   └── ...
│
├── interfaces/               # CONTRACT DEFINITIONS
│   ├── services/             # Service Interfaces
│   ├── repositories/         # Repository Interfaces
│   │   ├── IUserRepository.ts
│   │   └── IGraphRepository.ts
│   └── ...
│
├── middlewares/              # HTTP INTERCEPTORS
│   ├── security/             # Security Middlewares
│   │   ├── helmet.ts         # Header Security
│   │   ├── cors.ts           # CORS Config
│   │   └── rate-limit.ts     # DDOS Protection
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   ├── validate.middleware.ts
│   └── logger.middleware.ts
│
├── models/                   # DATA MODELS
│   ├── mongo/                # Mongoose Schemas
│   │   ├── user.model.ts
│   │   └── lesson.model.ts
│   └── neo4j/                # Graph Node Definitions
│       └── knowledge-node.ts
│
├── repositories/             # DATA ACCESS LAYER (Polyglot)
│   ├── base/                 # Generic Repository Bases
│   │   ├── base.mongo.repo.ts
│   │   └── base.neo4j.repo.ts
│   ├── mongo/                # MongoDB Implementations
│   │   └── user.mongo.repo.ts
│   └── neo4j/                # Neo4j Implementations
│       └── knowledge.graph.repo.ts
│
├── routes/                   # API ROUTING
│
├── services/                 # BUSINESS LOGIC LAYER
│   # Orchestrates data between MongoRepo, GraphRepo and External APIs.
│   ├── auth.service.ts
│   ├── learning.service.ts   # Uses both Mongo (Lessons) & Neo4j (Context)
│   └── ...
│
├── jobs/                     # BACKGROUND WORKERS (BullMQ)
│   ├── queues/               # Queue Definitions
│   │   └── email.queue.ts
│   └── workers/              # Job Processors
│       └── email.worker.ts
│
├── socket/                   # REALTIME LAYER
│   ├── handlers/             # Event Handlers
│   ├── middlewares/          # Socket Auth
│   └── adapter.ts            # Redis Adapter Config (For Scaling)
│
├── utils/                    # SHARED UTILITIES
│   ├── logger.ts             # Winston (File + Console + Datadog transport)
│   └── ...
│
├── validations/              # ZOD SCHEMAS
├── tests/                    # TESTING
│   ├── unit/
│   ├── integration/
│   └── factories/            # Test Data Factories
│
├── app.ts                    # Express App Setup
└── server.ts                 # Entry Point

```

---

## 3. Architectural Patterns & Rules

### A. The "Polyglot Repository" Rule

Since we use both MongoDB and Neo4j, strict separation is required:

1. **Service Layer:** The ONLY place that can talk to multiple repositories.
* *Example:* `LearningService` fetches Lesson content from `MongoRepository` AND fetches related context nodes from `GraphRepository`.


2. **Repository Layer:**
* **Mongo Repos:** Extends `BaseMongoRepository`. Only touches Mongoose.
* **Neo4j Repos:** Extends `BaseNeo4jRepository`. Only touches Cypher queries.



### B. Validation & Security Strategy

1. **Zod:** Used for API Input validation AND Environment Variable validation.
2. **Security First:** `Helmet`, `Cors`, and `Rate-limit` MUST be initialized in `app.ts` before any routes.
3. **Strict Types:** No `any`. Use generics for Repository return types.

### C. Realtime Scaling Rule

* **State:** Socket.io servers are stateless.
* **Adapter:** MUST use `@socket.io/redis-adapter` to broadcast events across multiple server instances.
* **Auth:** Socket connection MUST be authenticated via JWT in the handshake middleware.

---

## 4. Coding Standards

### Logging (Winston)

Logs must be structured (JSON) and transported correctly based on environment:

* **Dev:** Console (Colorized).
* **Prod:** File (Rotation) OR Monitoring Service (Datadog/Sentry).
* **Rule:** `console.log` is FORBIDDEN. Use `Logger.info()`, `Logger.error()`.

### Error Handling

* **Operational Errors:** Throw `AppError` (e.g., "User not found").
* **Programmer Errors:** Let the Global Error Handler catch them (e.g., Crash).
* **Async:** All Async Controller methods MUST be wrapped in `catchAsync()`.

---

## 5. Workflow: Adding a Contextual Lesson Feature

1. **Step 1 (Models):** Define `Lesson` in `models/mongo` and `ConceptNode` in `models/neo4j`.
2. **Step 2 (Repos):**
* Create `LessonMongoRepo` (CRUD content).
* Create `ConceptGraphRepo` (Manage relationships).


3. **Step 3 (Service):** Create `LessonService`. Inject both repos.
* *Logic:* Save lesson to Mongo -> extract keywords -> create nodes in Neo4j -> link them.


4. **Step 4 (Controller):** Validate input via Zod -> Call Service -> Return Response.

*Last Updated: 2026-02-05*