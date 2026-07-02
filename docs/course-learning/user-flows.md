# User Flows

## Flow 1: Enroll and Start

```mermaid
flowchart TD
    A[Open recommendations] --> B[Choose a Course]
    B --> C[Enroll]
    C --> D{Existing enrollment?}
    D -- Yes --> E[Reactivate enrollment]
    D -- No --> F[Create enrollment]
    E --> G[Pause previous active Course]
    F --> G
    G --> H[Open Course roadmap]
    H --> I[Start first available Lesson]
```

Alternate/error flows:

- Inactive Course: reject enrollment and refresh recommendations.
- Missing prerequisite: return lock reason and keep current enrollment unchanged.
- Duplicate request: return the existing enrollment.

## Flow 2: Study and Complete a Lesson

```mermaid
flowchart TD
    A[Open available Lesson] --> B[Start or restore progress]
    B --> C[Consume content]
    C --> D[Save checkpoints]
    D --> E{Assessed Lesson?}
    E -- No --> F[Request completion]
    E -- Yes --> G[Submit answers]
    G --> H{Objective score passes or submission is valid?}
    H -- No --> I[Show feedback and retry]
    H -- Yes --> J[Complete Lesson]
    F --> J
    J --> K[Update Unit and Course progress]
    K --> L[Recommend next Lesson]
```

## Flow 3: Resume

```mermaid
sequenceDiagram
    participant L as Learner
    participant FE as Client
    participant BE as Server
    L->>FE: Open dashboard
    FE->>BE: GET learning dashboard
    BE-->>FE: Active Course and resumable Lesson
    L->>FE: Select Continue learning
    FE->>BE: GET learner Lesson
    BE-->>FE: Sanitized content and checkpoint
    FE-->>L: Restore Lesson state
```

## Flow 4: Checkpoint Conflict

```mermaid
sequenceDiagram
    participant A as Client A
    participant B as Client B
    participant S as Server
    A->>S: PATCH checkpoint version 4
    S-->>A: Accepted version 5
    B->>S: PATCH checkpoint version 4
    S-->>B: 409 with latest version 5
    B->>S: Reconcile and PATCH version 5
    S-->>B: Accepted version 6
```

## Flow 5: Course Completion

1. Learner passes/completes the final required Lesson.
2. Server marks that Lesson complete exactly once.
3. Server recalculates Unit and Course completion.
4. Enrollment changes to `COMPLETED` with timestamp.
5. Dashboard shows congratulations, 100%, review CTA, and choose-another-Course CTA.
6. The completed enrollment remains available for review; another Course becomes active only when the learner chooses one.

## Free Lesson Navigation

- All active/published Lessons in an enrolled Course are selectable regardless of `orderIndex`.
- `orderIndex` controls display order and recommended-next behavior only.
- Access may still be unavailable when the Course prerequisite is unmet or curriculum content is inactive.

## Flow 6: Complete a Per-Lesson Exercise

```mermaid
flowchart TD
    A[Open Lesson] --> B[Load sanitized exercise and checkpoint]
    B --> C{Exercise mode}
    C -- Objective --> D[Answer every question]
    C -- Speaking or Writing --> E[Create valid submission]
    C -- Non-assessed --> F[Acknowledge completion]
    D --> G[Save checkpoint]
    E --> G
    F --> H[Submit]
    G --> H
    H --> I{Payload valid and current?}
    I -- No --> J[Preserve input and show recovery]
    I -- Yes --> K[Grade or validate on server]
    K --> L{Passed or valid subjective submission?}
    L -- No --> M[Show feedback and retry]
    L -- Yes --> N[Complete Lesson and show next action]
```

Submission retry after a network failure reuses the same `clientAttemptId`. Starting a deliberate new attempt creates a new ID.
