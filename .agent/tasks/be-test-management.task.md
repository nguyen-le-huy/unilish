# [BE Task] Exam Test Management — Server

> **Agent:** `be-dev`
> **Branch:** `feat/exam-test-server`
> **Tuần:** 1
> **Depends on:** Nothing
> **Blocks:** `fe-exam-test.task.md` (FE cần endpoints sống trước)

---

## Context

Tạo mới hoàn toàn feature **Exam Test** (TOEIC L&R + IELTS) dưới `/api/exam-tests`.
**KHÔNG đụng** vào bất kỳ file nào của `placement-test` hiện có.

Đọc `.agent/des.md` trước để nắm cấu trúc domain và default scoring configs.

---

## Task BE-1 — Mongoose Model

**Tạo mới:** `server/src/models/mongo/exam-test.model.ts`

### Enums

```typescript
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
    TOEIC_SCORE: 'toeic_score',
    IELTS_BAND:  'ielts_band',
} as const;
```

### Interfaces (TypeScript)

```typescript
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

export interface IExamPartConfig {
    part: number;
    name: string;
    questionsCount: number;
    poolTag: string;
    manualContent?: {
        questionItems?: IExamQuestionItem[];
        audioUrl?: string;          // shared audio (Part 3/4 TOEIC, Sections IELTS)
        groupPattern?: number[];    // Part 7 passage grouping
    };
}

export interface IExamModuleListening {
    type: 'listening';
    name: string;
    timeLimitMinutes: number;
    audioUrl?: string;    // master audio (IELTS single-track)
    parts: IExamPartConfig[];
}

export interface IExamModuleReading {
    type: 'reading';
    name: string;
    timeLimitMinutes: number;
    parts: IExamPartConfig[];
}

export interface IExamWritingTask {
    task: 1 | 2;
    minWords: number;
    topics: string[];
}

export interface IExamModuleWriting {
    type: 'writing';
    name: string;
    timeLimitMinutes: number;
    tasks: IExamWritingTask[];
}

export interface IExamSpeakingTopic {
    text: string;
    audioKey?: string;
}

export interface IExamSpeakingCueCard {
    text: string;
    shouldSay?: string[];
    audioKey?: string;
}

export interface IExamModuleSpeaking {
    type: 'speaking';
    name: string;
    part1Topics: IExamSpeakingTopic[];
    part2CueCards: IExamSpeakingCueCard[];
    part3Topics: IExamSpeakingTopic[];
}

export type IExamModule =
    | IExamModuleListening
    | IExamModuleReading
    | IExamModuleWriting
    | IExamModuleSpeaking;

export interface IExamBandThreshold {
    band: string;       // "Band 7", "Score 785+"
    minScore: number;   // 0–1 normalized
    maxScore: number;
}

export interface IExamScoringConfig {
    framework: typeof EExamScoringFramework[keyof typeof EExamScoringFramework];
    bandThresholds: IExamBandThreshold[];
}

export interface IExamTestSettings {
    allowRetake: boolean;
    retakeCooldownDays: number;
    timeLimitOverrideMinutes?: number;
}

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
    settings: IExamTestSettings;
    createdBy: mongoose.Types.ObjectId;
    updatedBy?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
```

### Mongoose Schemas

Tạo sub-schemas cho:
- `ExamQuestionItemSchema` (`_id: false`)
- `ExamPartConfigSchema` (`_id: false`, với `manualContent` embedded)
- `ExamModuleListeningSchema`, `ExamModuleReadingSchema`, `ExamModuleWritingSchema`, `ExamModuleSpeakingSchema` — tất cả `_id: false`, `strict: false` để polymorphic
- `ExamBandThresholdSchema` (`_id: false`)
- `ExamScoringConfigSchema`
- `ExamTestSettingsSchema`

Main `ExamTestSchema`:
```typescript
const ExamTestSchema = new mongoose.Schema<IExamTest>(
    {
        name:        { type: String, required: true, trim: true },
        format:      { type: String, enum: Object.values(EExamFormat), required: true, index: true },
        languageId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Language', required: true, index: true },
        language:    { type: String, required: true, trim: true, index: true },
        description: { type: String, default: null },
        status:      { type: String, enum: Object.values(EExamTestStatus), default: 'draft', index: true },
        version:     { type: Number, default: 1, min: 1 },
        modules:     { type: [ExamModuleSchema], default: [] },  // ExamModuleSchema: strict: false
        scoringConfig: ExamScoringConfigSchema,
        settings:    ExamTestSettingsSchema,
        createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        updatedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    { timestamps: true, collection: 'examtests' },
);
```

**Indexes:**
```typescript
ExamTestSchema.index({ format: 1, status: 1 });
ExamTestSchema.index({ language: 1, format: 1 });
ExamTestSchema.index({ name: 1, format: 1, version: -1 });
ExamTestSchema.index({ name: 1, format: 1 }); // for version history lookup
```

**Export:**
```typescript
export const ExamTest = mongoose.model<IExamTest>('ExamTest', ExamTestSchema);
```

---

## Task BE-2 — Repository

**Tạo mới:** `server/src/repositories/mongo/exam-test.mongo.repository.ts`

### Filters interface

```typescript
export interface ExamTestListFilters {
    page?: number;
    limit?: number;
    search?: string;
    format?: string;    // 'toeic_lr' | 'ielts'
    status?: string;
}

export interface ExamTestListResult {
    data: Partial<IExamTest>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
```

### Methods cần implement

```typescript
class ExamTestMongoRepository {
    // List + pagination
    async findMany(filters: ExamTestListFilters): Promise<ExamTestListResult>

    // Single
    async findById(id: string): Promise<IExamTest | null>

    // Create
    async create(data: Partial<IExamTest>): Promise<IExamTest>

    // Update (findOneAndUpdate, return new)
    async updateById(id: string, data: Partial<IExamTest>): Promise<IExamTest | null>

    // Version history (same name + format, all versions)
    async findVersionHistory(name: string, format: string): Promise<Partial<IExamTest>[]>

    // Get specific version
    async findByNameFormatVersion(name: string, format: string, version: number): Promise<IExamTest | null>

    // Get latest version number
    async getLatestVersion(name: string, format: string): Promise<number>

    // Archive active tests with same name+format (before publishing new version)
    async archiveActiveByNameFormat(name: string, format: string, excludeId: string): Promise<void>
}

export const examTestMongoRepository = new ExamTestMongoRepository();
```

**Rules:**
- `findMany()` — dùng `.lean()` + `.select('-modules')` cho list view (không lấy toàn bộ modules).
- `findById()` — lấy full document kể cả modules.
- `findVersionHistory()` — `.lean().select('_id name format status version createdAt updatedAt createdBy')`.

---

## Task BE-3 — Service

**Tạo mới:** `server/src/services/exam-test.service.ts`

### Default Scoring Configs (constants trong file)

```typescript
const DEFAULT_TOEIC_BANDS: IExamBandThreshold[] = [
    { band: '10–250',  minScore: 0,    maxScore: 0.25 },
    { band: '255–400', minScore: 0.25, maxScore: 0.40 },
    { band: '405–600', minScore: 0.40, maxScore: 0.60 },
    { band: '605–780', minScore: 0.60, maxScore: 0.79 },
    { band: '785–900', minScore: 0.79, maxScore: 0.91 },
    { band: '905–990', minScore: 0.91, maxScore: 1.00 },
];

const DEFAULT_IELTS_BANDS: IExamBandThreshold[] = [
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

### Default Modules Factory

```typescript
private static buildDefaultModules(format: string): IExamModule[] {
    if (format === EExamFormat.TOEIC_LR) {
        return [
            {
                type: 'listening', name: 'Listening', timeLimitMinutes: 45,
                parts: [
                    { part: 1, name: 'Part 1 — Photographs',     questionsCount: 6,  poolTag: 'toeic-listening-part1' },
                    { part: 2, name: 'Part 2 — Q-Response',      questionsCount: 25, poolTag: 'toeic-listening-part2' },
                    { part: 3, name: 'Part 3 — Conversations',   questionsCount: 39, poolTag: 'toeic-listening-part3' },
                    { part: 4, name: 'Part 4 — Short Talks',     questionsCount: 30, poolTag: 'toeic-listening-part4' },
                ],
            },
            {
                type: 'reading', name: 'Reading', timeLimitMinutes: 75,
                parts: [
                    { part: 5, name: 'Part 5 — Incomplete Sentences', questionsCount: 30, poolTag: 'toeic-reading-part5' },
                    { part: 6, name: 'Part 6 — Text Completion',      questionsCount: 16, poolTag: 'toeic-reading-part6' },
                    { part: 7, name: 'Part 7 — Comprehension',        questionsCount: 54, poolTag: 'toeic-reading-part7' },
                ],
            },
        ];
    }

    if (format === EExamFormat.IELTS) {
        return [
            {
                type: 'listening', name: 'Listening', timeLimitMinutes: 30,
                parts: [
                    { part: 1, name: 'Section 1', questionsCount: 10, poolTag: 'ielts-listening-section1' },
                    { part: 2, name: 'Section 2', questionsCount: 10, poolTag: 'ielts-listening-section2' },
                    { part: 3, name: 'Section 3', questionsCount: 10, poolTag: 'ielts-listening-section3' },
                    { part: 4, name: 'Section 4', questionsCount: 10, poolTag: 'ielts-listening-section4' },
                ],
            },
            {
                type: 'reading', name: 'Reading', timeLimitMinutes: 60,
                parts: [
                    { part: 1, name: 'Passage 1', questionsCount: 14, poolTag: 'ielts-reading-passage1' },
                    { part: 2, name: 'Passage 2', questionsCount: 13, poolTag: 'ielts-reading-passage2' },
                    { part: 3, name: 'Passage 3', questionsCount: 13, poolTag: 'ielts-reading-passage3' },
                ],
            },
            {
                type: 'writing', name: 'Writing', timeLimitMinutes: 60,
                tasks: [
                    { task: 1, minWords: 150, topics: [] },
                    { task: 2, minWords: 250, topics: [] },
                ],
            },
            {
                type: 'speaking', name: 'Speaking',
                part1Topics: [], part2CueCards: [], part3Topics: [],
            },
        ];
    }

    return [];
}
```

### Methods cần implement

```typescript
class ExamTestService {
    // Helpers
    private static buildDefaultScoringConfig(format: string): IExamScoringConfig
    private static buildDefaultModules(format: string): IExamModule[]

    // CRUD
    async getAll(query: GetExamTestsQuery): Promise<ExamTestListResult>
    async getById(id: string): Promise<IExamTest>
    async create(data: CreateExamTestBody, adminId: string): Promise<IExamTest>
    async update(id: string, data: UpdateExamTestBody, adminId: string): Promise<IExamTest>
    async updateStatus(id: string, status: string, adminId: string): Promise<IExamTest>

    // Versioning
    async getVersionHistory(id: string): Promise<Partial<IExamTest>[]>
    async rollback(id: string, version: number, adminId: string): Promise<IExamTest>

    // Analytics (stub — trả về mock data, implement chi tiết sau)
    async getAnalytics(id: string): Promise<Record<string, unknown>>
}
```

**Rules trong `create()`:**
- Nếu `modules` không được truyền → auto-populate từ `buildDefaultModules(format)`.
- Nếu `scoringConfig` không được truyền → auto-populate từ `buildDefaultScoringConfig(format)`.
- Log `Logger.info('ExamTest created', { testId, format, adminId })`.

**Rules trong `updateStatus()` → `active`:**
- Archive bất kỳ test `active` nào có cùng `name + format` (trừ current id).
- Bump version nếu test đã từng active trước đó.

---

## Task BE-4 — Controller

**Tạo mới:** `server/src/controllers/exam-test.controller.ts`

Pattern giống `placement-test.controller.ts`:
- Mỗi method là `static readonly` arrow function.
- Tất cả wrapped trong `catchAsync()`.
- Không có business logic — chỉ gọi service + trả response.

```typescript
export class ExamTestController {
    static readonly getAll    = catchAsync(async (req, res) => { ... });
    static readonly getById   = catchAsync(async (req, res) => { ... });
    static readonly create    = catchAsync(async (req, res) => { ... });
    static readonly update    = catchAsync(async (req, res) => { ... });
    static readonly updateStatus   = catchAsync(async (req, res) => { ... });
    static readonly getVersionHistory = catchAsync(async (req, res) => { ... });
    static readonly rollback  = catchAsync(async (req, res) => { ... });
    static readonly getAnalytics   = catchAsync(async (req, res) => { ... });
}
```

---

## Task BE-5 — Route & Register in app.ts

**Tạo mới:** `server/src/routes/exam-test.route.ts`

```typescript
import express from 'express';
import { protect, restrictTo } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { ExamTestController } from '../controllers/exam-test.controller.js';
import {
    getExamTestsSchema,
    getExamTestByIdSchema,
    createExamTestSchema,
    updateExamTestSchema,
    updateExamTestStatusSchema,
    getVersionHistorySchema,
    rollbackExamTestSchema,
    analyticsExamTestSchema,
} from '../validations/exam-test.validation.js';

const router = express.Router();
router.use(protect);

// Static sub-routes trước /:id
router.get('/:id/versions',   restrictTo('admin','content_creator'), validate(getVersionHistorySchema),   ExamTestController.getVersionHistory);
router.get('/:id/analytics',  restrictTo('admin','content_creator'), validate(analyticsExamTestSchema),   ExamTestController.getAnalytics);

// CRUD
router.get('/',     restrictTo('admin','content_creator'), validate(getExamTestsSchema),    ExamTestController.getAll);
router.get('/:id',  restrictTo('admin','content_creator'), validate(getExamTestByIdSchema), ExamTestController.getById);
router.post('/',    restrictTo('admin'), validate(createExamTestSchema),                    ExamTestController.create);
router.put('/:id',  restrictTo('admin'), validate(updateExamTestSchema),                    ExamTestController.update);
router.patch('/:id/status',  restrictTo('admin'), validate(updateExamTestStatusSchema),     ExamTestController.updateStatus);
router.post('/:id/rollback/:version', restrictTo('admin'), validate(rollbackExamTestSchema), ExamTestController.rollback);

export default router;
```

**Sửa `server/src/app.ts`** — thêm vào cuối danh sách import + route:

```typescript
// Import (thêm sau dòng placementTestRouter)
import examTestRouter from './routes/exam-test.route.js';

// Register (thêm sau dòng app.use('/api/placement-tests', ...))
app.use('/api/exam-tests', examTestRouter);
```

---

## Task BE-6 — Zod Validation

**Tạo mới:** `server/src/validations/exam-test.validation.ts`

```typescript
import { z } from 'zod';

const ExamFormatSchema = z.enum(['toeic_lr', 'ielts']);
const ExamStatusSchema = z.enum(['draft', 'active', 'paused', 'archived']);

const ExamQuestionItemSchema = z.object({
    question:      z.string().min(1),
    options: z.object({ A: z.string(), B: z.string(), C: z.string(), D: z.string() }),
    correctOption: z.enum(['A','B','C','D']),
    explanation:   z.string().optional(),
    transcript:    z.string().optional(),
    audioUrl:      z.string().url().optional(),
    imageUrl:      z.string().url().optional(),
    imageUrls:     z.array(z.string().url()).optional(),
});

const ExamPartConfigSchema = z.object({
    part:           z.number().int().positive(),
    name:           z.string().min(1),
    questionsCount: z.number().int().positive(),
    poolTag:        z.string().min(1),
    manualContent:  z.object({
        questionItems: z.array(ExamQuestionItemSchema).optional(),
        audioUrl:      z.string().url().optional(),
        groupPattern:  z.array(z.number()).optional(),
    }).optional(),
});

const ExamModuleListeningSchema = z.object({
    type: z.literal('listening'),
    name: z.string().min(1),
    timeLimitMinutes: z.number().int().positive(),
    audioUrl: z.string().url().optional(),
    parts: z.array(ExamPartConfigSchema),
});

const ExamModuleReadingSchema = z.object({
    type: z.literal('reading'),
    name: z.string().min(1),
    timeLimitMinutes: z.number().int().positive(),
    parts: z.array(ExamPartConfigSchema),
});

const ExamModuleWritingSchema = z.object({
    type: z.literal('writing'),
    name: z.string().min(1),
    timeLimitMinutes: z.number().int().positive(),
    tasks: z.array(z.object({
        task:     z.union([z.literal(1), z.literal(2)]),
        minWords: z.number().int().positive(),
        topics:   z.array(z.string()),
    })),
});

const ExamModuleSpeakingSchema = z.object({
    type: z.literal('speaking'),
    name: z.string().min(1),
    part1Topics:   z.array(z.object({ text: z.string(), audioKey: z.string().optional() })),
    part2CueCards: z.array(z.object({ text: z.string(), shouldSay: z.array(z.string()).optional(), audioKey: z.string().optional() })),
    part3Topics:   z.array(z.object({ text: z.string(), audioKey: z.string().optional() })),
});

const ExamModuleSchema = z.discriminatedUnion('type', [
    ExamModuleListeningSchema,
    ExamModuleReadingSchema,
    ExamModuleWritingSchema,
    ExamModuleSpeakingSchema,
]);

const BandThresholdSchema = z.object({
    band:     z.string().min(1),
    minScore: z.number().min(0).max(1),
    maxScore: z.number().min(0).max(1),
});

const ScoringConfigSchema = z.object({
    framework:      z.enum(['toeic_score','ielts_band']),
    bandThresholds: z.array(BandThresholdSchema),
});

// ─── Exported schemas ─────────────────────────────────────────────────────────

export const getExamTestsSchema = z.object({
    query: z.object({
        page:   z.coerce.number().int().positive().default(1),
        limit:  z.coerce.number().int().positive().max(100).default(20),
        search: z.string().trim().optional(),
        format: ExamFormatSchema.optional(),
        status: ExamStatusSchema.optional(),
    }),
});

export const getExamTestByIdSchema  = z.object({ params: z.object({ id: z.string().min(1) }) });
export const getVersionHistorySchema = z.object({ params: z.object({ id: z.string().min(1) }) });
export const analyticsExamTestSchema = z.object({ params: z.object({ id: z.string().min(1) }) });

export const createExamTestSchema = z.object({
    body: z.object({
        name:         z.string().min(3).max(200),
        format:       ExamFormatSchema,
        languageId:   z.string().min(1),
        language:     z.string().min(1),
        description:  z.string().optional(),
        modules:      z.array(ExamModuleSchema).optional(),  // optional: auto-populated
        scoringConfig: ScoringConfigSchema.optional(),        // optional: auto-populated
        settings: z.object({
            allowRetake:              z.boolean().default(false),
            retakeCooldownDays:       z.number().int().min(0).default(30),
            timeLimitOverrideMinutes: z.number().int().positive().optional(),
        }).optional(),
    }),
});

export const updateExamTestSchema = z.object({
    params: z.object({ id: z.string().min(1) }),
    body: createExamTestSchema.shape.body.partial().omit({ format: true }),
});

export const updateExamTestStatusSchema = z.object({
    params: z.object({ id: z.string().min(1) }),
    body: z.object({ status: z.enum(['active','paused','archived']) }),
});

export const rollbackExamTestSchema = z.object({
    params: z.object({ id: z.string().min(1), version: z.coerce.number().int().positive() }),
});

// Inferred types (export for use in service/controller)
export type GetExamTestsQuery    = z.infer<typeof getExamTestsSchema>['query'];
export type CreateExamTestBody   = z.infer<typeof createExamTestSchema>['body'];
export type UpdateExamTestBody   = z.infer<typeof updateExamTestSchema>['body'];
```

---

## Acceptance Criteria

- [ ] `POST /api/exam-tests` với `format: 'toeic_lr'` tự động điền 2 modules và TOEIC scoring config.
- [ ] `POST /api/exam-tests` với `format: 'ielts'` tự động điền 4 modules và IELTS band config.
- [ ] `GET /api/exam-tests?format=ielts` chỉ trả về IELTS tests.
- [ ] `PATCH /api/exam-tests/:id/status` với `status: 'active'` archive bài cũ cùng name+format.
- [ ] Collection **`examtests`** hoàn toàn độc lập, không đụng `placementtests`.
- [ ] `GET /api/placement-tests` vẫn hoàn toàn bình thường (không bị ảnh hưởng).
- [ ] Không có `console.log` — dùng `Logger.*`.
- [ ] Không có `any` type.
- [ ] Swagger JSDoc trên tất cả endpoints.

## Non-Goals

- Không xây dựng student-facing exam session runtime (Phase 2 riêng).
- Không sửa bất kỳ file `placement-test.*` hiện có.
