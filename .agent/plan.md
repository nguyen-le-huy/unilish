# Refactor Plan: `admin/src/features/placement-test`

> **Role:** Technical Architect & Planner
> **Date:** 2026-03-07
> **Scope:** Audit + Refactor Plan cho toàn bộ feature `placement-test` trong Admin app.
> **Mục tiêu:** Đưa feature về chuẩn Enterprise (SRP, tái sử dụng, type-safe, performance, maintainability).

---

## 1. Audit Summary — Điểm mạnh hiện tại ✅

| Khu vực | Nhận xét |
|---|---|
| `types/index.ts` | Strongly-typed, rõ ràng, phân vùng tốt với comment divider |
| `constants/query-keys.ts` | Factory Pattern chuẩn, `as const`, không magic string |
| `api/placement-test.api.ts` | Thin API layer, typed response, tách rõ READ / WRITE |
| `hooks/usePlacementTests.ts` | TanStack Query đúng chuẩn, `staleTime`, `placeholderData` |
| `hooks/usePlacementTestMutations.ts` | Cache invalidation chính xác, toast feedback đúng lớp |
| `PlacementTestTable.tsx` | Decompose tốt: `SkeletonRow`, `EmptyState` — không inline |
| `Step2Structure.tsx` | DnD đúng chuẩn, `useCallback` cho `handleSaveModule` |
| `EssayModuleForm.tsx` | Gọn, rõ, 212 dòng — đạt chuẩn |
| `SpeakingModuleForm.tsx` | Gọn, rõ, 237 dòng — đạt chuẩn |

---

## 2. Audit Summary — Vấn đề cần xử lý ❌

### 2.1 [CRITICAL] MCQModuleForm.tsx — 1866 dòng, God Component

**Vấn đề:** Một file duy nhất chứa toàn bộ:
- 15+ `useState` variables
- 10+ helper/handler functions
- 6 factory functions tạo câu hỏi (gần như duplicate nhau)
- Logic detect part (`isPart1Listening`, `isPart2Listening`...) lặp lại ≥ 3 lần trong render
- AI Import Dialog nhúng trực tiếp vào form
- Group image management logic
- Tất cả rendering logic hòa lẫn business logic

**Vi phạm:** SRP, file size, re-render performance, mental legibility.

---

### 2.2 [HIGH] Question Factory Functions — Duplicate Code

6 hàm `createPartXQuestion()` có nội dung gần như giống nhau:
```ts
// createPart3Question, createPart4Question, createPart6Question, createPart7Question
// → chỉ khác chuỗi question: `Part X Question N`
```
**Vi phạm:** DRY Principle.

---

### 2.3 [HIGH] Part Detection Flags — Logic Duplication inside Render

Đoạn code dưới đây xuất hiện ≥ 3 lần trong `.map()` loops của JSX:
```ts
const isPart1Listening = partNumber === 1 || poolTag.includes('toeic-listening-part1');
const isPart2Listening = partNumber === 2 || poolTag.includes('toeic-listening-part2');
// ... (7 biến như vậy)
```
**Vi phạm:** Không extract logic ra utility function, gây re-tính toán mỗi render.

---

### 2.4 [HIGH] apiClient imported directly in MCQModuleForm

```ts
import apiClient from '@/lib/axios'; // ← trong component!
```
MCQModuleForm gọi thẳng `apiClient.post('/placement-tests/ai/parse-mcq-part3', ...)`.

**Vi phạm:** API call phải nằm trong `api/placement-test.api.ts`, không trong component. Đây là vi phạm layered architecture cơ bản.

---

### 2.5 [MEDIUM] PlacementTestStatus — Enum Anti-Pattern

```ts
// types/index.ts
export type PlacementTestStatus = 'draft' | 'active' | 'paused' | 'archived';
export const PlacementTestStatus = { DRAFT: 'draft', ... } as const; // ← trùng tên!
```
TypeScript không khuyến khích dùng type và const cùng tên (gây nhầm lẫn namespace).
`PLACEMENT_STATUS_LABELS` trong `constants/index.ts` đã cover use-case → const object này thừa.

---

### 2.6 [MEDIUM] WizardFormState — Frontend Type trong Domain Types File

`WizardFormState` là frontend-only wizard state nhưng nằm chung `types/index.ts` với các domain interface backend.

---

### 2.7 [MEDIUM] LS_KEY và draftKey — Magic Strings rải rác

```ts
// PlacementTestWizardPage.tsx
const LS_KEY = 'placement-test-wizard'; // ← local constant

// Step2Structure.tsx
draftKey={`placement-test:module-draft:mcq:${editingModule?.id ?? 'new'}`} // ← inline string
```
Nên tập trung vào `constants/storage-keys.ts`.

---

### 2.8 [MEDIUM] useWatch trên toàn bộ form — Re-render Thừa

```ts
const watchedValues = useWatch({ control: form.control }); // subscribe ALL fields
```
`useWatch` không có `name` sẽ trigger re-render mỗi keystroke của bất kỳ field nào.
Dùng để auto-save draft — nên thay bằng `form.getValues()` inside debounced effect.

---

### 2.9 [MEDIUM] Step1GeneralInfo — Hydration Logic Over-engineered

Chuỗi `hydrationKey → useMemo → lastHydrationKeyRef → useEffect` quá phức tạp cho một tác vụ đơn giản (reset form khi languages load). Cần simplify.

---

### 2.10 [LOW] LanguageStandardSuggestion Type trong constants/index.ts

```ts
// constants/index.ts
export type LanguageStandardSuggestion = { ... }; // ← type trong constants file
```
Types phải nằm trong `types/`, không trong `constants/`.

---

### 2.11 [LOW] SortableItem không có React.memo

`SortableItem` trong `Step2Structure.tsx` re-render theo mọi thay đổi của mảng modules.
Cần `React.memo`.

---

### 2.12 [LOW] serializeFilters — Falsy Guard Thiếu Nhất Quán

```ts
if (filters.page) params.page = filters.page; // bỏ qua page=0 (hiếm gặp nhưng sai về semantic)
```
Cần dùng `if (filters.page !== undefined)`.

---

## 3. Refactor Plan

### PHASE 1 — API Layer (1 ngày) 🔴 Ưu tiên cao nhất

**Mục tiêu:** Di chuyển AI parse call ra khỏi component vào đúng lớp API.

#### File thay đổi:

**`api/placement-test.api.ts`** — Thêm method:
```ts
// ADD
parseMcqContent: async (rawText: string, part: 1|2|3|4|5|6|7) => {
  const response = await apiClient.post<ApiResponse<{
    questionItems: AiImportedQuestion[];
    groupPattern?: number[];
  }>>('/placement-tests/ai/parse-mcq-part3', { rawText, part });
  return response.data.data;
},
```

**`types/index.ts`** — Export `AiImportedQuestion` type (hiện đang define local trong MCQModuleForm):
```ts
export interface AiImportedQuestion {
  question: string;
  optionA: string; optionB: string; optionC: string; optionD: string;
  correctOption: 'A' | 'B' | 'C' | 'D';
  transcript?: string;
  explanation?: string;
}
```

---

### PHASE 2 — Type System Cleanup (0.5 ngày)

#### File thay đổi:

**`types/index.ts`**
1. Xóa `export const PlacementTestStatus` (giữ `export type PlacementTestStatus`)
2. Di chuyển `WizardFormState` sang `types/wizard.types.ts` (tạo mới)
3. Thêm `AiImportedQuestion` interface (từ Phase 1)

**`types/wizard.types.ts`** _(file mới)_
```ts
// Frontend-only Wizard State
export interface WizardFormState { ... }
export type WizardStep = 1 | 2;
```

**`constants/index.ts`**
1. Xóa `LanguageStandardSuggestion` type → chỉ giữ value object `LANGUAGE_STANDARD_SUGGESTIONS`
2. Đảm bảo type import từ `../types`

**`constants/storage-keys.ts`** _(file mới)_
```ts
export const STORAGE_KEYS = {
  WIZARD_DRAFT: 'placement-test-wizard',
  MCQ_MODULE_DRAFT: (id: string) => `placement-test:module-draft:mcq:${id}`,
} as const;
```

**`index.ts`** — Update re-exports sau cleanup.

---

### PHASE 3 — MCQModuleForm Decomposition (2-3 ngày) 🔴 Ưu tiên cao nhất

**Mục tiêu:** Phá vỡ God Component 1866 dòng thành các units có SRP.

#### Cấu trúc thư mục đề xuất:

```
wizard/
  modules/
    MCQModuleForm/
      index.ts                      ← re-export MCQModuleForm
      MCQModuleForm.tsx             ← form shell, ~150 dòng
      MCQPartCard.tsx               ← card per-part (header + pool tag + audio)
      MCQPartAudioSection.tsx       ← shared audio for listening parts
      MCQQuestionRow.tsx            ← single question view/edit
      MCQGroupRow.tsx               ← grouped question cluster (Part 3/4/6/7)
      MCQGroupMediaPanel.tsx        ← shared image list + upload + reorder
      MCQAiImportDialog.tsx         ← AI import dialog (tách hoàn toàn)
      hooks/
        useMCQDraft.ts              ← localStorage draft logic
        usePart7Groups.ts           ← buildPart7Groups + group pattern state
        useGroupImages.ts           ← sharedImages read/write/upload/reorder
      utils/
        partFlags.ts                ← getPartFlags(partNumber, poolTag) → boolean flags
        questionFactory.ts          ← createDefaultQuestion(part, index) — unified
        audioUrl.ts                 ← resolveAudioPreviewUrl()
    EssayModuleForm.tsx
    SpeakingModuleForm.tsx
```

---

#### Chi tiết từng file mới:

##### `utils/partFlags.ts`
```ts
export interface PartFlags {
  isPart1: boolean; isPart2: boolean; isPart3: boolean;
  isPart4: boolean; isPart5: boolean; isPart6: boolean; isPart7: boolean;
  isListeningPart: boolean;
  isGroupedPart: boolean;
}

export function getPartFlags(partNumber: number, poolTag: string): PartFlags { ... }
```

##### `utils/questionFactory.ts`
Thay thế 6 hàm duplicate bằng 1 hàm unified:
```ts
export function createDefaultQuestion(part: number, index: number): ManualQuestion {
  const base = { question: `Part ${part} Question ${index + 1}`, ... };
  if (part === 2) base.optionD = 'N/A';
  if (part === 1) { base.optionA = 'A'; base.optionB = 'B'; ...} // fill defaults
  return base;
}
```

##### `hooks/useMCQDraft.ts`
```ts
export function useMCQDraft(draftKey: string | undefined, form: UseFormReturn<MCQModuleFormValues>) {
  // Load draft on mount
  // Auto-save with debounce (dùng form.getValues(), KHÔNG dùng useWatch)
}
```

##### `hooks/usePart7Groups.ts`
```ts
export function usePart7Groups(form: UseFormReturn<...>) {
  // part7GroupSizes state
  // part7GroupPatterns state
  // getPart7GroupPattern / setPart7GroupPattern
  // buildPart7Groups
  // getPart7GroupSize / setPart7GroupSize
}
```

##### `hooks/useGroupImages.ts`
```ts
export function useGroupImages(form: UseFormReturn<...>) {
  // getSharedImagesForGroup / setSharedImagesForGroup
  // moveGroupImage / removeGroupImage
  // handleSharedImageUpload
}
```

##### `MCQAiImportDialog.tsx`
```ts
interface Props {
  open: boolean;
  partIndex: number | null;
  partNumber: number;
  onClose: () => void;
  onApply: (questions: AiImportedQuestion[], groupPattern: number[] | null) => void;
}
```
Chứa toàn bộ state/logic AI import (aiImportText, aiImportLoading, parsedQuestions, part7Pattern).
Gọi `placementTestApi.parseMcqContent()` (từ Phase 1) thay vì `apiClient` trực tiếp.

##### `MCQGroupRow.tsx`
```ts
interface Props {
  partIndex: number; groupStart: number; groupSize: number;
  groupOrder: number; globalStart: number; globalEnd: number;
  mode: 'view' | 'edit' | undefined;
  sharedImageUrls: string[];
  onChangeMode: (mode: 'view' | 'edit' | undefined) => void;
  onRemove: () => void;
  form: UseFormReturn<MCQModuleFormValues>;
  // image handlers injected from useGroupImages
  onMoveImage: (...) => void;
  onRemoveImage: (...) => void;
  onUploadImage: (...) => void;
}
```

##### `MCQModuleForm.tsx` (sau refactor)
```
~150 dòng:
  - useForm setup
  - useFieldArray
  - useMCQDraft hook
  - usePart7Groups hook
  - useGroupImages hook
  - onSubmit handler
  - JSX: header fields + Separator + parts.map(<MCQPartCard>)
  - <MCQAiImportDialog>
```

---

### PHASE 4 — Performance & Correctness Fixes (0.5 ngày)

| Item | File | Fix |
|---|---|---|
| `useWatch` toàn bộ form | `MCQModuleForm.tsx` | Dùng `form.getValues()` inside debounced `setTimeout`, bỏ `useWatch` |
| `SortableItem` không memo | `Step2Structure.tsx` | Bọc `React.memo` |
| `if (filters.page)` falsy | `api/placement-test.api.ts` | Đổi thành `filters.page !== undefined` |
| `step1Defaults` derived state | `PlacementTestWizardPage.tsx` | Xóa biến trung gian, dùng `step1Data` trực tiếp |
| `Step1GeneralInfo` hydration | `Step1GeneralInfo.tsx` | Simplify xuống 1 `useEffect` duy nhất khi `languages` load |

---

### PHASE 5 — constants/index.ts cleanup (0.5 ngày)

```ts
// REMOVE from constants/index.ts:
export type LanguageStandardSuggestion = { ... }; // → move to types/

// ADD to constants/storage-keys.ts (từ Phase 2):
export const STORAGE_KEYS = { ... };

// UPDATE index.ts barrel to re-export from wizard.types.ts
```

---

## 4. File Map — Tóm tắt thay đổi

| File | Action | Lý do |
|---|---|---|
| `types/index.ts` | MODIFY | Xóa duplicate const, thêm AiImportedQuestion |
| `types/wizard.types.ts` | CREATE | Frontend-only types tách khỏi domain types |
| `constants/index.ts` | MODIFY | Xóa type LanguageStandardSuggestion |
| `constants/storage-keys.ts` | CREATE | Tập trung localStorage key strings |
| `api/placement-test.api.ts` | MODIFY | Thêm parseMcqContent() |
| `components/wizard/modules/MCQModuleForm.tsx` | REFACTOR → folder | Phá vỡ God Component |
| `components/wizard/modules/MCQModuleForm/MCQPartCard.tsx` | CREATE | Per-part card |
| `components/wizard/modules/MCQModuleForm/MCQPartAudioSection.tsx` | CREATE | Listening audio |
| `components/wizard/modules/MCQModuleForm/MCQQuestionRow.tsx` | CREATE | Single question |
| `components/wizard/modules/MCQModuleForm/MCQGroupRow.tsx` | CREATE | Group cluster |
| `components/wizard/modules/MCQModuleForm/MCQGroupMediaPanel.tsx` | CREATE | Image management |
| `components/wizard/modules/MCQModuleForm/MCQAiImportDialog.tsx` | CREATE | AI import dialog |
| `components/wizard/modules/MCQModuleForm/hooks/useMCQDraft.ts` | CREATE | Draft persistence |
| `components/wizard/modules/MCQModuleForm/hooks/usePart7Groups.ts` | CREATE | Part 7 grouping |
| `components/wizard/modules/MCQModuleForm/hooks/useGroupImages.ts` | CREATE | Image state |
| `components/wizard/modules/MCQModuleForm/utils/partFlags.ts` | CREATE | Flags helper |
| `components/wizard/modules/MCQModuleForm/utils/questionFactory.ts` | CREATE | Question factories |
| `components/wizard/modules/MCQModuleForm/utils/audioUrl.ts` | CREATE | Audio URL resolve |
| `components/wizard/Step2Structure.tsx` | MODIFY | Memo SortableItem |
| `components/wizard/Step1GeneralInfo.tsx` | MODIFY | Simplify hydration |
| `pages/PlacementTestWizardPage/PlacementTestWizardPage.tsx` | MODIFY | Dùng STORAGE_KEYS, cleanup step1Defaults |
| `index.ts` | MODIFY | Update exports |

---

## 5. Thứ tự thực hiện (Priority → Impact)

```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
  API fix   Types    God      Perf fix   Cleanup
  (1 ngày)  (0.5)   (2-3d)   (0.5d)    (0.5d)
```

> ⚠️ **Lưu ý thực hiện Phase 3**: Refactor từng sub-component một, build+test sau mỗi file để tránh regression. Không refactor toàn bộ MCQModuleForm trong 1 commit.

---

## 6. Acceptance Criteria

- [ ] `MCQModuleForm.tsx` (root shell) ≤ 200 dòng
- [ ] Không có file nào > 400 dòng trong feature này
- [ ] Không `import apiClient` trong bất kỳ component nào
- [ ] Không duplicate `isPart1Listening / isPart2Listening...` logic
- [ ] Không `useWatch` không có `name` trong production forms
- [ ] `SortableItem` được `React.memo`
- [ ] `STORAGE_KEYS` là single source of truth cho localStorage keys
- [ ] `PlacementTestStatus` const object bị xóa (chỉ giữ type)
- [ ] `WizardFormState` nằm trong `types/wizard.types.ts`
- [ ] `admin build` pass không warning TypeScript
