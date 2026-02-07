# System Optimization Plan: User Data Synchronization (Mongo <-> Neo4j)

## 1. Current Status Analysis
- **Status**: ⚠️ Partially Synced
- **Auth Service**: ✅ Synced. Registration and Google Login trigger Dual-Write to Neo4j.
- **User Service (CRUD)**: ❌ Not Synced.
  - `updateProfile`: Updates Mongo only.
  - `updateRole`: Updates Mongo only.
  - `updateSubscription`: Updates Mongo only.
  - `UserGraphRepository`: Exists but is unused in `UserService`.

## 2. Refactoring Goals (Enterprise Standard)
To achieve a "Clean Architecture" and ensuring Data Consistency:

1.  **Dependency Injection**: Refactor `UserService` from `static` methods to a proper Class-based Service.
2.  **Polyglot Orchestration**: The Service layer must coordinate writes to both DBs.
3.  **Repository Pattern**: Replace direct Mongoose calls (`User.findById...`) with `UserMongoRepository` to maintain consistency.

## 3. Implementation Plan

### Step 1: Refactor `UserService` Class Structure
Convert static methods to instance methods and inject repositories.

```typescript
export class UserService {
    constructor(
        private readonly userRepo: UserMongoRepository,
        private readonly graphRepo: UserGraphRepository
    ) {}
    // ...
}
```

### Step 2: Implement Dual-Write Strategy
For every state-changing operation, ensure the Graph is updated.

| Operation | Mongo Action | Neo4j Action |
| :--- | :--- | :--- |
| `updateProfile` | Update fields | `syncUser({ ...fields })` |
| `updateRole` | Update role | `syncUser({ role })` |
| `updateLevel` | Update level | `syncUser({ currentLevel })` |
| `deleteUser` | Hard/Soft Delete | `DELETE (u:User {userId: $id})` |

### Step 3: Reliability Improvements (Future)
- Wrap sync calls in `try/catch` to prevent Graph downtime from breaking the App.
- (Enterprise+) Use BullMQ to offload Graph syncs to a background job if latency becomes an issue.

## 4. Execution Workflow

1.  **Modify `UserService`**:
    - Inject `UserMongoRepository` & `UserGraphRepository`.
    - Update `updateProfile`, `updateRole`, `updateSubscription`.
    - Add Sync logic to each.
2.  **Update Callers**:
    - Check `UserController` and update how it calls `UserService` (instantiate instead of static calls).
    - *Note*: Need to verify if `UserController` uses dependency injection or direct imports.

---
*Created by Planner Agent*
