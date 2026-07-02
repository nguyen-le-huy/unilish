# UX and Design Specification

## Design Intent

The primary learner task is continuing the next Lesson. The interface must prioritize one clear action, expose progress without noise, and keep Course navigation predictable.

New UI follows `client/DESIGN.md` and existing dashboard conventions:

- Editorial neutral surfaces and warm ink.
- Semantic green only for progress/success.
- CSS Modules and existing tokens.
- Compact workflow typography; no marketing-scale hero treatment.
- No nested decorative cards.
- No Premium/Upgrade controls.

## Information Architecture

```text
Dashboard
└── Current Course card
    ├── Course overview / roadmap
    │   └── Unit
    │       └── Lesson
    │           ├── Content
    │           ├── Practice / submission
    │           └── Result / next lesson
    └── Recommendations when no active Course
```

## Screen 1: Dashboard Current Course

### Content

- Course thumbnail with meaningful alt text.
- Course name and CEFR level.
- Total Units and persisted study time.
- Progress label, percentage, and progress bar.
- One primary action.

### CTA Rules

| State | Label | Destination |
|---|---|---|
| No active Course | `Tìm khóa học phù hợp` | Recommendations |
| Enrolled, no Lesson started | `Bắt đầu học` | First available Lesson |
| In progress | `Tiếp tục học` | Last/next resumable Lesson |
| Completed | `Chúc mừng - Xem lại khóa học` | Course completion/overview |
| Temporarily unavailable | `Chọn khóa học khác` | Recommendations |

### Corrections to Current Mock

- Replace “8 Khoá” with Unit count.
- Remove hardcoded `53%`, duration, image, and title.
- Rename `CurrentSeriesCard` to Course terminology.
- Remove Upgrade card because payment no longer exists.
- Do not present mock monthly Course-learning statistics as live data. Keep the existing ranking surface unchanged and outside this feature's data scope.

## Screen 2: Course Overview

### Header

- Back to dashboard.
- Thumbnail, Course name, Language, Learning Goal, CEFR level, and description.
- Progress and next action.

### Roadmap

- Units appear in `orderIndex` order.
- Unit sections expose title, completion ratio, and status.
- Lesson rows expose type icon, title, status, latest/best score if assessed, and unavailable reason where applicable.
- All active/published Lessons are freely selectable; ordering only controls presentation and recommendation.
- Current Lesson has a distinct but restrained active treatment.
- Completed items use icon + text, not color alone.

### States

- Loading skeleton preserving final layout dimensions.
- Empty curriculum.
- No enrollment with enroll CTA.
- Course unavailable/unpublished.
- Recoverable API error with retry.
- Completed Course with congratulations, review, and choose-another-Course actions.

## Screen 3: Lesson Player

### Desktop Layout

- Left: collapsible Course roadmap with stable width.
- Center: Lesson content and practice.
- Top: Course/Unit/Lesson breadcrumb and progress.
- Bottom: previous, save/status, submit/complete, and next actions.

The player should not be placed inside a decorative page card. Content sections are full-width within a constrained reading column.

### Shared States

- Loading content.
- Restoring checkpoint.
- Autosaving/saved/conflict.
- Media unavailable.
- Permission denied for microphone.
- Submission pending/error/success.
- Unavailable or unpublished Lesson.
- Unsupported/malformed authored content.

## Lesson-Type Experience

| Type | Primary learner interaction | Completion input |
|---|---|---|
| VOCAB | Cards/list, audio, examples, pronunciation where available | Content checkpoint plus practice if configured |
| GRAMMAR | Explanation blocks, examples, inline quiz | Server-graded practice |
| READING | Article, glossary, optional translation/audio | Server-graded practice |
| LISTENING | Audio, synchronized transcript/gap interaction | Server-graded interaction/practice |
| SPEAKING | Mission, recording/live session, feedback | Valid submission completes; evaluation does not block completion |
| WRITING | Prompt, editor, submission, feedback | Valid submission completes; evaluation does not block completion |
| UNIT_TEST | Assessment-only sequence | Server score against pass threshold |

## Result State

- Pass/fail heading.
- Score and threshold when assessed.
- Feedback and explanations returned by the server.
- Unlimited retry for assessed Lessons, showing latest and best score.
- Primary next-Lesson action on pass.
- Return to roadmap action.

## Per-Lesson Exercise Experience

The canonical exercise behavior and type mapping are defined in [exercise-spec.md](exercise-spec.md).

- Place one `Luyện tập` section after the learning content.
- Show question position and answered count; never show correctness before submission.
- Missing-answer validation identifies and focuses the first unanswered question.
- Preserve answers during autosave, API errors, route-warning decisions, and submission retry.
- After submission, show score, latest/best result, per-question feedback, retry, and next-Lesson actions.
- Completed Lessons open in review mode; a new attempt begins only after an explicit retry action.

## Accessibility

- Unit accordion uses button semantics and `aria-expanded`.
- Status is expressed with text/icons, never color alone.
- Progress bar exposes value/min/max/name.
- Media controls are keyboard operable and labelled.
- Focus moves to result heading after submission.
- Route changes restore focus to the screen heading.
- Unsaved-state dialogs trap focus and support Escape where safe.

## Responsive Constraint

Build for the desktop widths supported by the current dashboard shell. Components must not overflow down to the current `MobileBlocker` threshold. Full mobile learning is a separate decision.
