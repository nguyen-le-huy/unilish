# Exam Test Management — Kế hoạch Chi tiết

> **Phạm vi:** Tạo mới hoàn toàn trang **"Quản lý Bài Thi"** — một feature độc lập, không chạm vào `placement-test` hiện có.
> **Loại hỗ trợ:** TOEIC L&R và IELTS (2 loại).
> **Route Admin:** `/exam-tests`
> **API:** `/api/exam-tests`

---

## 1. Tổng quan

### 1.1 Hai loại Exam Test

| Loại | `format` | Scoring | Modules (cố định) |
|---|---|---|---|
| **TOEIC L&R** | `toeic_lr` | Score 10–990 (L: 5–495, R: 5–495) | Listening (Parts 1–4) + Reading (Parts 5–7) |
| **IELTS** | `ielts` | Band Score 0.0–9.0 | Listening + Reading + Writing (Task 1 + Task 2) + Speaking (Parts 1–3) |

### 1.2 Cấu trúc Module cố định

#### TOEIC L&R

| Module | Type | Time | Parts |
|---|---|---|---|
| Listening | `listening` | 45 phút | Part 1 (6Q Photos), Part 2 (25Q Q-Response), Part 3 (39Q Conversations), Part 4 (30Q Talks) |
| Reading | `reading` | 75 phút | Part 5 (30Q Incomplete Sentences), Part 6 (16Q Text Completion), Part 7 (54Q Comprehension) |

#### IELTS

| Module | Type | Time | Parts |
|---|---|---|---|
| Listening | `listening` | 30 phút | Section 1 (10Q), Section 2 (10Q), Section 3 (10Q), Section 4 (10Q) |
| Reading | `reading` | 60 phút | Passage 1 (~14Q), Passage 2 (~13Q), Passage 3 (~13Q) |
| Writing | `writing` | 60 phút | Task 1 (min 150w), Task 2 (min 250w) |
| Speaking | `speaking` | ~14 phút | Part 1 (4-5Q), Part 2 (Cue Card), Part 3 (4-5Q) |

---

## 2. Database — MongoDB Model mới

**Collection:** `examtests` (hoàn toàn mới, không đụng `placementtests`)

### 2.1 Schema Interface

```typescript
// server/src/models/mongo/exam-test.model.ts

export const EExamFormat = {
    TOEIC_LR: 'toeic_lr',
    IELTS:    'ielts',
} as const;

export const EExamTestStatus = {
    DRAFT:    'draft',
    ACTIVE:   'active',
    PAUSED:   'paused',
    ARCHIVED: 'archived',
} as const;

export const EExamScoringFramework = {
    TOEIC_SCORE: 'toeic_score',   // Listening 5-495 + Reading 5-495
    IELTS_BAND:  'ielts_band',    // Band 0.0-9.0
} as const;

// ─── Part config (MCQ parts hỗ trợ pool + manual content)
export interface IExamPartConfig {
    part: number;           // Part number (1, 2, 3, ...)
    name: string;           // "Part 1 — Photographs"
    questionsCount: number; // Total questions in this part
    poolTag: string;        // Tag trong Question Bank để random
    manualContent?: {       // Manual questions (thay thế pool)
        questionItems?: IExamQuestionItem[];
        audioUrl?: string;  // shared audio cho cả part (Part 3/4 TOEIC)
        groupPattern?: number[]; // Part 7 grouping
    };
}

export interface IExamQuestionItem {
    question: string;
    options: { A: string; B: string; C: string; D: string };
    correctOption: 'A' | 'B' | 'C' | 'D';
    explanation?: string;
    transcript?: string;
    audioUrl?: string;
    imageUrl?: string;
    imageUrls?: string[];
}

// ─── Module types
export interface IExamModuleListening {
    type: 'listening';
    name: string;
    timeLimitMinutes: number;
    audioUrl?: string;     // Master audio file (IELTS)
    parts: IExamPartConfig[];
}

export interface IExamModuleReading {
    type: 'reading';
    name: string;
    timeLimitMinutes: number;
    parts: IExamPartConfig[];
}

export interface IExamModuleWriting {
    type: 'writing';
    name: string;
    timeLimitMinutes: number;
    tasks: {
        task: 1 | 2;
        minWords: number;     // 150 / 250
        topics: string[];     // Prompts pool
    }[];
}

export interface IExamModuleSpeaking {
    type: 'speaking';
    name: string;
    part1Topics: { text: string; audioKey?: string }[];
    part2CueCards: { text: string; shouldSay?: string[]; audioKey?: string }[];
    part3Topics: { text: string; audioKey?: string }[];
}

export type IExamModule =
    | IExamModuleListening
    | IExamModuleReading
    | IExamModuleWriting
    | IExamModuleSpeaking;

// ─── Scoring
export interface IExamScoringConfig {
    framework: typeof EExamScoringFramework[keyof typeof EExamScoringFramework];
    // TOEIC: { listening: { min, max }, reading: { min, max } }
    // IELTS: bandThresholds[]
    bandThresholds?: {
        band: string;         // "Band 7", "Score 785+"
        minScore: number;     // normalized 0-1
        maxScore: number;
    }[];
}

// ─── Main document
export interface IExamTest extends mongoose.Document {
    name: string;
    format: typeof EExamFormat[keyof typeof EExamFormat];
    languageId: mongoose.Types.ObjectId;
    language: string;
    description?: string;
    status: typeof EExamTestStatus[keyof typeof EExamTestStatus];
    version: number;
    modules: IExamModule[];
    scoringConfig: IExamScoringConfig;
    settings: {
        allowRetake: boolean;
        retakeCooldownDays: number;
        timeLimitOverrideMinutes?: number; // override total time nếu cần
    };
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
```

### 2.2 Indexes

```typescript
ExamTestSchema.index({ format: 1, status: 1 });
ExamTestSchema.index({ language: 1, format: 1 });
ExamTestSchema.index({ name: 1, format: 1, version: -1 });
```

---

## 3. Server Architecture

### 3.1 Files cần tạo mới (server)

```
server/src/
├── models/mongo/
│   └── exam-test.model.ts             # Schema mới (Task BE-1)
├── repositories/mongo/
│   └── exam-test.mongo.repository.ts  # CRUD + list + version (Task BE-2)
├── services/
│   └── exam-test.service.ts           # Business logic (Task BE-3)
├── controllers/
│   └── exam-test.controller.ts        # HTTP adapter (Task BE-4)
├── routes/
│   └── exam-test.route.ts             # Express router (Task BE-5)
└── validations/
    └── exam-test.validation.ts        # Zod schemas (Task BE-6)
```

### 3.2 API Endpoints

| Method | Path | Auth | Mô tả |
|---|---|---|---|
| `GET` | `/api/exam-tests` | admin/content_creator | List, filter theo format/status/search |
| `GET` | `/api/exam-tests/:id` | admin/content_creator | Chi tiết |
| `POST` | `/api/exam-tests` | admin | Tạo mới |
| `PUT` | `/api/exam-tests/:id` | admin | Cập nhật |
| `PATCH` | `/api/exam-tests/:id/status` | admin | Đổi status |
| `GET` | `/api/exam-tests/:id/versions` | admin/content_creator | Lịch sử phiên bản |
| `POST` | `/api/exam-tests/:id/rollback/:version` | admin | Rollback |
| `GET` | `/api/exam-tests/:id/analytics` | admin/content_creator | Thống kê |
| `POST` | `/api/exam-tests/ai/parse-questions` | admin | AI parse MCQ import |

### 3.3 Default Scoring Configs

```typescript
// TOEIC L&R: tổng 10-990 (L: 5-495, R: 5-495)
const DEFAULT_TOEIC_BANDS = [
    { band: '10–250',  minScore: 0,    maxScore: 0.25 },
    { band: '255–400', minScore: 0.25, maxScore: 0.40 },
    { band: '405–600', minScore: 0.40, maxScore: 0.60 },
    { band: '605–780', minScore: 0.60, maxScore: 0.79 },
    { band: '785–900', minScore: 0.79, maxScore: 0.91 },
    { band: '905–990', minScore: 0.91, maxScore: 1.00 },
];

// IELTS: Band 1.0 – 9.0
const DEFAULT_IELTS_BANDS = [
    { band: 'Band 1–3',  minScore: 0,    maxScore: 0.35 },
    { band: 'Band 4',    minScore: 0.35, maxScore: 0.45 },
    { band: 'Band 4.5',  minScore: 0.45, maxScore: 0.50 },
    { band: 'Band 5',    minScore: 0.50, maxScore: 0.55 },
    { band: 'Band 5.5',  minScore: 0.55, maxScore: 0.60 },
    { band: 'Band 6',    minScore: 0.60, maxScore: 0.65 },
    { band: 'Band 6.5',  minScore: 0.65, maxScore: 0.70 },
    { band: 'Band 7',    minScore: 0.70, maxScore: 0.78 },
    { band: 'Band 7.5+', minScore: 0.78, maxScore: 1.00 },
];
```

---

## 4. Admin Frontend Architecture

### 4.1 Feature folder mới

```
admin/src/features/
└── exam-tests/                         # Feature hoàn toàn mới
    ├── api/
    │   └── examTestService.ts          # Axios calls /api/exam-tests
    ├── components/
    │   ├── ExamTestTable/              # Danh sách với cột: Tên, Format, Status, Version
    │   │   └── ExamTestTable.tsx
    │   ├── FormatBadge/               # Badge: "TOEIC L&R" | "IELTS"
    │   │   └── FormatBadge.tsx
    │   ├── StatusBadge/               # Tái dùng pattern từ placement-test
    │   │   └── StatusBadge.tsx
    │   ├── AnalyticsModal/            # Thống kê bài thi
    │   │   └── AnalyticsModal.tsx
    │   ├── VersionHistoryModal/       # Lịch sử version
    │   │   └── VersionHistoryModal.tsx
    │   └── wizard/
    │       ├── ExamTestWizard.tsx     # Orchestrator (4 steps)
    │       └── steps/
    │           ├── Step1_BasicInfo.tsx     # Tên, ngôn ngữ, format picker
    │           ├── Step2_Modules.tsx       # Cấu hình modules (auto theo format)
    │           ├── Step3_Scoring.tsx       # Scoring config + band thresholds
    │           └── Step4_Settings.tsx      # Settings + submit
    ├── hooks/
    │   ├── useExamTests.ts            # TanStack Query list
    │   ├── useExamTest.ts             # TanStack Query single
    │   └── useExamTestMutations.ts    # create/update/status/rollback
    ├── pages/
    │   ├── ExamTestListPage/
    │   │   └── ExamTestListPage.tsx   # Trang danh sách chính
    │   └── ExamTestWizardPage/
    │       └── ExamTestWizardPage.tsx # Wrapper cho wizard
    ├── types/
    │   └── index.ts                   # TS types cho exam test
    └── constants/
        └── index.ts                   # Format labels, default modules, badge classes
```

### 4.2 `ExamTestListPage` UI

```
┌─────────────────────────────────────────────────────────────────────┐
│  Quản lý Bài Thi                            [+ Tạo bài thi ▼]      │
│  Quản lý đề thi thử TOEIC L&R và IELTS theo chuẩn quốc tế.        │
├─────────────────────────────────────────────────────────────────────┤
│  [Tất cả]  [TOEIC L&R]  [IELTS]                (tab filter)        │
├─────────────────────────────────────────────────────────────────────┤
│  🔍 Tìm tên đề thi...    [Trạng thái ▼]                            │
├─────────────────────────────────────────────────────────────────────┤
│  Tên bài thi | Format | Ngôn ngữ | Trạng thái | Phiên bản | ...    │
└─────────────────────────────────────────────────────────────────────┘
```

**Dropdown "Tạo bài thi":**
```
┌────────────────────────┐
│ 📊 Đề thi TOEIC L&R   │
│ 🎓 Đề thi IELTS        │
└────────────────────────┘
```

### 4.3 `ExamTestWizard` — 4 Steps

**Step 1 — Thông tin cơ bản**
- Tên đề thi (required)
- Format: `TOEIC L&R` | `IELTS` (card picker — chọn 1 trong 2)
- Ngôn ngữ (select từ `/api/curriculum/languages`)
- Mô tả (optional)

**Step 2 — Cấu hình Modules**

Modules được **auto-populate** theo format, admin chỉ điền nội dung từng Part:
- Với mỗi MCQ Part: nhập `poolTag` (link với Question Bank) **hoặc** upload/paste câu hỏi thủ công (AI parse).
- Với Writing Task: nhập danh sách topic prompts.
- Với Speaking: nhập Part 1 topics, Part 2 cue cards, Part 3 topics.
- Cho phép override `timeLimitMinutes` cho từng module.

**Step 3 — Scoring Config**
- Band thresholds (auto-populate theo format, admin có thể edit):
  - Table: Band Label | Min Score (%) | Max Score (%)
- Không cần cấu hình weights — IELTS tính average của 4 skills, TOEIC tính L+R separate.

**Step 4 — Settings & Publish**
- Cho phép làm lại (toggle)
- Thời gian chờ (days)
- Nút **"Lưu nháp"** (status = draft) và **"Xuất bản"** (status = active).

### 4.4 Sidebar

Thêm vào section **"Đào tạo"** trong `sidebar.config.ts`:

```typescript
{
    title: 'Quản lý Bài Thi',
    url: '/exam-tests',
    description: 'Đề thi thử TOEIC L&R và IELTS theo chuẩn quốc tế',
},
```

Đặt ngay **sau** "Bài Kiểm tra Đầu vào" để liền mạch về chức năng.

### 4.5 Router

```typescript
// admin/src/app/router.tsx — thêm mới, không sửa gì cũ

const ExamTestListPage   = lazy(() => import('@/features/exam-tests/pages/ExamTestListPage/ExamTestListPage'));
const ExamTestWizardPage = lazy(() => import('@/features/exam-tests/pages/ExamTestWizardPage/ExamTestWizardPage'));

// Routes thêm vào children:
{ path: 'exam-tests',         element: <Suspense ...><ExamTestListPage /></Suspense> },
{ path: 'exam-tests/create',  element: <Suspense ...><ExamTestWizardPage /></Suspense> },
{ path: 'exam-tests/:id/edit',element: <Suspense ...><ExamTestWizardPage /></Suspense> },
```

---

## 5. Phân tách công việc Agent

| Agent | Scope |
|---|---|
| `be-dev` | Model + Repository + Service + Controller + Route + Validation |
| `fe-dev` | Types + Constants + API Service + Hooks + Components + Pages + Sidebar + Router |

---

## 6. Kế hoạch Triển khai

### Phase 1 — BE Foundation (tuần 1)
- [ ] `exam-test.model.ts` — Schema + Enums + Interfaces
- [ ] `exam-test.mongo.repository.ts` — CRUD + list + version history
- [ ] `exam-test.service.ts` — Business logic, default scoring configs
- [ ] `exam-test.validation.ts` — Zod schemas
- [ ] `exam-test.controller.ts` — HTTP adapter
- [ ] `exam-test.route.ts` — Express router
- [ ] Đăng ký trong `app.ts`
- [ ] Swagger JSDoc

### Phase 2 — FE Admin UI (tuần 1–2, bắt đầu sau khi BE xong routes)
- [ ] Types + Constants
- [ ] `examTestService.ts` + TanStack Query hooks
- [ ] `FormatBadge`, `StatusBadge`, `ExamTestTable`
- [ ] `ExamTestListPage` với Tabs + Dropdown
- [ ] `ExamTestWizard` — Step 1 + 2 + 3 + 4
- [ ] Sidebar config + Router

### Phase 3 — Polish (tuần 2)
- [ ] `AnalyticsModal`, `VersionHistoryModal`
- [ ] AI parse MCQ endpoint tích hợp vào Step 2
- [ ] Swagger docs review
- [ ] UAT: tạo đề TOEIC và IELTS end-to-end

---

## 7. Ràng buộc Kỹ thuật

- **KHÔNG** sửa bất kỳ file nào trong `features/placement-test/` hoặc `server/src/models/mongo/placement-test.model.ts`.
- BE tuân thủ pattern: Zod validation → Model → Repository → Service → Controller → Route.
- FE Admin dùng **TailwindCSS + Shadcn/UI** (không dùng CSS Modules).
- Tất cả data fetching qua **TanStack Query**.
- Không có `console.log` (dùng Winston `Logger.*`).
- Không có TypeScript `any`.

*Cập nhật: 2026-04-16 | Scope: Admin CRUD only. Client exam session là Phase riêng sau.*
