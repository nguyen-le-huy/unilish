# [FE Task] Exam Test Management — Admin UI

> **Agent:** `fe-dev`
> **Branch:** `feat/exam-test-admin-ui`
> **Tuần:** 1–2 (bắt đầu sau khi BE Task BE-5 xong)
> **Depends on:** `be-test-management.task.md` — endpoint `/api/exam-tests` phải live.
> **Stack:** TailwindCSS + Shadcn/UI (Admin — KHÔNG dùng CSS Modules)

---

## Context

Tạo mới hoàn toàn feature **`exam-tests`** trong admin.
**KHÔNG đụng** vào bất kỳ file nào trong `features/placement-test/`.

Đọc `.agent/des.md` để nắm cấu trúc modules mặc định của TOEIC L&R và IELTS.

### Routes admin mới

| Path | Page |
|---|---|
| `/exam-tests` | Danh sách tất cả exam tests |
| `/exam-tests/create` | Wizard tạo mới (chọn format trong step 1) |
| `/exam-tests/:id/edit` | Wizard chỉnh sửa |

---

## Task FE-1 — Types

**Tạo mới:** `admin/src/features/exam-tests/types/index.ts`

```typescript
// ─── Enums ────────────────────────────────────────────────────────────────────

export type ExamFormat        = 'toeic_lr' | 'ielts';
export type ExamTestStatus    = 'draft' | 'active' | 'paused' | 'archived';
export type ExamScoringFw     = 'toeic_score' | 'ielts_band';
export type ExamModuleType    = 'listening' | 'reading' | 'writing' | 'speaking';

// ─── Sub-types ────────────────────────────────────────────────────────────────

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
        audioUrl?: string;
        groupPattern?: number[];
    };
}

export interface IExamModuleListening {
    type: 'listening';
    name: string;
    timeLimitMinutes: number;
    audioUrl?: string;
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
    tasks: { task: 1 | 2; minWords: number; topics: string[] }[];
}

export interface IExamModuleSpeaking {
    type: 'speaking';
    name: string;
    part1Topics:   { text: string; audioKey?: string }[];
    part2CueCards: { text: string; shouldSay?: string[]; audioKey?: string }[];
    part3Topics:   { text: string; audioKey?: string }[];
}

export type IExamModule =
    | IExamModuleListening
    | IExamModuleReading
    | IExamModuleWriting
    | IExamModuleSpeaking;

export interface IExamBandThreshold {
    band: string;
    minScore: number;
    maxScore: number;
}

export interface IExamScoringConfig {
    framework: ExamScoringFw;
    bandThresholds: IExamBandThreshold[];
}

export interface IExamTestSettings {
    allowRetake: boolean;
    retakeCooldownDays: number;
    timeLimitOverrideMinutes?: number;
}

// ─── Main Model ───────────────────────────────────────────────────────────────

export interface IExamTest {
    _id: string;
    name: string;
    format: ExamFormat;
    languageId: string;
    language: string;
    description?: string;
    status: ExamTestStatus;
    version: number;
    modules: IExamModule[];
    scoringConfig: IExamScoringConfig;
    settings: IExamTestSettings;
    createdBy?: string;
    updatedBy?: string;
    createdAt: string;
    updatedAt: string;
}

export type IExamTestSummary = Omit<IExamTest, 'modules' | 'scoringConfig'>;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface IPaginatedExamTests {
    data: IExamTestSummary[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ─── Filters ─────────────────────────────────────────────────────────────────

export interface IExamTestFilters {
    page?: number;
    limit?: number;
    search?: string;
    format?: ExamFormat;
    status?: ExamTestStatus;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface ICreateExamTestPayload {
    name: string;
    format: ExamFormat;
    languageId: string;
    language: string;
    description?: string;
    modules?: IExamModule[];
    scoringConfig?: IExamScoringConfig;
    settings?: Partial<IExamTestSettings>;
}

export type IUpdateExamTestPayload = Partial<Omit<ICreateExamTestPayload, 'format'>>;

export interface IUpdateExamStatusPayload {
    status: 'active' | 'paused' | 'archived';
}

// ─── Wizard ───────────────────────────────────────────────────────────────────

export interface IExamWizardStep1 {
    name: string;
    format: ExamFormat;
    languageId: string;
    language: string;
    description?: string;
}

export interface IExamWizardStep2 {
    modules: IExamModule[];
}

export interface IExamWizardStep3 {
    scoringConfig: IExamScoringConfig;
}

export interface IExamWizardStep4 {
    settings: IExamTestSettings;
}

// ─── Version history ──────────────────────────────────────────────────────────

export interface IExamVersionItem {
    _id: string;
    version: number;
    status: ExamTestStatus;
    createdAt: string;
    updatedAt: string;
    createdBy?: string;
}
```

---

## Task FE-2 — Constants

**Tạo mới:** `admin/src/features/exam-tests/constants/index.ts`

```typescript
import type { ExamFormat, ExamTestStatus, IExamModule } from '../types';

// ─── Labels ───────────────────────────────────────────────────────────────────

export const EXAM_FORMAT_LABELS: Record<ExamFormat | 'all', string> = {
    all:      'Tất cả',
    toeic_lr: 'TOEIC L&R',
    ielts:    'IELTS',
};

export const EXAM_STATUS_LABELS: Record<ExamTestStatus, string> = {
    draft:    'Nháp',
    active:   'Đang hoạt động',
    paused:   'Tạm dừng',
    archived: 'Đã lưu trữ',
};

// ─── Badge classes (Tailwind) ─────────────────────────────────────────────────

export const EXAM_FORMAT_BADGE_CLASSES: Record<ExamFormat, string> = {
    toeic_lr: 'bg-amber-100 text-amber-800 border-amber-200',
    ielts:    'bg-purple-100 text-purple-800 border-purple-200',
};

export const EXAM_STATUS_BADGE_CLASSES: Record<ExamTestStatus, string> = {
    draft:    'bg-gray-100 text-gray-700 border-gray-200',
    active:   'bg-green-100 text-green-800 border-green-200',
    paused:   'bg-yellow-100 text-yellow-800 border-yellow-200',
    archived: 'bg-red-100 text-red-700 border-red-200',
};

// ─── Default Modules Factory ──────────────────────────────────────────────────

export const DEFAULT_EXAM_MODULES: Record<ExamFormat, IExamModule[]> = {
    toeic_lr: [
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
    ],
    ielts: [
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
    ],
};

// ─── Default Scoring Configs ──────────────────────────────────────────────────

export const DEFAULT_TOEIC_BANDS = [
    { band: '10–250',  minScore: 0,    maxScore: 0.25 },
    { band: '255–400', minScore: 0.25, maxScore: 0.40 },
    { band: '405–600', minScore: 0.40, maxScore: 0.60 },
    { band: '605–780', minScore: 0.60, maxScore: 0.79 },
    { band: '785–900', minScore: 0.79, maxScore: 0.91 },
    { band: '905–990', minScore: 0.91, maxScore: 1.00 },
];

export const DEFAULT_IELTS_BANDS = [
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

## Task FE-3 — API Service

**Tạo mới:** `admin/src/features/exam-tests/api/examTestService.ts`

```typescript
import api from '@/lib/axios';
import type {
    IExamTestFilters, IPaginatedExamTests,
    IExamTest, ICreateExamTestPayload, IUpdateExamTestPayload,
    IUpdateExamStatusPayload, IExamVersionItem,
} from '../types';

export const examTestService = {
    getAll:  (filters: IExamTestFilters) =>
        api.get<IPaginatedExamTests>('/exam-tests', { params: filters }).then(r => r.data),

    getById: (id: string) =>
        api.get<IExamTest>(`/exam-tests/${id}`).then(r => r.data),

    create:  (payload: ICreateExamTestPayload) =>
        api.post<IExamTest>('/exam-tests', payload).then(r => r.data),

    update:  (id: string, payload: IUpdateExamTestPayload) =>
        api.put<IExamTest>(`/exam-tests/${id}`, payload).then(r => r.data),

    updateStatus: (id: string, payload: IUpdateExamStatusPayload) =>
        api.patch<IExamTest>(`/exam-tests/${id}/status`, payload).then(r => r.data),

    getVersionHistory: (id: string) =>
        api.get<IExamVersionItem[]>(`/exam-tests/${id}/versions`).then(r => r.data),

    rollback: (id: string, version: number) =>
        api.post<IExamTest>(`/exam-tests/${id}/rollback/${version}`).then(r => r.data),

    getAnalytics: (id: string) =>
        api.get(`/exam-tests/${id}/analytics`).then(r => r.data),
};
```

---

## Task FE-4 — TanStack Query Hooks

**Folder:** `admin/src/features/exam-tests/hooks/`

```typescript
// useExamTests.ts
export const EXAM_TESTS_QUERY_KEY = 'exam-tests';

export function useExamTests(filters: IExamTestFilters) {
    return useQuery({
        queryKey: [EXAM_TESTS_QUERY_KEY, filters],
        queryFn: () => examTestService.getAll(filters),
        placeholderData: prev => prev,
    });
}

// useExamTest.ts
export function useExamTest(id: string | null) {
    return useQuery({
        queryKey: [EXAM_TESTS_QUERY_KEY, id],
        queryFn: () => examTestService.getById(id!),
        enabled: !!id,
    });
}

// useExamTestMutations.ts
export function useCreateExamTest() { ... }   // invalidate [EXAM_TESTS_QUERY_KEY] on success
export function useUpdateExamTest() { ... }   // invalidate [EXAM_TESTS_QUERY_KEY, id] on success
export function useUpdateExamTestStatus() { ... }
export function useRollbackExamTest() { ... }
```

---

## Task FE-5 — Components

### 5.1 `FormatBadge`

**File:** `admin/src/features/exam-tests/components/FormatBadge/FormatBadge.tsx`

```tsx
import { cn } from '@/lib/utils';
import { EXAM_FORMAT_LABELS, EXAM_FORMAT_BADGE_CLASSES } from '../../constants';
import type { ExamFormat } from '../../types';

export function FormatBadge({ format, className }: { format: ExamFormat; className?: string }) {
    return (
        <span className={cn(
            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
            EXAM_FORMAT_BADGE_CLASSES[format], className,
        )}>
            {EXAM_FORMAT_LABELS[format]}
        </span>
    );
}
```

### 5.2 `StatusBadge`

**File:** `admin/src/features/exam-tests/components/StatusBadge/StatusBadge.tsx`

Pattern tương tự `FormatBadge` nhưng dùng `EXAM_STATUS_BADGE_CLASSES` + `EXAM_STATUS_LABELS`.

### 5.3 `ExamTestTable`

**File:** `admin/src/features/exam-tests/components/ExamTestTable/ExamTestTable.tsx`

Dùng Shadcn `<Table>`. Cột:

| # | Cột | Content |
|---|---|---|
| 1 | **Tên** | `test.name` (bold) + `test.description` sub-text nhỏ |
| 2 | **Format** | `<FormatBadge format={test.format} />` |
| 3 | **Ngôn ngữ** | `test.language` |
| 4 | **Trạng thái** | `<StatusBadge status={test.status} />` + status toggle dropdown |
| 5 | **Phiên bản** | `v{test.version}` |
| 6 | **Cập nhật** | `formatDate(test.updatedAt)` |
| 7 | **Actions** | Dropdown: Chỉnh sửa / Lịch sử / Analytics / Xóa |

Props:
```typescript
interface ExamTestTableProps {
    data: IExamTestSummary[];
    isLoading: boolean;
    onUpdateStatus: (id: string, status: 'active' | 'paused' | 'archived') => void;
    onOpenVersionHistory: (id: string) => void;
    onOpenAnalytics: (id: string) => void;
}
```

Khi `isLoading = true` → render Skeleton rows (8 rows).

---

## Task FE-6 — ExamTestWizard (4 Steps)

**Folder:** `admin/src/features/exam-tests/components/wizard/`

### `ExamTestWizard.tsx` — Orchestrator

```tsx
const STEPS = ['Thông tin', 'Cấu trúc', 'Chấm điểm', 'Cài đặt'];

export default function ExamTestWizard({ editId }: { editId?: string }) {
    const [step, setStep] = useState(0);
    const [formData, setFormData] = useState<Partial<ICreateExamTestPayload>>({});
    const { mutate: create, isPending: isCreating } = useCreateExamTest();
    const { mutate: update, isPending: isUpdating } = useUpdateExamTest();
    const navigate = useNavigate();

    const isPending = isCreating || isUpdating;

    const handleStepData = (data: Partial<ICreateExamTestPayload>) => {
        const merged = { ...formData, ...data };
        setFormData(merged);
        if (step < STEPS.length - 1) {
            setStep(s => s + 1);
        } else {
            // Submit
            if (editId) {
                update({ id: editId, payload: merged }, { onSuccess: () => navigate('/exam-tests') });
            } else {
                create(merged as ICreateExamTestPayload, { onSuccess: (t) => navigate(`/exam-tests/${t._id}/edit`) });
            }
        }
    };

    return (
        <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto">
            {/* Stepper */}
            <div className="flex items-center gap-2">
                {STEPS.map((s, i) => (
                    <React.Fragment key={s}>
                        <div className={cn('flex items-center gap-1.5 text-sm font-medium',
                            i === step ? 'text-primary' : i < step ? 'text-muted-foreground' : 'text-muted-foreground/50'
                        )}>
                            <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs',
                                i === step ? 'bg-primary text-primary-foreground' : i < step ? 'bg-muted text-foreground' : 'bg-muted text-muted-foreground'
                            )}>{i + 1}</span>
                            {s}
                        </div>
                        {i < STEPS.length - 1 && <Separator className="flex-1" />}
                    </React.Fragment>
                ))}
            </div>

            {/* Steps */}
            {step === 0 && <Step1_BasicInfo defaultValues={formData} onDone={handleStepData} />}
            {step === 1 && <Step2_Modules   defaultValues={formData} onDone={handleStepData} onBack={() => setStep(0)} />}
            {step === 2 && <Step3_Scoring   defaultValues={formData} onDone={handleStepData} onBack={() => setStep(1)} />}
            {step === 3 && <Step4_Settings  defaultValues={formData} onDone={handleStepData} onBack={() => setStep(2)} isPending={isPending} />}
        </div>
    );
}
```

### `steps/Step1_BasicInfo.tsx`

Fields (React Hook Form + Zod):
- **Format picker** — 2 cards clickable: TOEIC L&R (amber) | IELTS (purple). Required.
- **Tên đề thi** — text input, min 3 ký tự.
- **Ngôn ngữ** — Select fetch từ `/api/curriculum/languages`.
- **Mô tả** — Textarea, optional.

Zod schema:
```typescript
const step1Schema = z.object({
    format:      z.enum(['toeic_lr','ielts']),
    name:        z.string().min(3, 'Tối thiểu 3 ký tự'),
    languageId:  z.string().min(1, 'Vui lòng chọn ngôn ngữ'),
    language:    z.string().min(1),
    description: z.string().optional(),
});
```

On submit: call `onDone({ ...values })`.

### `steps/Step2_Modules.tsx`

- Đọc `formData.format` để biết format.
- Auto-populate modules từ `DEFAULT_EXAM_MODULES[format]` khi component mount lần đầu (nếu `formData.modules` chưa có).
- Hiển thị danh sách modules dạng **Accordion cards** (expand để edit từng module):
  - **Listening / Reading module:** danh sách Parts. Mỗi Part có:
    - Tên Part (read-only với data cố định, editable với hybrid)
    - Số câu (`.questionsCount`)
    - Pool Tag (text input — link Question Bank)
    - Nút **"Nhập câu hỏi thủ công"** → mở dialog textarea (paste → sẽ gọi AI parse ở Phase 2, hiện tại chỉ lưu text thô)
  - **Writing module:** danh sách Tasks — mỗi task có min words + textarea nhập topics (1 topic/dòng).
  - **Speaking module:** 3 sections — Part 1 topics, Part 2 Cue Cards, Part 3 topics (textarea, 1 item/dòng).
  - Có thể override `timeLimitMinutes` trên mỗi module.

On submit: call `onDone({ modules: [...] })`.

### `steps/Step3_Scoring.tsx`

- Auto-populate `bandThresholds` từ `DEFAULT_TOEIC_BANDS` / `DEFAULT_IELTS_BANDS` theo format (read từ `formData.format`).
- Hiển thị `framework` dưới dạng read-only label (`TOEIC Score` / `IELTS Band`).
- **Band Thresholds Table** — có thể thêm/xóa hàng, edit từng ô:

| Band Label | Min Score (%) | Max Score (%) |
|---|---|---|
| Band 7 | 70 | 78 |
| ... | ... | ... |

Min/Max nhập dưới dạng % (0–100), frontend tự convert sang 0–1 khi submit.

On submit: call `onDone({ scoringConfig: { framework, bandThresholds: [...converted] } })`.

### `steps/Step4_Settings.tsx`

Fields:
- **Cho phép làm lại** — Switch
- **Thời gian chờ** — Number input (days), ẩn khi `allowRetake = false`
- Nút **"Lưu nháp"** (submit với status mặc định, không thêm gì) và **"Xuất bản ngay"** (gửi thêm `{ autoPublish: true }` — tùy BE có support hay không, nếu không thì dùng 2 API call: create rồi PATCH status).

On submit: call `onDone({ settings: { allowRetake, retakeCooldownDays } })`.

---

## Task FE-7 — Pages

### `ExamTestListPage.tsx`

**File:** `admin/src/features/exam-tests/pages/ExamTestListPage/ExamTestListPage.tsx`

```tsx
const PAGE_SIZE = 20;

export default function ExamTestListPage() {
    const navigate = useNavigate();
    const [formatFilter, setFormatFilter] = useState<ExamFormat | 'all'>('all');
    const [search, setSearch]             = useState('');
    const debouncedSearch                 = useDebounce(search, 350);
    const [statusFilter, setStatusFilter] = useState<ExamTestStatus | 'all'>('all');
    const [page, setPage]                 = useState(1);

    // Modal state
    const [analyticsId, setAnalyticsId]   = useState<string | null>(null);
    const [historyId, setHistoryId]       = useState<string | null>(null);

    const { data, isLoading } = useExamTests({
        page,
        limit: PAGE_SIZE,
        search: debouncedSearch || undefined,
        format: formatFilter === 'all' ? undefined : formatFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
    });

    const { mutate: updateStatus } = useUpdateExamTestStatus();

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <PageHeader
                title="Quản lý Bài Thi"
                description="Quản lý đề thi thử TOEIC L&R và IELTS theo chuẩn quốc tế."
            >
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            Tạo bài thi
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => navigate('/exam-tests/create?format=toeic_lr')}>
                            <BookOpen className="h-4 w-4 mr-2 text-amber-600" />
                            Đề thi TOEIC L&R
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate('/exam-tests/create?format=ielts')}>
                            <GraduationCap className="h-4 w-4 mr-2 text-purple-600" />
                            Đề thi IELTS
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </PageHeader>

            {/* Format Tabs */}
            <Tabs value={formatFilter} onValueChange={v => { setFormatFilter(v as ExamFormat | 'all'); setPage(1); }}>
                <TabsList>
                    {(['all','toeic_lr','ielts'] as const).map(f => (
                        <TabsTrigger key={f} value={f}>{EXAM_FORMAT_LABELS[f]}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>

            {/* Filter bar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Tìm tên đề thi..." className="pl-9" value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <Select value={statusFilter} onValueChange={v => { setStatusFilter(v as ExamTestStatus | 'all'); setPage(1); }}>
                    <SelectTrigger className="w-44"><SelectValue placeholder="Trạng thái" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        {(Object.entries(EXAM_STATUS_LABELS) as [ExamTestStatus, string][]).map(([v, l]) => (
                            <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <ExamTestTable
                data={data?.data ?? []}
                isLoading={isLoading}
                onUpdateStatus={(id, status) => updateStatus({ id, payload: { status } })}
                onOpenVersionHistory={setHistoryId}
                onOpenAnalytics={setAnalyticsId}
            />

            {/* Pagination */}
            {(data?.totalPages ?? 1) > 1 && ( /* ... standard pagination buttons ... */ )}

            {/* Modals */}
            <AnalyticsModal    testId={analyticsId} onClose={() => setAnalyticsId(null)} />
            <VersionHistoryModal testId={historyId} onClose={() => setHistoryId(null)} />
        </div>
    );
}
```

### `ExamTestWizardPage.tsx`

**File:** `admin/src/features/exam-tests/pages/ExamTestWizardPage/ExamTestWizardPage.tsx`

```tsx
export default function ExamTestWizardPage() {
    const { id } = useParams<{ id?: string }>();
    const [searchParams] = useSearchParams();
    const presetFormat = searchParams.get('format') as ExamFormat | null;

    return (
        <div className="flex flex-col gap-4 p-6">
            <PageHeader
                title={id ? 'Chỉnh sửa Bài Thi' : 'Tạo Bài Thi Mới'}
                description="Cấu hình đề thi TOEIC hoặc IELTS."
            />
            <ExamTestWizard editId={id} presetFormat={presetFormat ?? undefined} />
        </div>
    );
}
```

---

## Task FE-8 — Sidebar & Router

### Sidebar

**File:** `admin/src/config/sidebar.config.ts`

Thêm vào mảng `items` của section **"Đào tạo"**, sau item "Bài Kiểm tra Đầu vào":

```typescript
{
    title: 'Quản lý Bài Thi',
    url: '/exam-tests',
    description: 'Đề thi thử TOEIC L&R và IELTS theo chuẩn quốc tế',
},
```

### Router

**File:** `admin/src/app/router.tsx`

Thêm lazy imports:
```typescript
const ExamTestListPage   = lazy(() => import('@/features/exam-tests/pages/ExamTestListPage/ExamTestListPage'));
const ExamTestWizardPage = lazy(() => import('@/features/exam-tests/pages/ExamTestWizardPage/ExamTestWizardPage'));
```

Thêm vào `children` (sau các `placement-tests` routes):
```typescript
{
    path: 'exam-tests',
    element: <Suspense fallback={pageLoaderFallback}><ExamTestListPage /></Suspense>,
},
{
    path: 'exam-tests/create',
    element: <Suspense fallback={pageLoaderFallback}><ExamTestWizardPage /></Suspense>,
},
{
    path: 'exam-tests/:id/edit',
    element: <Suspense fallback={pageLoaderFallback}><ExamTestWizardPage /></Suspense>,
},
```

---

## Acceptance Criteria

- [ ] `/exam-tests` hiển thị danh sách bài thi với bảng đầy đủ cột.
- [ ] Tab "TOEIC L&R" chỉ hiện `format: 'toeic_lr'`, tab "IELTS" chỉ hiện `format: 'ielts'`.
- [ ] `FormatBadge` hiển thị đúng màu amber (TOEIC) / purple (IELTS).
- [ ] Dropdown "Tạo bài thi" cho phép chọn TOEIC hoặc IELTS và navigate đúng.
- [ ] Step 1: chọn format → Step 2: modules auto-populate theo format.
- [ ] Step 3: band thresholds auto-populate theo format, có thể edit.
- [ ] Submit wizard → tạo thành công bài thi mới trên server.
- [ ] Sidebar có mục "Quản lý Bài Thi" → navigate đúng tới `/exam-tests`.
- [ ] Placement test pages không bị ảnh hưởng.
- [ ] Không có `any` type.
- [ ] Tất cả data fetching qua TanStack Query.
- [ ] Không có inline styles.

## Non-Goals

- Không xây dựng `AnalyticsModal` và `VersionHistoryModal` chi tiết trong sprint này — có thể dùng placeholder.
- Không tích hợp AI parse MCQ (Phase 2).
- Không build client-side exam session.
- Không đụng vào `features/placement-test/*`.
