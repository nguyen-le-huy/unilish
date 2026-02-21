# REFACTOR PLAN: `admin/features/curriculum/goals`

> **Planner:** Architecture & Planning Agent
> **Date:** 2026-02-21
> **Priority:** HIGH — 1 lỗi runtime nghiêm trọng + nhiều vi phạm critical
> **Scope:** Toàn bộ feature `goals` trong Admin App

---

## 1. AUDIT SUMMARY

### 🔴 Critical (Vi phạm bắt buộc + có thể gây runtime error)

| # | File | Vấn đề | Quy tắc vi phạm |
|:--|:-----|:--------|:----------------|
| C1 | `LanguageConfig.tsx` | **RUNTIME ERROR**: Import từ `@/features/curriculum/languages/hooks/useLanguageData` — file này đã bị XÓA trong refactor languages. App vỡ tại đây. | FSD + Refactor residue |
| C2 | `LanguageConfig.tsx` | **Cross-feature internal import** — component trong `goals` nhưng import trực tiếp internal hooks của `languages` feature. Vi phạm FSD isolation cực kỳ nghiêm trọng. | FSD §2 Dependency Rule |
| C3 | `GoalEditorPage.tsx` | **6 `useState` thay vì RHF + Zod** — `title`, `goalSlug`, `targetAudience`, `systemPrompt`, `ignoredSkills`, `skillWeights` | `rules.md §3 Frontend` |
| C4 | `GoalEditorPage.tsx` | **`useEffect` để sync form** từ API data — anti-pattern | `rules.md §3` |
| C5 | `GoalEditorPage.tsx` | **Manual `isValid`** — không có Zod schema, tự tính bằng boolean expression | `rules.md §3` |
| C6 | `types/learning-goal.types.ts` | **`TTSProvider` và `Language` interface bị duplicate** — đã tồn tại trong `languages` feature, định nghĩa lại tạo type drift khi backend thay đổi | DRY |
| C7 | `types/learning-goal.types.ts` | **`DEFAULT_SKILL_WEIGHTS`, `SKILL_PRESETS` constants nằm trong file types** — vi phạm SoC | `rules.md §4` |
| C8 | `GoalListPage.tsx` | **`window.prompt()` cho duplicate** — đây là Web API cơ bản nhất, không dùng trong enterprise app. Hoàn toàn không kiểm soát UX. | Enterprise Standard |

### 🟠 Major (Ảnh hưởng performance & maintainability)

| # | File | Vấn đề |
|:--|:-----|:--------|
| M1 | `GoalListPage.tsx` | Không có `useDebounce` cho search — gọi API mỗi keystroke |
| M2 | `GoalListPage.tsx` | Skeleton dùng `animate-pulse div` thô — nên dùng Shadcn `<Skeleton>` |
| M3 | `GoalListPage.tsx` | `handleDuplicate` là `async` trong component, không extract thành custom hook |
| M4 | `hooks/useLearningGoalData.ts` | **9 hooks trong 1 file** — monolithic, khó maintain |
| M5 | `hooks/useLearningGoalData.ts` | `getErrorMessage` định nghĩa local — nên dùng `getApiErrorMessage` từ `@/lib/api-error.ts` đã có |
| M6 | `hooks/useLearningGoalData.ts` | `LEARNING_GOAL_QUERY_KEYS` không theo **key factory pattern** — `list: ['learning-goals'] as const` không cho phép invalidate granular |
| M7 | `hooks/useLearningGoalData.ts` | `useToggleLearningGoalStatus` **không có Optimistic Update** — gây flicker UI |
| M8 | `hooks/useLearningGoalData.ts` | `useLearningGoalDetail` không có `staleTime` |
| M9 | `api/learning-goal.api.ts` | `ApiResponse<T>` định nghĩa local — nên dùng `@/types/api.ts` shared |
| M10 | `GoalCard.tsx` | Không có `React.memo` — re-render toàn bộ grid khi toggle 1 goal |
| M11 | `GoalCard.tsx` | `aria-label="toggle-goal-status"` quá generic — không có context |
| M12 | `RadarSkillChart.tsx` | `data` array tạo lại mỗi render — cần `useMemo` |
| M13 | `GoalEditorPage.tsx` | `normalizeVietnamese()`, `parseIgnoredSkills()`, `toSlug()` — pure utilities nằm trong page file, nên move vào `utils/` |

### 🟡 Minor (Code quality)

| # | File | Vấn đề |
|:--|:-----|:--------|
| S1 | Toàn feature | **Không có `index.ts`** barrel export |
| S2 | `GoalEditorPage.tsx` | `IgnoredSkill` type định nghĩa inline trong page, nên ở `types/` |
| S3 | `GoalEditorPage.tsx` | `<label>` HTML tag thay vì `<Label>` Shadcn + thiếu `htmlFor` |
| S4 | `AISandbox.tsx` | `<label>` thay `<Label>`, không có `aria-label` |
| S5 | `LanguageConfig.tsx` | `<label>` thay `<Label>`, không có `aria-label` |
| S6 | `SkillWeightEditor.tsx` | `SKILL_PRESETS` import từ types file — sau refactor nên import từ `constants/` |
| S7 | `GoalListPage.tsx` | Thiếu `aria-label` trên input và nút tạo mới |

---

## 2. ĐẶC BIỆT — Cross-Feature Architecture Violation (C1 + C2)

Đây là vấn đề **nghiêm trọng nhất** cần fix **đầu tiên**.

```
goals/components/LanguageConfig/LanguageConfig.tsx
    ↓ IMPORTS (broken)
languages/hooks/useLanguageData.ts  ← FILE ĐÃ BỊ XÓA
languages/types/language.types.ts   ← Cross-feature internal import
```

**Giải pháp đúng theo FSD:**

Option A (Recommended): `LanguageConfig` chỉ được import từ **public barrel** của `languages` feature:
```typescript
// ✅ Đúng
import { useLanguages, useUpdateLanguage } from '@/features/curriculum/languages';

// ❌ Sai
import { useLanguages } from '@/features/curriculum/languages/hooks/useLanguages';
```
→ Cần update `languages/index.ts` để export hooks cần thiết.

Option B: `LanguageConfig` dùng `useLanguages` và `useUpdateLanguageTts` từ chính `useLearningGoalData.ts` (đi qua goals API endpoint), loại bỏ cross-feature dependency hoàn toàn.

**Quyết định: Option A** — vì `LanguageConfig` về bản chất thao tác trực tiếp với Language entity, không phải Goal. Nên dùng languages public API.

---

## 3. TARGET STRUCTURE SAU REFACTOR

```
admin/src/features/curriculum/goals/
├── api/
│   └── learning-goal.api.ts          # [REFACTOR] dùng @/types/api, xóa getLanguages/updateLanguageTts
├── constants/
│   ├── query-keys.ts                 # [NEW] LEARNING_GOAL_QUERY_KEYS (factory pattern)
│   └── skill.constants.ts            # [NEW] DEFAULT_SKILL_WEIGHTS, SKILL_PRESETS, SKILLS array
├── components/
│   ├── GoalCard/
│   │   └── GoalCard.tsx              # [REFACTOR] React.memo, proper aria-label
│   ├── AISandbox/
│   │   └── AISandbox.tsx             # [REFACTOR] Label, aria-label, error state
│   ├── LanguageConfig/
│   │   └── LanguageConfig.tsx        # [FIX] import từ languages public barrel index.ts
│   ├── RadarSkillChart/
│   │   └── RadarSkillChart.tsx       # [REFACTOR] useMemo cho data array
│   ├── SkillWeightEditor/
│   │   └── SkillWeightEditor.tsx     # [REFACTOR] import constants từ constants/
│   └── DuplicateGoalDialog/
│       └── DuplicateGoalDialog.tsx   # [NEW] Thay thế window.prompt()
├── hooks/
│   ├── useLearningGoals.ts           # [NEW] tách query hooks
│   ├── useLearningGoalMutations.ts   # [NEW] tách mutation hooks + optimistic update
│   └── useLearningGoalForm.ts        # [NEW] RHF + Zod schema
├── pages/
│   ├── GoalEditorPage/
│   │   └── GoalEditorPage.tsx        # [REFACTOR] ~70 lines, dùng form hook
│   └── GoalListPage/
│       └── GoalListPage.tsx          # [REFACTOR] useDebounce, Dialog, Skeleton
├── types/
│   └── learning-goal.types.ts        # [REFACTOR] xóa TTSProvider/Language (import từ languages), xóa constants
├── utils/
│   └── goal.utils.ts                 # [NEW] toSlug(), parseIgnoredSkills(), normalizeVietnamese()
└── index.ts                          # [NEW] barrel export
```

---

## 4. KẾ HOẠCH THỰC HIỆN CHI TIẾT

### PHASE 0 — HOTFIX (Fix runtime crash trước) 🚨

**Step 0.1 — Cập nhật `languages/index.ts` export thêm hooks**
```typescript
// languages/index.ts
export { default as LanguageListPage } from './pages/LanguageListPage/LanguageListPage';
export { default as LanguageEditorPage } from './pages/LanguageEditorPage/LanguageEditorPage';

// Export hooks cho cross-feature use
export { useLanguages } from './hooks/useLanguages';
export { useUpdateLanguage } from './hooks/useLanguageMutations';
export type { Language, TTSProvider } from './types/language.types';
```

**Step 0.2 — Fix `LanguageConfig.tsx` import**
```typescript
// ❌ Trước (broken)
import { useLanguages, useUpdateLanguage } from '@/features/curriculum/languages/hooks/useLanguageData';
import type { TTSProvider } from '@/features/curriculum/languages/types/language.types';

// ✅ Sau
import { useLanguages, useUpdateLanguage, type TTSProvider } from '@/features/curriculum/languages';
```

---

### PHASE 1 — Foundation (Constants, Types, Utils)

**Step 1.1 — Tạo `constants/skill.constants.ts`**
- Move `DEFAULT_SKILL_WEIGHTS`, `SKILL_PRESETS` từ `types/`
- Thêm `SKILLS` array (hiện đang inline trong `SkillWeightEditor`)
- Thêm `IGNORED_SKILL_LABELS` mapping (hiện inline trong `GoalEditorPage`)

**Step 1.2 — Tạo `constants/query-keys.ts`** (Key factory pattern)
```typescript
export const LEARNING_GOAL_QUERY_KEYS = {
    all: ['learning-goals'] as const,
    lists: () => [...LEARNING_GOAL_QUERY_KEYS.all, 'list'] as const,
    list: (query: LearningGoalListQuery) => [...LEARNING_GOAL_QUERY_KEYS.lists(), query] as const,
    details: () => [...LEARNING_GOAL_QUERY_KEYS.all, 'detail'] as const,
    detail: (slug: string) => [...LEARNING_GOAL_QUERY_KEYS.details(), slug] as const,
};
```

**Step 1.3 — Refactor `types/learning-goal.types.ts`**
- Xóa `TTSProvider` (import từ `@/features/curriculum/languages`)
- Xóa `Language` interface (import từ `@/features/curriculum/languages`)
- Xóa `DEFAULT_SKILL_WEIGHTS`, `SKILL_PRESETS` (move sang `constants/`)
- Thêm `IgnoredSkill` union type (move từ `GoalEditorPage`)

**Step 1.4 — Tạo `utils/goal.utils.ts`**
- Move `normalizeVietnamese()`
- Move `parseIgnoredSkills()` (nhận `string`, trả `IgnoredSkill[]`)
- Move `toSlug()`

**Step 1.5 — Refactor `api/learning-goal.api.ts`**
- Xóa `ApiResponse<T>` local, dùng `@/types/api.ts`
- Xóa `getLanguages()` và `updateLanguageTts()` — đây là duplicate với languages API, `LanguageConfig` sẽ dùng languages hooks trực tiếp

---

### PHASE 2 — Hook Layer Refactor

**Step 2.1 — Tạo `hooks/useLearningGoals.ts`** (Query hooks)
- `useLearningGoals(query)` — thêm `staleTime: 60 * 1000`
- `useLearningGoalDetail(slug)` — thêm `staleTime: 5 * 60 * 1000`
- Dùng `LEARNING_GOAL_QUERY_KEYS` factory

**Step 2.2 — Tạo `hooks/useLearningGoalMutations.ts`** (Mutation hooks)
- Tách `useCreateLearningGoal`, `useUpdateLearningGoal`, `useDuplicateLearningGoal`
- `useToggleLearningGoalStatus` — **thêm Optimistic Update**:
```typescript
onMutate: async (slug) => {
    await queryClient.cancelQueries({ queryKey: LEARNING_GOAL_QUERY_KEYS.lists() });
    const previousLists = queryClient.getQueriesData<LearningGoalListResponse>({
        queryKey: LEARNING_GOAL_QUERY_KEYS.lists(),
    });
    queryClient.setQueriesData<LearningGoalListResponse>(
        { queryKey: LEARNING_GOAL_QUERY_KEYS.lists() },
        (old) => old ? {
            ...old,
            data: old.data.map((g) => g.slug === slug ? { ...g, isActive: !g.isActive } : g)
        } : old,
    );
    return { previousLists };
},
onError: (error, _, context) => {
    for (const [key, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(key, data);
    }
    toast.error(getApiErrorMessage(error, 'Cập nhật trạng thái thất bại'));
},
onSettled: () => queryClient.invalidateQueries({ queryKey: LEARNING_GOAL_QUERY_KEYS.lists() }),
```
- `useTestLearningGoal` — giữ nguyên
- Dùng `getApiErrorMessage` từ `@/lib/api-error.ts`

**Step 2.3 — Tạo `hooks/useLearningGoalForm.ts`** (RHF + Zod)
```typescript
export const goalFormSchema = z.object({
    slug: z.string().min(3).regex(/^[a-z0-9-]+$/, 'Chỉ dùng chữ thường, số và dấu gạch ngang'),
    title: z.string().min(3, 'Tối thiểu 3 ký tự'),
    targetAudience: z.string().optional(),
    systemPrompt: z.string().min(30, 'Prompt tối thiểu 30 ký tự'),
    ignoredSkills: z.array(z.enum(['spelling', 'punctuation', 'formality', 'pronunciation'])),
    skillWeights: z.object({
        listening: z.number().min(0).max(1),
        speaking: z.number().min(0).max(1),
        reading: z.number().min(0).max(1),
        writing: z.number().min(0).max(1),
        grammar: z.number().min(0).max(1),
        vocabulary: z.number().min(0).max(1),
    }).refine(
        (w) => Math.abs(Object.values(w).reduce((s, v) => s + v, 0) - 1) <= 0.001,
        { message: 'Tổng trọng số phải bằng 100%' }
    ),
    isActive: z.boolean(),
});
export type GoalFormValues = z.infer<typeof goalFormSchema>;
```
> Lưu ý: `skillWeights` dùng `.refine()` để validate tổng = 100% — Zod level, không cần manual check.
> `ignoredSkills` lưu dưới dạng array trong form, chỉ display dạng string trong UI.

**Step 2.4 — Xóa `hooks/useLearningGoalData.ts`**

---

### PHASE 3 — UI Component Fixes

**Step 3.1 — Tạo `components/DuplicateGoalDialog/DuplicateGoalDialog.tsx`** [NEW]
- Dùng Shadcn `<Dialog>` thay `window.prompt()`
- Form nhỏ: 2 inputs (newSlug + newTitle), validation cơ bản
- Nhận props: `isOpen`, `onClose`, `onConfirm(payload)`, `defaultSlug`, `defaultTitle`

**Step 3.2 — Refactor `components/GoalCard/GoalCard.tsx`**
- Wrap với `React.memo`
- Fix `aria-label` → `aria-label={`Toggle status for ${goal.title}`}`
- Thêm `useCallback` cho handlers

**Step 3.3 — Refactor `components/RadarSkillChart/RadarSkillChart.tsx`**
```typescript
const data = useMemo(() => [
    { skill: 'Nghe', value: Math.round(skillWeights.listening * 100) },
    // ...
], [skillWeights]);
```
- Wrap với `React.memo`

**Step 3.4 — Refactor `components/SkillWeightEditor/SkillWeightEditor.tsx`**
- Import `SKILL_PRESETS`, `SKILLS` từ `constants/skill.constants.ts`
- Thêm `aria-label` và `aria-valuemin/max/now` trên range inputs

**Step 3.5 — Refactor `components/AISandbox/AISandbox.tsx`**
- Thay `<label>` bằng `<Label>` Shadcn
- Thêm error display state khi test thất bại
- Thêm `aria-label` trên textareas

**Step 3.6 — Refactor `components/LanguageConfig/LanguageConfig.tsx`** (đã fix ở Phase 0)
- Thay `<label>` bằng `<Label>` Shadcn
- Thêm `aria-label`

---

### PHASE 4 — Page Refactor

**Step 4.1 — Refactor `pages/GoalEditorPage/GoalEditorPage.tsx`**
- Loại bỏ tất cả `useState` + `useEffect` form logic
- Dùng `useGoalForm({ slug, goalDetail })`
- Dùng Shadcn `<Form>`, `<FormField>`, `<FormLabel>`, `<FormMessage>`
- `ignoredSkills` — field type `string[]` trong form, hiển thị dạng chip hoặc multi-select đơn giản
- Skeleton dùng `<Skeleton>` component
- Target: ≤ 80 lines

**Step 4.2 — Refactor `pages/GoalListPage/GoalListPage.tsx`**
- Thêm `useDebounce(search, 300)`
- Thay `window.prompt` bằng `<DuplicateGoalDialog>` state
- Thay `animate-pulse div` bằng `<Skeleton>` rows
- Thêm `aria-label` trên input và button

---

### PHASE 5 — Final Polish

**Step 5.1 — Tạo `index.ts` barrel export**
```typescript
export { default as GoalListPage } from './pages/GoalListPage/GoalListPage';
export { default as GoalEditorPage } from './pages/GoalEditorPage/GoalEditorPage';
```

**Step 5.2 — Cleanup**
- Kiểm tra không còn import từ `useLearningGoalData.ts`
- Verify TypeScript clean compile

---

## 5. PRIORITY MATRIX

```
HIGH IMPACT + LOW EFFORT            │  HIGH IMPACT + HIGH EFFORT
────────────────────────────────────┼─────────────────────────────────
Phase 0: Fix runtime crash (C1/C2)  │  Phase 2.3: useLearningGoalForm
Phase 1: Constants/Types split      │  Phase 3.1: DuplicateGoalDialog
Phase 2.4: Xóa useLearningGoalData  │  Phase 4.1: EditorPage refactor
Phase 4.2: useDebounce + Skeleton   │
────────────────────────────────────┼─────────────────────────────────
LOW IMPACT + LOW EFFORT             │  LOW IMPACT + HIGH EFFORT
────────────────────────────────────┼─────────────────────────────────
Phase 3.3: RadarSkillChart useMemo  │  (Không có)
Phase 3.2: GoalCard React.memo      │
Phase 5.1: index.ts barrel          │
```

---

## 6. EXECUTION ORDER

```
Phase 0 (Hotfix - Runtime Crash)
    → Phase 1 (Foundation)
        → Phase 2 (Hooks)
            → Phase 3 (Components)
                → Phase 4 (Pages)
                    → Phase 5 (Polish)
```

> **Dependency:** Phase 3 & 4 phụ thuộc Phase 2 (`useLearningGoalForm` phải tồn tại trước).
> **Phase 0 phải chạy ngay** — app đang crash tại LanguageConfig.

---

## 7. DEFINITION OF DONE

- [ ] `LanguageConfig.tsx` không còn import từ internal paths của `languages` feature
- [ ] `window.prompt` được thay bằng `<DuplicateGoalDialog>`
- [ ] Không còn `useState` quản lý form data trong `GoalEditorPage`
- [ ] Zod schema validate `skillWeights` tổng = 100%
- [ ] `useDebounce` áp dụng cho search
- [ ] `LEARNING_GOAL_QUERY_KEYS` theo key factory pattern
- [ ] `useToggleLearningGoalStatus` có optimistic update
- [ ] `data` array trong `RadarSkillChart` được `useMemo`
- [ ] Không còn constants trong file `.types.ts`
- [ ] `ApiResponse<T>` dùng từ `@/types/api.ts`
- [ ] `index.ts` barrel export tồn tại
- [ ] `GoalEditorPage` ≤ 80 lines
- [ ] TypeScript compile clean — 0 errors
