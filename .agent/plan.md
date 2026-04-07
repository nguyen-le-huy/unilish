# Kế Hoạch Triển Khai: Smart Placement Test — UniLish

> **Mục tiêu:** Triển khai đầy đủ luồng bài kiểm tra đầu vào (Listening & Reading → Writing → Speaking → Result) từ trạng thái hiện tại (một phần là UI mock, một phần có API thật) thành một hệ thống hoàn chỉnh, tích hợp Backend + AI scoring.

---

## Tổng Quan Luồng Bài Thi

```
[Intro Modal]
    │
    ▼
[Phase 1 – Listening & Reading]  ─── 60 phút, MCQ, Auto-save, API thật (đã có)
    │  submit → server score L&R
    ▼
[Phase 2 – Writing]              ─── 30 phút, Free-text, đề lấy từ DB, gpt-5.4-mini-2026-03-17 chấm
    │  submit → AI score Writing
    ▼
[Phase 3 – Speaking]             ─── ~15 phút, Realtime AI Examiner
    │  submit → Azure STT + gpt-5.4-mini-2026-03-17 score
    ▼
[Result Dashboard]               ─── Spider chart, CEFR, Skill breakdown, AI feedback
```

---

## Đánh Giá Hiện Trạng (Current State Assessment)

| Module | Frontend | Backend/API |
|---|---|---|
| **Listening & Reading** | ✅ Hoàn chỉnh (autosave, timer, MCQ, submit) | ✅ API tồn tại (`/placement-tests/runtime/active`, `/attempts`) |
| **Writing** | ⚠️ UI shell (hardcode đề, không timer thật, không submit API) | ❌ Chưa có |
| **Speaking** | ⚠️ UI shell (hardcode câu hỏi, không STT/TTS, không score) | ❌ Chưa có |
| **Result** | ⚠️ UI shell (hardcode data, không fetch API) | ❌ Chưa có |
| **Navigation Flow** | ⚠️ Chưa có luồng liên kết L&R → Writing → Speaking → Result | ❌ Chưa có |
| **Zustand Store** | ⚠️ `onboarding.store.ts` có nhưng chưa lưu attemptId/sessionId giữa các module | — |

---

## Phase 1: Foundation & Navigation Flow *(Ưu tiên cao nhất)*

**Mục tiêu:** Kết nối luồng điều hướng giữa 3 module + tạo Placement Session Store.

### 1.1 — [NEW] `placement-test.store.ts` (Zustand)

**File:** `client/src/stores/placement-test.store.ts`

```typescript
interface PlacementTestSessionState {
  // — IDs —
  sessionId: string | null;            // PlacementSession ID (backend tạo sau LR submit)
  attemptId: string | null;            // L&R PlacementAttempt ID
  writingAttemptId: string | null;
  speakingAttemptId: string | null;
  currentModule: 'lr' | 'writing' | 'speaking' | 'result' | null;

  // — Scores —
  lrRawScore: number | null;           // % đúng L&R (adaptive writing level)

  // — Test Config (cached từ Step 0, dùng lại ở Writing & Speaking) —
  placementTestId: string | null;
  essayModule: IModuleEssay | null;    // topicsByLevel, wordLimits, promptImageUrl
  speakingModule: IModuleSpeaking | null; // parts.{part1,part2,part3}, config

  // — Actions —
  setTestConfig: (config: {
    placementTestId: string;
    essayModule: IModuleEssay;
    speakingModule: IModuleSpeaking;
  }) => void;
  setSessionId: (id: string) => void;
  setAttemptId: (id: string) => void;
  setLrRawScore: (score: number) => void;
  setCurrentModule: (module: 'lr' | 'writing' | 'speaking' | 'result') => void;
  setWritingAttemptId: (id: string) => void;
  setSpeakingAttemptId: (id: string) => void;
  clear: () => void;
}
```

**Storage:** `sessionStorage` (persist middleware). Đảm bảo không mất state khi refresh tab.

---

### 1.2 — [MODIFY] Router + Routes

**File:** `client/src/app/router.tsx`

Thêm/kiểm tra các routes:
- `/dashboard/placement-test/lr` → `ListeningReadingPage`
- `/dashboard/placement-test/writing` → `WritingPage`
- `/dashboard/placement-test/speaking` → `SpeakingPage`
- `/dashboard/placement-test/result` → `ResultPage`

Bọc bằng `ProtectedRoute`.

---

### 1.3 — [MODIFY] ListeningReading Page — Navigation sau submit

**File:** `client/src/features/dashboard/placement-test/pages/listening-reading/listening-reading.tsx`

Sau khi submit thành công, `SubmissionSuccessCard` → `onContinue` phải:
1. Lưu `lrScore + sessionId` vào `placement-test.store`
2. Navigate tới `/dashboard/placement-test/writing`

*(Hiện tại đang navigate về `PATHS.DASHBOARD.HOME` — sai)*

---

## Phase 2: Writing Module — Full Integration

**Mục tiêu:** Hoàn thiện trang Writing với đề thật, timer, word count, submit lên API, AI chấm điểm.

### 2.1 — [NEW] Writing API Endpoints (Backend — Server)

**Responsibility:** Backend team / hoặc tạo mock trả về đúng shape.

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/placement-sessions/:sessionId/writing/start` | Nhận `lrScore`, xác định level (low/mid/high), **pick random 1 topic từ `essayModule.topicsByLevel[level]`** (không query DB thêm), tạo WritingAttempt, trả về `{ writingAttemptId, prompt, promptImageUrl, timeLimitMinutes, wordLimit, level }` |
| `POST` | `/placement-sessions/:sessionId/writing/submit` | Submit essay text, trigger BullMQ job chấm AI |
| `GET` | `/placement-sessions/:sessionId/writing/result` | Poll kết quả chấm (status: `pending/done`) |

**Adaptive Prompt Logic (Backend — no LLM, no extra DB query):**
```
// essayModule đã có sẵn trong PTStore từ Step 0 (GET active test)
lrScore < 45%  → level: "low"  → random(essayModule.topicsByLevel.low)
lrScore 45–75% → level: "mid"  → random(essayModule.topicsByLevel.mid)
lrScore > 75%  → level: "high" → random(essayModule.topicsByLevel.high)
// promptImageUrl lấy từ essayModule.promptImageUrl
// wordLimit lấy từ essayModule.wordLimits[level]
// aiModel (grading) lấy từ essayModule.aiModel
```

> ⚠️ **Đề bài được nhúng sẵn trong `PlacementTest.modules[essay].topicsByLevel`.** Server chỉ pick random + tạo `WritingAttempt`, không query collection nào khác, không gọi LLM.

**AI Grading Payload (aiModel từ essayModule → server):**
```json
{
  "criteria": ["TR", "CC", "LR", "GRA"],
  "essay": "<user_text>",
  "prompt": "<question_prompt>",
  "returnFormat": "json"
}
```

---

### 2.2 — [NEW] Writing API Client

**File:** `client/src/features/dashboard/placement-test/api/start-writing-attempt.ts`
**File:** `client/src/features/dashboard/placement-test/api/submit-writing-attempt.ts`
**File:** `client/src/features/dashboard/placement-test/api/get-writing-result.ts`

---

### 2.3 — [NEW] Writing Hooks

**File:** `client/src/features/dashboard/placement-test/hooks/use-writing-session.ts`

```typescript
// Tự động fetch prompt khi trang Writing load
// Expose: { prompt, timeLimitMinutes, isLoading }
```

**File:** `client/src/features/dashboard/placement-test/hooks/use-writing-timer.ts`
- Đếm ngược từ `timeLimitMinutes * 60`
- Trigger auto-submit khi về 0
- Persist remaining time vào ref để tránh re-render

**File:** `client/src/features/dashboard/placement-test/hooks/use-writing-submit.ts`
- Submit essay
- Poll `/writing/result` mỗi 5s cho đến `status === 'done'`
- Lưu `writingAttemptId` vào store

---

### 2.4 — [MODIFY] WritingPage — Rewrite

**File:** `client/src/features/dashboard/placement-test/pages/Writting/Writting.tsx`

**Các thay đổi:**
1. GET active test tại Step 0 → lưu `essayModule`, `speakingModule` vào PTStore
2. Fetch prompt từ API `/writing/start` (thay hardcode), dùng `essayModule` từ PTStore
3. Timer countdown thật (dùng `use-writing-timer`)
4. Word count real-time (split by whitespace)
5. Minimum `wordLimit` validation trước khi enable nút “Nộp bài”
6. Submit flow: gọi API → show grading indicator → poll result → show `SubmissionSuccessCard`
7. `onContinue` → navigate `/dashboard/placement-test/speaking`

---

## Phase 3: Speaking Module — AI Integration

**Mục tiêu:** Kết nối luồng Speaking với AI Examiner (TTS) + Azure STT + scoring thật.

### 3.1 — [NEW] Speaking API Endpoints (Backend)

| Method | Path | Mô tả |
|---|---|---|
| `POST` | `/placement-sessions/:sessionId/speaking/start` | Đọc `speakingModule.parts` từ PlacementTest, **random select** questions trong `questionsRange`, tạo SpeakingAttempt với câu hỏi đã chọn + config (ttsModel, ttsVoice, gradingModel, silenceThreshold). **Không gọi LLM để sinh câu hỏi.** |
| `GET` | `/speaking/examiner-voice` | Nhận `{ audioKey?, text }`. Nếu `audioKey` tồn tại → serve file từ R2 (pre-recorded). Nếu không → TTS synthesis on-the-fly rồi trả stream. |
| `POST` | `/placement-sessions/:sessionId/speaking/audio-chunk` | Upload audio blob từng đoạn → Azure STT xử lý realtime |
| `POST` | `/placement-sessions/:sessionId/speaking/submit` | Kết thúc phỏng vấn, trigger BullMQ job scoring bằng `gradingModel` |
| `GET` | `/placement-sessions/:sessionId/speaking/result` | Poll kết quả (Fluency, Lexical, GRA, Pronunciation + transcript) |

---

### 3.2 — [NEW] Audio Recording Hook

**File:** `client/src/features/dashboard/placement-test/hooks/use-audio-recorder.ts`

```typescript
// Dùng MediaStream API
// - startRecording(): void
// - stopRecording(): Blob
// - uploadChunk(blob): void  // stream lên server mỗi N giây
// - isRecording: boolean
// - permissionState: 'granted' | 'denied' | 'prompt'
```

---

### 3.3 — [NEW] AI Examiner TTS Hook

**File:** `client/src/features/dashboard/placement-test/hooks/use-examiner-tts.ts`

```typescript
// Nhận text từ AI, fetch audio stream từ server TTS endpoint
// Phát audio qua HTMLAudioElement
// - speak(text: string): Promise<void>
// - isSpeaking: boolean
```

---

### 3.4 — [MODIFY] TestMain Component — Connect to API

**File:** `client/src/features/dashboard/placement-test/components/speaking/test-main/TestMain.tsx`

**Hiện tại:** Câu hỏi hardcode, không có audio, không ghi âm.

**Cần thêm:**
1. Nhận `questionData` từ props (fetch từ API) thay vì hardcode
2. Tích hợp `use-audio-recorder` → ghi âm khi user đang nói
3. Tích hợp `use-examiner-tts` → phát câu hỏi từ AI Examiner qua giọng nói
4. Upload audio chunk sau mỗi câu trả lời
5. Khi Part 3 kết thúc → gọi `submit speaking` API

---

### 3.5 — [MODIFY] TestMic Component

**File:** `client/src/features/dashboard/placement-test/components/speaking/test-mic/TestMic.tsx`

Thêm permission check thật:
```typescript
navigator.mediaDevices.getUserMedia({ audio: true })
// Nếu denied → hiển thị hướng dẫn enable mic
// Nếu granted → cho phép vào test
```

---

### 3.6 — [MODIFY] SpeakingPage — Navigation

**File:** `client/src/features/dashboard/placement-test/pages/Speaking/Speaking.tsx`

`handleContinueAfterSubmit` → navigate `/dashboard/placement-test/result`. Lỳu ý: navigate trước khi speaking grading xong — Result page sẽ tự poll.

---

## Phase 4: Result Dashboard — Full Data Binding

**Mục tiêu:** Thay toàn bộ hardcode bằng data thật từ API, vẽ Radar Chart, tính CEFR.

### 4.1 — [NEW] Result API Endpoint (Backend)

| Method | Path | Mô tả |
|---|---|---|
| `GET` | `/placement-sessions/:sessionId/result` | Trả về kết quả tổng hợp 4 kỹ năng + CEFR + AI feedback |

**Response shape:**
```json
{
  "sessionId": "...",
  "cefr": "B2",
  "cefrDescription": "Upper-Intermediate",
  "scores": {
    "listening": { "rawPercent": 72, "cefr": "B2" },
    "reading":   { "rawPercent": 68, "cefr": "B1" },
    "writing":   { "band": 5.5, "cefr": "B1", "criteria": { "TR": 5, "CC": 6, "LR": 5.5, "GRA": 5.5 } },
    "speaking":  { "band": 6.0, "cefr": "B2", "criteria": { "fluency": 6, "lexical": 6, "grammar": 5.5, "pronunciation": 6.5 } }
  },
  "feedback": {
    "writing": { "strengths": [...], "errors": [...], "tips": [...] },
    "speaking": { "strengths": [...], "errors": [...], "tips": [...], "transcriptHighlights": [...] }
  }
}
```

---

### 4.2 — [NEW] Result API Client + Hook

**File:** `client/src/features/dashboard/placement-test/api/get-placement-result.ts`

**File:** `client/src/features/dashboard/placement-test/hooks/use-placement-result-query.ts`
- Poll mỗi 5s nếu `status !== 'ready'` (speaking/writing vẫn đang chấm)
- Stop polling khi `status === 'ready'`

---

### 4.3 — [NEW] RadarChart Component

**File:** `client/src/features/dashboard/placement-test/components/result/RadarChart/RadarChart.tsx`

- Dùng Canvas API hoặc `recharts` (nếu đã có dependency)
- 4 trục: Listening, Reading, Writing, Speaking
- Scale theo CEFR level (A1=1 ... C2=6)

---

### 4.4 — [MODIFY] ResultPage — Full Rewrite

**File:** `client/src/features/dashboard/placement-test/pages/Result/Result.tsx`

**Các thay đổi:**
1. Fetch `sessionId` từ `placement-test.store`
2. Poll `use-placement-result-query` cho đến khi sẵn sàng
3. Loading state: hiển thị skeleton/spinner với message "AI đang chấm điểm..."
4. Render `RadarChart` với data thật
5. Render CEFR Level Card
6. Render Skill Breakdown (4 kỹ năng, bar chart)
7. Render AI Detailed Feedback (Writing + Speaking)
8. Nút "Bắt đầu lộ trình học" → navigate Dashboard/Roadmap

---

## Phase 5: Backend Infrastructure — Placement Session API

**Mục tiêu:** Tạo khái niệm `PlacementSession` gom cả 3 module lại.

### 5.1 — [NEW] PlacementSession Model (MongoDB)

**File:** `server/src/models/mongo/placement-session.model.ts`

```typescript
interface IPlacementSession {
  _id: ObjectId;
  userId: ObjectId;
  language: string;
  status: 'in_progress' | 'completed';
  currentModule: 'lr' | 'writing' | 'speaking' | 'result';
  lrAttemptId: ObjectId;           // ref → PlacementAttempt (L&R)
  writingAttemptId?: ObjectId;
  speakingAttemptId?: ObjectId;
  lrRawScore?: number;             // % đúng L&R (dùng để adaptive writing)
  writingBand?: number;
  speakingBand?: number;
  cefrFinal?: string;
  createdAt: Date;
  completedAt?: Date;
}
```

---

### 5.2 — [NEW] PlacementSession Service + Repository

**Files:**
- `server/src/repositories/mongo/placement-session.mongo.repo.ts`
- `server/src/services/placement-session.service.ts`

**Service methods:**
- `createSession(userId, lrAttemptId, lrRawScore)` → gọi ngay sau LR submit, lưu `lrRawScore` cho bước sau
- `startWriting(sessionId)` → đọc `lrRawScore` từ session, pick random topic từ `essayModule.topicsByLevel[level]`, tạo WritingAttempt
- `submitWriting(sessionId, essay)` → enqueue writing-grading-job
- `startSpeaking(sessionId)` → random select questions từ `speakingModule.parts` theo `questionsRange`, tạo SpeakingAttempt
- `submitSpeaking(sessionId)` → enqueue speaking-grading-job
- `computeFinalResult(sessionId)` → áp dụng `cefrMapping.weights` + `cefrMapping.thresholds` từ PlacementTest document → cập nhật `cefrFinal + status:'completed'`

---

### 5.3 — [NEW] BullMQ Jobs

**Files:**
- `server/src/jobs/queues/writing-grading.queue.ts`
- `server/src/jobs/workers/writing-grading.worker.ts` → gọi gpt-5.4-mini (chấm điểm, **không sinh đề**)
- `server/src/jobs/queues/speaking-grading.queue.ts`
- `server/src/jobs/workers/speaking-grading.worker.ts` → gọi gpt-5.4-mini + Azure

---

### 5.4 — [NEW] Routes

**File:** `server/src/routes/placement-session.routes.ts`

Đăng kí vào `app.ts` dưới prefix `/api/placement-sessions`.

---

## Phase 6: Polish, Testing & Edge Cases

### 6.1 — Error Handling & Recovery

- **Mất mạng giữa chừng:** Session state lưu trong `sessionStorage` → user F5 vẫn biết đang ở module nào.
- **AI Timeout:** Worker có retry 3 lần. Frontend poll tối đa 5 phút rồi hiển thị lỗi "Hệ thống đang bận, vui lòng thử lại."
- **Mic bị từ chối:** TestMic hiển thị banner hướng dẫn, không cho vào Speaking.
- **Timer hết giờ:** Auto-submit silent (không alert), navigate sang module tiếp theo.

### 6.2 — Unit Tests (Vitest)

| File | Thử nghiệm |
|---|---|
| `use-writing-timer.test.ts` | Countdown, auto-submit at 0 |
| `use-audio-recorder.test.ts` | Permission states, blob output |
| `use-placement-result-query.test.ts` | Poll logic, stop condition |
| `placement-session.service.test.ts` | CEFR calculation formula |

### 6.3 — CEFR Calculation Logic

```typescript
// server/src/utils/cefr.ts
// Đầu vào: scores của từng module (normalized 0–1)
// cefrMapping lấy từ PlacementTest.cefrMapping (weights + thresholds)
function computeFinalCEFR(
  lrPercent: number,     // 0–1
  writingBand: number,   // 0–1 (normalized)
  speakingBand: number,  // 0–1 (normalized)
  cefrMapping: ICEFRMapping,
): string {
  const { weights, thresholds } = cefrMapping;
  const weighted =
    lrPercent    * weights.mcq     +
    writingBand  * weights.writing  +
    speakingBand * weights.speaking;

  // Tìm CEFR level khớp với weighted score
  const match = thresholds.find(
    (t) => weighted >= t.mcqMin && weighted < t.mcqMax
  );
  return match?.level ?? 'A1';
}
```

---

## Tóm Tắt Phase Timeline

| Phase | Tên | Độ phức tạp | Phụ thuộc |
|---|---|---|---|
| **Phase 1** | Foundation & Navigation Flow | 🟡 Medium | Độc lập |
| **Phase 2** | Writing Module Integration | 🔴 High | Phase 1 |
| **Phase 3** | Speaking Module AI Integration | 🔴🔴 Very High | Phase 1, Azure API key |
| **Phase 4** | Result Dashboard | 🟡 Medium | Phase 2 + Phase 3 |
| **Phase 5** | Backend Placement Session API | 🔴 High | Phase 1 (tạo session khi L&R submit) |
| **Phase 6** | Polish, Tests, Edge Cases | 🟡 Medium | All phases |

---

## Danh Sách File Cần Tạo Mới / Sửa Đổi

### CLIENT

#### [NEW]
- `client/src/stores/placement-test.store.ts`
- `client/src/features/dashboard/placement-test/api/start-writing-attempt.ts`
- `client/src/features/dashboard/placement-test/api/submit-writing-attempt.ts`
- `client/src/features/dashboard/placement-test/api/get-writing-result.ts`
- `client/src/features/dashboard/placement-test/api/start-speaking-attempt.ts`
- `client/src/features/dashboard/placement-test/api/submit-speaking-attempt.ts`
- `client/src/features/dashboard/placement-test/api/upload-audio-chunk.ts`
- `client/src/features/dashboard/placement-test/api/get-placement-result.ts`
- `client/src/features/dashboard/placement-test/hooks/use-writing-session.ts`
- `client/src/features/dashboard/placement-test/hooks/use-writing-timer.ts`
- `client/src/features/dashboard/placement-test/hooks/use-writing-submit.ts`
- `client/src/features/dashboard/placement-test/hooks/use-audio-recorder.ts`
- `client/src/features/dashboard/placement-test/hooks/use-examiner-tts.ts`
- `client/src/features/dashboard/placement-test/hooks/use-placement-result-query.ts`
- `client/src/features/dashboard/placement-test/components/result/RadarChart/RadarChart.tsx`
- `client/src/features/dashboard/placement-test/components/result/RadarChart/RadarChart.module.css`
- `client/src/features/dashboard/placement-test/components/result/CEFRCard/CEFRCard.tsx`
- `client/src/features/dashboard/placement-test/components/result/FeedbackAccordion/FeedbackAccordion.tsx`
- `client/src/features/dashboard/placement-test/types/writing.types.ts`
- `client/src/features/dashboard/placement-test/types/speaking.types.ts`
- `client/src/features/dashboard/placement-test/types/result.types.ts`

#### [MODIFY]
- `client/src/stores/placement-test.store.ts` *(tạo mới)*
- `client/src/app/router.tsx` *(thêm routes)*
- `client/src/config/paths.ts` *(thêm PLACEMENT_TEST paths)*
- `client/src/features/dashboard/placement-test/pages/listening-reading/listening-reading.tsx` *(fix navigate)*
- `client/src/features/dashboard/placement-test/pages/Writing/Writing.tsx` *(rewrite)*
- `client/src/features/dashboard/placement-test/pages/Speaking/Speaking.tsx` *(rewrite)*
- `client/src/features/dashboard/placement-test/pages/Result/Result.tsx` *(rewrite)*
- `client/src/features/dashboard/placement-test/components/speaking/test-main/TestMain.tsx` *(add TTS + recorder)*
- `client/src/features/dashboard/placement-test/components/speaking/test-mic/TestMic.tsx` *(real permission check)*
- `client/src/features/dashboard/placement-test/index.ts` *(export new pages)*

### SERVER

#### [NEW]
- `server/src/models/mongo/placement-session.model.ts`
- `server/src/repositories/mongo/placement-session.mongo.repo.ts`
- `server/src/services/placement-session.service.ts`
- `server/src/controllers/placement-session.controller.ts`
- `server/src/routes/placement-session.routes.ts`
- `server/src/jobs/queues/writing-grading.queue.ts`
- `server/src/jobs/workers/writing-grading.worker.ts`
- `server/src/jobs/queues/speaking-grading.queue.ts`
- `server/src/jobs/workers/speaking-grading.worker.ts`
- `server/src/utils/cefr.ts`
- `server/src/validations/placement-session.validation.ts`
