# Audit Round 3: `placement-test` Feature

> **Scope**: `client/src/features/dashboard/placement-test/`
> **Auditor Role**: Senior Technical Architect (Unilish)
> **Date**: 2026-03-16 (Round 3 — Final Verification)
> **Baseline**: `language-selection` (8.5), `goal-selection` (8.8)

---

## 1. Đối Chiếu Round 2 vs Thực Tế

| # | Issue Round 2 | Trạng thái |
|---|---|---|
| R2-1 | `mutation` object (unstable) trong `useEffect` deps | ❌ **Chưa fix** — `[placementTestId, mutation]` vẫn còn |
| R2-2 | 401 branch trong `useEffect` redundant | ❌ **Chưa fix** — `useEffect` lines 86–100 vẫn còn nguyên |
| R2-3 | `as unknown as` trong test helper cần comment | ❌ **Chưa fix** — line 22 chưa có comment |
| R2-4 | `right-panel` native `<button>` cần comment | ❌ **Chưa fix** — chưa có exception comment |
| R2-5 | Component 204 dòng — optional extract `renderError` | ❌ **Chưa fix** — optional, 204 dòng |
| R2-6 | **Data loss bug** — `useEffect` dep `[attempt]` → `[attempt?.attemptId]` | ❌ **Chưa fix** — line 28 vẫn `[attempt]` |
| R2-7 | `autosaveErrorMessage` trong deps — nên dùng ref pattern | ❌ **Chưa fix** — line 79 vẫn có `autosaveErrorMessage` |
| R2-8 | `as AxiosError<>` unsafe cast — nên dùng type guard | ❌ **Chưa fix** — line 35, 44 vẫn còn |
| R2-9 | `DEFAULT_LANGUAGE` ở global config | ❌ **Chưa fix** — low priority, trong scope |
| R2-10 | `use-answer-state.ts` chưa có test | ❌ **Chưa fix** — chưa có test file |

> **Nhận xét**: Cả 10 items từ Round 2 đều chưa được xử lý. Codebase giữ nguyên trạng thái Round 2.

---

## 2. Phân Tích Sâu Hơn Round 3

### Deep Review Các Files Chưa Đổi

---

### 🔴 [R3-CRITICAL-1] Data Loss Bug Xác Nhận — `use-answer-state.ts:28`

**File**: `hooks/use-answer-state.ts` — line 14–28

```typescript
useEffect(() => {
    if (!attempt) return;

    const answerMap: Record<string, LocalAnswerState> = {};
    for (const item of attempt.answerSheet) {
        answerMap[item.questionId] = { ... };
    }

    setLocalAnswerMap(answerMap);
}, [attempt]);  // ← CRITICAL: depend vào toàn bộ object
```

**Phân tích cơ chế bug**:

1. User chọn đáp án `q1 = 'A'` → `localAnswerMap = { q1: {selectedOption: 'A'} }`
2. `queueSave` gọi debounce 800ms → chưa flush
3. Trong lúc chờ 800ms, `createAttemptMutation` state thay đổi (ví dụ status `idle → success`) → `mutation` object thay đổi reference
4. `attempt = createAttemptMutation.data` — `data` vẫn là cùng object nhưng TanStack Query có thể tạo reference mới khi mutation state thay đổi
5. `useEffect` re-run với `attempt` mới → `setLocalAnswerMap(serverState)` → **xóa `q1 = 'A'`**
6. User thấy câu trả lời bị reset

**Trường hợp thực tế dễ trigger nhất**: Khi `saveAnswersMutation` thành công (sau autosave lần đầu), mutation state update → chain cascade → `attempt` object có thể bị re-reference trong một số version TanStack Query.

**Fix chính xác**:
```typescript
useEffect(() => {
    if (!attempt) return;

    const answerMap = Object.fromEntries(
        attempt.answerSheet.map((item) => [
            item.questionId,
            { selectedOption: item.selectedOption ?? null, flagged: item.flagged },
        ])
    );
    setLocalAnswerMap(answerMap);
}, [attempt?.attemptId]); // ← chỉ init khi attemptId thay đổi (session mới)
```

**Priority**: 🔴 **P0 — Production bug, silent data loss**

---

### 🟠 [R3-HIGH-2] `mutation` object trong `useEffect` dependency

**File**: `hooks/use-create-placement-attempt-mutation.ts` — line 16–27

```typescript
const mutation = useMutation<RuntimeAttempt, Error, string>({ ... });

useEffect(() => {
    if (!placementTestId) return;
    if (lastTriggeredPlacementTestIdRef.current === placementTestId) return;

    lastTriggeredPlacementTestIdRef.current = placementTestId;
    mutation.mutate(placementTestId);  // ← mutation object trong deps
}, [placementTestId, mutation]);       // ← ❌ mutation thay đổi mỗi render
```

**Phân tích**:
- `mutation` object là không stable — mỗi render trả về object mới (dù `mutate` function stable)
- `useRef` guard (`lastTriggeredPlacementTestIdRef`) đã ngăn duplicate POST, nhưng `useEffect` vẫn re-run không cần thiết mỗi khi mutation state đổi (pending, success, error)
- Mỗi re-run thừa sẽ evaluate: `if (lastTriggeredRef === placementTestId) return` → safe nhưng overhead

**Fix đúng** — sử dụng `mutate` function (stable ref) từ destructure:
```typescript
const mutation = useMutation<RuntimeAttempt, Error, string>({ ... });
const { mutate } = mutation; // stable function từ TanStack Query docs

useEffect(() => {
    if (!placementTestId) return;
    if (lastTriggeredPlacementTestIdRef.current === placementTestId) return;

    lastTriggeredPlacementTestIdRef.current = placementTestId;
    mutate(placementTestId);
}, [placementTestId, mutate]); // ← mutate là stable, deps hợp lệ
```

**Priority**: 🟠 P1

---

### 🟠 [R3-HIGH-3] `useEffect` 401 branch — redundant với `<Navigate>` guard

**File**: `pages/listening-reading/listening-reading.tsx` — line 86–100

```typescript
useEffect(() => {
    const status = (activeError as AxiosError<ApiErrorResponse> | null)?.response?.status
        ?? (attemptError as AxiosError<ApiErrorResponse> | null)?.response?.status;

    if (status === 401) {
        toast.error(PT_MESSAGES.sessionExpired);  // ← toast + navigate trong effect
        logout();
        navigate(PATHS.AUTH.LOGIN, { replace: true });
        return;
    }

    if (status === 404) {
        toast.error(PT_MESSAGES.noActiveTest);
    }
}, [activeError, attemptError, logout, navigate]);
```

**Line 136** đã có `<Navigate>` guard cho `!isAuthenticated`:
```tsx
if (!isAuthenticated) {
    return <Navigate to={PATHS.AUTH.LOGIN} replace />;
}
```

**Vấn đề**: 401 error từ API → `logout()` sẽ set `isAuthenticated = false` → `<Navigate>` guard ở line 136 sẽ handle redirect. `useEffect` 401 branch do đó là redundant — sẽ navigate hai lần (một lần imperative, một lần render guard).

**Thêm vào đó**: `[logout, navigate]` trong deps list là 2 stable functions nhưng không cần thiết vì 401 branch nên được remove.

**Fix**:
```typescript
useEffect(() => {
    // 401 is handled by the <Navigate> render guard (line 136) after logout().
    const status = (activeError as AxiosError<ApiErrorResponse> | null)?.response?.status
        ?? (attemptError as AxiosError<ApiErrorResponse> | null)?.response?.status;

    if (status === 401) {
        logout(); // Trigger isAuthenticated → false, <Navigate> guard handles redirect.
        return;
    }

    if (status === 404) {
        toast.error(PT_MESSAGES.noActiveTest);
    }
}, [activeError, attemptError, logout]);
// navigate removed — no longer needed in this effect
```

**Priority**: 🟠 P1

---

### 🟠 [R3-HIGH-4] `autosaveErrorMessage` string trong `flushPendingChanges` deps — stale closure risk

**File**: `hooks/use-autosave.ts` — line 22–79

```typescript
const flushPendingChanges = useCallback(async (allowRetry = true) => {
    ...
    toast.error(autosaveErrorMessage); // ← closed over from params
    ...
}, [attemptId, autosaveErrorMessage, saveAnswersMutation]); // ← string trong deps
```

**Phân tích**:
- `autosaveErrorMessage` là string constant (`PT_MESSAGES.autosaveError`) — value không đổi trong runtime
- Tuy nhiên nếu prop thay đổi (future-proofing), `flushPendingChanges` sẽ recreate → `queueSave` recreate → gây re-render cascade trong components phụ thuộc
- Thêm vào: `saveAnswersMutation` object (không stable) trong deps → `flushPendingChanges` recreate mỗi khi mutation state thay đổi → `queueSave` recreate → `updateAnswerState` và handlers trong `use-answer-state` cũng recreate

**Đây là root cause quan trọng**: `saveAnswersMutation` là object không stable → cascade recreation chain: `flushPendingChanges` → `queueSave` → `updateAnswerState` → `handleAnswer`/`handleFlag` → re-renders không cần thiết trong `LeftPanel`.

**Fix pattern — ref cho cả message và mutation**:
```typescript
const saveAnswersMutationRef = useRef(saveAnswersMutation);
useEffect(() => {
    saveAnswersMutationRef.current = saveAnswersMutation;
});

const autosaveErrorMessageRef = useRef(autosaveErrorMessage);
useEffect(() => {
    autosaveErrorMessageRef.current = autosaveErrorMessage;
});

const flushPendingChanges = useCallback(async (allowRetry = true) => {
    ...
    await saveAnswersMutationRef.current.mutateAsync({ ... });
    ...
    toast.error(autosaveErrorMessageRef.current);
    ...
}, [attemptId]); // ← deps tối giản, stable function
```

**Priority**: 🟠 P1 — Performance issue, re-render cascade

---

### 🟡 [R3-MEDIUM-5] `get-active-placement-test.ts` — `as AxiosError<>` cast cần type guard

**File**: `api/get-active-placement-test.ts` — line 35, 44

```typescript
const axiosError = error as AxiosError<ApiErrorResponse>;
...
const fallbackAxiosError = fallbackError as AxiosError<ApiErrorResponse>;
```

**Context**: `catch (error: unknown)` trong TypeScript không có cách nào khác để access `.response?.status` nếu không cast. Tuy nhiên `error instanceof AxiosError` cho phép type-safe narrowing:

```typescript
import { AxiosError } from 'axios';

if (error instanceof AxiosError) {
    lastError = error as AxiosError<ApiErrorResponse>;
    if (error.response?.status === 404) { ... }
    if (error.response?.status !== 404) { throw error; }
} else {
    throw error; // Re-throw non-Axios errors immediately
}
```

**Priority**: 🟡 P2

---

### 🟡 [R3-MEDIUM-6] `right-panel.tsx` — Native `<button>` không có exception comment

**File**: `components/listening-reading/right-panel.tsx` — line 54–63

```tsx
<button
    key={item.questionId}
    type="button"
    className={classes.join(' ')}
    aria-label={`${p.label} câu ${item.number}`}
>
    {item.number}
</button>
```

Shared `Button` component không support dynamic className injection pattern này (multi-state: answered/flagged/active). Native `<button>` là exception hợp lệ nhưng không được document.

**Fix**: Thêm comment 1 dòng:
```tsx
{/* Native <button>: question-box requires dynamic multi-state className injection
    not supported by the shared Button component API. */}
<button ...>
```

**Priority**: 🟡 P2

---

### 🟡 [R3-MEDIUM-7] `use-autosave.test.ts` — `as unknown as` trong test helper không có comment

**File**: `hooks/use-autosave.test.ts` — line 19–23

```typescript
const createMutationResult = (
    mutateAsync: (payload: SavePlacementAnswersPayload) => Promise<SavePlacementAnswersResult>,
): UseMutationResult<SavePlacementAnswersResult, Error, SavePlacementAnswersPayload> => {
    return {
        mutateAsync,
    } as unknown as UseMutationResult<...>;  // ← intentional partial mock, không có comment
};
```

**Fix**:
```typescript
// Minimal partial mock: useAutosave only calls `mutateAsync`; other fields are irrelevant.
return { mutateAsync } as unknown as UseMutationResult<...>;
```

**Priority**: 🟡 P2

---

### 🟡 [R3-MEDIUM-8] `listening-reading.tsx` — Error JSX không có component riêng

**File**: `pages/listening-reading/listening-reading.tsx` — line 144–157

```tsx
if (isActiveError || isAttemptError || !attempt) {
    const status = ...;

    if (status === 404) {
        return <div className={styles.container}>{PT_MESSAGES.notFoundView}</div>;
    }
    if (status === 401) {
        return <div className={styles.container}>{PT_MESSAGES.sessionExpiredView}</div>;
    }
    return <div className={styles.container}>{PT_MESSAGES.loadErrorView}</div>;
}
```

Pattern lặp `<div className={styles.container}>...</div>`. Có thể extract inline helper:

```tsx
const ErrorView = ({ message }: { message: string }) => (
    <div className={styles.container} role="alert">{message}</div>
);

// Sử dụng:
if (status === 404) return <ErrorView message={PT_MESSAGES.notFoundView} />;
```

**Note**: `role="alert"` còn thiếu — accessibility issue khi hiển thị error.

**Priority**: 🟡 P2

---

### 🟢 [R3-LOW-9] `use-answer-state.ts` — Thiếu unit test

Đây là hook quan trọng nhất trong feature (quản lý state đáp án), nhưng không có test file. Cần cover:
- Initial hydration từ `attempt.answerSheet`
- `handleAnswer` — blocked when `isSubmitting`
- `handleFlag` toggle
- `applyQuestionStates` — generic type narrowing
- `buildQuestionStatuses` — answered/flagged/unanswered states

**Priority**: 🟢 P3

---

### 🟢 [R3-LOW-10] `constants/placement-test.constants.ts` — `DEFAULT_LANGUAGE = 'en'` scope

**File**: `constants/placement-test.constants.ts` — line 18

```typescript
export const DEFAULT_LANGUAGE = 'en';
```

App-level constant (không chỉ placement-test). Nên là `SUPPORTED_LANGUAGES.default` trong `config/constants.ts`. **Low priority** — không block production.

**Priority**: 🟢 P3

---

## 3. Tổng Kết Round 3

### Score Assessment

```
Round 1: 4.5/10  (baseline — nhiều critical issues)
Round 2: 8.2/10  (sau refactor lớn — 19 critical/high fixed)
Round 3: 8.2/10  (không đổi — 10 issues Round 2 chưa được xử lý)
```

### Priority Matrix — Tất Cả Issues Còn Tồn Tại

| Priority | ID | Issue | File | Effort |
|:---:|:---|:---|:---|:---:|
| 🔴 **P0** | R3-CRITICAL-1 | **Data loss bug**: `[attempt]` → `[attempt?.attemptId]` trong `useEffect` | `use-answer-state.ts:28` | XS |
| 🟠 P1 | R3-HIGH-2 | `mutation` object (unstable ref) trong `useEffect` deps | `use-create-placement-attempt-mutation.ts:27` | XS |
| 🟠 P1 | R3-HIGH-3 | 401 redundant branch trong `useEffect` + `navigate` dep thừa | `listening-reading.tsx:86` | XS |
| 🟠 P1 | R3-HIGH-4 | `saveAnswersMutation` + `autosaveErrorMessage` → ref pattern để tránh re-render cascade | `use-autosave.ts:79` | S |
| 🟡 P2 | R3-MEDIUM-5 | `instanceof AxiosError` type guard thay vì `as AxiosError<>` cast | `get-active-placement-test.ts:35,44` | S |
| 🟡 P2 | R3-MEDIUM-6 | Comment cho native `<button>` exception | `right-panel.tsx:54` | XS |
| 🟡 P2 | R3-MEDIUM-7 | Comment cho `as unknown as` trong test helper | `use-autosave.test.ts:22` | XS |
| 🟡 P2 | R3-MEDIUM-8 | Extract `ErrorView` component + thêm `role="alert"` | `listening-reading.tsx:144` | XS |
| 🟢 P3 | R3-LOW-9 | Unit tests cho `use-answer-state.ts` | `hooks/` | M |
| 🟢 P3 | R3-LOW-10 | `DEFAULT_LANGUAGE` → global config | `constants/` | XS |

---

## 4. Fix Instructions Chi Tiết (P0 + P1)

### Fix R3-CRITICAL-1 — `use-answer-state.ts`

```typescript
// BEFORE:
}, [attempt]);

// AFTER:
}, [attempt?.attemptId]);
// Lý do: chỉ init answerMap khi session ID thay đổi (attempt mới).
// Phụ thuộc vào toàn bộ `attempt` object sẽ reset localAnswerMap
// mỗi khi mutation state thay đổi (vd sau autosave), gây mất đáp án user đang nhập.
```

### Fix R3-HIGH-2 — `use-create-placement-attempt-mutation.ts`

```typescript
// BEFORE:
const mutation = useMutation<RuntimeAttempt, Error, string>({ ... });
useEffect(() => {
    ...
    mutation.mutate(placementTestId);
}, [placementTestId, mutation]);

// AFTER:
const mutation = useMutation<RuntimeAttempt, Error, string>({ ... });
const { mutate } = mutation; // stable ref theo TanStack Query docs
useEffect(() => {
    ...
    mutate(placementTestId);
}, [placementTestId, mutate]);
```

### Fix R3-HIGH-3 — `listening-reading.tsx`

```typescript
// BEFORE:
useEffect(() => {
    ...
    if (status === 401) {
        toast.error(PT_MESSAGES.sessionExpired);
        logout();
        navigate(PATHS.AUTH.LOGIN, { replace: true });
        return;
    }
    ...
}, [activeError, attemptError, logout, navigate]);

// AFTER:
useEffect(() => {
    // 401: logout() will set isAuthenticated=false → <Navigate> render guard handles redirect.
    const status = ...;
    if (status === 401) {
        logout();
        return;
    }
    if (status === 404) {
        toast.error(PT_MESSAGES.noActiveTest);
    }
}, [activeError, attemptError, logout]);
// navigate removed from deps
```

### Fix R3-HIGH-4 — `use-autosave.ts`

```typescript
// Thêm mutation ref và message ref để tránh stale closure + re-render cascade:
const saveAnswersMutationRef = useRef(saveAnswersMutation);
saveAnswersMutationRef.current = saveAnswersMutation; // update mỗi render (không cần useEffect)

const autosaveErrorMessageRef = useRef(autosaveErrorMessage);
autosaveErrorMessageRef.current = autosaveErrorMessage;

const flushPendingChanges = useCallback(async (allowRetry = true) => {
    ...
    await saveAnswersMutationRef.current.mutateAsync({ ... });
    ...
    toast.error(autosaveErrorMessageRef.current);
    ...
}, [attemptId]); // ← chỉ còn attemptId, stable function
```

---

## 5. So Sánh Final — Tất Cả 4 Features

| Tiêu chí | `language-selection` | `goal-selection` | `level-selection` | `placement-test` |
|:---|:---:|:---:|:---:|:---:|
| Score | 8.5/10 ✅ | 8.8/10 ✅ | 3/10 ❌ pending | 8.2/10 ⚠️ |
| `index.ts` barrel | ✅ | ✅ | ❌ | ✅ |
| Naming kebab-case | ✅ | ✅ | ❌ | ✅ |
| Router import chuẩn | ✅ | ✅ | ❌ | ✅ |
| `ApiEnvelope` global | ✅ | ✅ | - | ✅ |
| `as unknown as` API | ✅ | ✅ | - | ✅ |
| String dấu tiếng Việt | ✅ | ✅ | ❌ | ✅ |
| CSS Variables | ✅ | ✅ | ❌ | ✅ |
| `constants/` | ✅ | ✅ | ❌ | ✅ |
| God Component | ✅ | ✅ | ✅ | ⚠️ 204 dòng |
| Custom hooks SRP | ✅ | ✅ | ✅ | ✅ |
| Unit tests | ✅ | ✅ | ❌ | ⚠️ Thiếu 1 hook |
| `<Navigate>` guard | ✅ | ✅ | ❌ | ✅ |
| `useCallback` đầy đủ | ✅ | ✅ | ❌ | ✅ |
| Data loss bug | - | - | - | ❌ **P0 active** |

---

*Plan updated by Senior Technical Architect — Unilish*
*Round 3: Confirmed 10 pending issues unchanged. P0 data loss bug flagged for immediate fix.*
*Level-selection refactor still pending — 12 items including 4 P0 critical.*
