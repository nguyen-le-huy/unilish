# Task: Migrate SpeakingStudio — OpenAI Realtime (WebRTC) → STT→LLM→TTS Pipeline + Azure Pronunciation

> **Component:** `admin/src/features/curriculum/courses/components/SpeakingStudio`
> **Ngày:** 2026-03-18
> **Mục tiêu:** Thay thế `gpt-realtime-mini` WebRTC bằng pipeline mới: `gpt-4o-mini-transcribe` STT → `gpt-5-mini` LLM → `gpt-4o-mini-tts` TTS song song với Azure Speech SDK Pronunciation Assessment (Phoneme-level).

---

## 1. So sánh: Hiện tại vs Mục tiêu

### Workflow Hiện tại (to be replaced)

```
Admin bật toggle "Bắt đầu luyện tập"
    ↓
WebRTC kết nối thẳng OpenAI Realtime API (gpt-realtime-mini-2025-12-15)
    ↓ (full-duplex, continuous mic)
AI phản hồi audio stream qua RTCPeerConnection
    ↓
Browser plays audio qua <audio autoplay>
    ↓ 
Browser SpeechRecognition → interim transcript (chỉ để hiển thị, không dùng để score)

Nhược điểm:
❌ Không có Pronunciation Assessment (Azure bị đánh dấu @v2-deferred)
❌ Không thể inject phoneme scores vào system prompt
❌ Mic luôn mở (server VAD), không có PTT feedback rõ ràng
❌ Toggle button = bật/tắt toàn bộ WebRTC session (không phải per-turn PTT)
❌ use-audio-streaming.ts dùng Web Speech Synthesis (browser TTS) làm fallback, chất lượng thấp
```

### Workflow Mới (theo mota.md)

```
AI chào trước (TTS tự động khi session mở)
    ↓
Admin nhấn 🎙️ (Toggle ON)
    ↓
Mic BẬT → Ghi audio vào buffer (MediaRecorder / raw PCM)
    ↓
Admin nhấn 🔴 (Toggle OFF) → Dừng ghi
    ↓
Gửi audio blob song song lên 2 luồng:
┌─────────────────────────┬──────────────────────────────┐
│ LUỒNG 1 (OpenAI)        │ LUỒNG 2 (Azure)              │
│                         │                              │
│ STT: gpt-4o-mini-       │ PronunciationAssessment      │
│      transcribe         │ Config:                      │
│   → transcript text     │   referenceText = currentWord│
│                         │   granularity = Phoneme      │
│ LLM: gpt-5-mini         │   gradingSystem = HundredMark│
│   (system prompt chứa   │   nBestPhoneme = 5           │
│    phoneme scores từ ←──┤   enableMiscue = true        │
│    Azure)               │                              │
│   → reply text          │ → 5 scores + phoneme errors  │
│                         │                              │
│ TTS: gpt-4o-mini-tts    │                              │
│   → audio stream        │                              │
└─────────────────────────┴──────────────────────────────┘
    ↓
AI phát audio (gpt-4o-mini-tts streaming)
    ↓
Hiển thị Score Card (5 chỉ số + phoneme heatmap)
    ↓
Về Idle — chờ lượt tiếp theo
```

---

## 2. Audit Code Hiện tại — Những gì giữ, xóa, viết mới

### ✅ GIỮ NGUYÊN (không thay đổi)
| File | Lý do |
|------|-------|
| `SpeakingStudio.tsx` — Editor tabs (Mission, OpenAI, Azure) | Vẫn cần cho CMS config |
| `components/DynamicEditors/` (3 editors) | Không thay đổi form |
| `types/speaking.types.ts` — CMS types | Giữ `SpeakingContent`, `GradingConfig`, v.v. |
| `validations/speaking.validation.ts` | Form schema không đổi |
| `hooks/use-keyword-coverage.ts` | Vẫn dùng cho keyword tracking |
| `hooks/use-speaking-telemetry.ts` | Vẫn dùng cho telemetry panel |
| `components/Sandbox/SandboxChatPanel.tsx` | Chat transcript UI giữ nguyên |
| `lib/audio-codec.ts` | PCM decoder vẫn cần cho TTS streaming |

---

### 🗑️ XÓA / THAY THẾ HOÀN TOÀN
| File | Lý do |
|------|-------|
| `hooks/use-speaking-realtime.ts` | Toàn bộ WebRTC logic — **xóa** |
| `hooks/use-speech-recognition.ts` | Browser SpeechRecognition API — **xóa** (thay bằng OpenAI STT) |
| `hooks/use-audio-streaming.ts` | `speakAssistantReply` dùng Web Speech Synthesis — **xóa** (thay bằng gpt-4o-mini-tts) |
| `components/Sandbox/SandboxControls.tsx` | Toggle button logic hoàn toàn khác — **viết lại** |
| `components/Sandbox/SandboxTelemetryPanel.tsx` | Thêm Azure score section — **cập nhật** |

---

### 🆕 VIẾT MỚI
| File | Mô tả |
|------|-------|
| `hooks/use-ptt-recorder.ts` | MediaRecorder PTT — ghi audio khi nhấn, dừng khi nhấn lại |
| `hooks/use-openai-pipeline.ts` | STT → LLM → TTS pipeline (3 bước tuần tự / streaming) |
| `hooks/use-azure-pronunciation.ts` | Azure SDK Pronunciation Assessment (phoneme-level) |
| `hooks/use-coach-session.ts` | Orchestrator hook — kết hợp 3 hooks trên + state machine |
| `components/Sandbox/PttMicButton.tsx` | Nút mic PTT với 5 trạng thái theo mota.md |
| `components/Sandbox/PronunciationScoreCard.tsx` | Score card 5 chỉ số + phoneme heatmap |
| `components/Sandbox/SandboxControls.tsx` | **Rewrite** — Layout mới: PttMicButton + ScoreCard + hints |
| `types/pipeline.types.ts` | Types cho pipeline events, PTT states, Azure results |

---

## 3. Chi tiết Types Mới (`types/pipeline.types.ts`)

```typescript
// pipeline.types.ts

// ─── PTT State Machine ──────────────────────────────────────────────────────

export type PttStatus =
    | 'idle'        // Chờ — mic chưa bật
    | 'recording'   // Đang ghi
    | 'processing'  // Gửi lên server, đang xử lý song song
    | 'ai_speaking' // AI đang phát audio TTS
    | 'error';      // Lỗi

// ─── OpenAI Pipeline ────────────────────────────────────────────────────────

export interface SttResult {
    transcript: string;     // Kết quả STT từ gpt-4o-mini-transcribe
    durationMs: number;
}

export interface LlmResult {
    reply: string;          // Văn bản trả lời của AI
    latencyMs: number;
    tokenUsage: number;
    model: string;
}

// ─── Azure Pronunciation ────────────────────────────────────────────────────

export interface PhonemeScore {
    phoneme: string;
    accuracyScore: number;  // 0–100
    errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
}

export interface WordScore {
    word: string;
    accuracyScore: number;
    errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation' | 'UnexpectedBreak' | 'MissingBreak';
    phonemes: PhonemeScore[];
}

export interface PronunciationResult {
    accuracyScore: number;
    fluencyScore: number;
    prosodyScore: number;
    completenessScore: number;
    pronunciationScore: number;   // Weighted overall
    recognizedText: string;
    words: WordScore[];
}

// ─── Turn State ─────────────────────────────────────────────────────────────

export interface TurnResult {
    stt: SttResult | null;
    llm: LlmResult | null;
    pronunciation: PronunciationResult | null;
    error: string | null;
}
```

---

## 4. Thiết kế Hook Architecture

### 4.1 `use-ptt-recorder.ts`

```
Trách nhiệm: Quản lý MediaRecorder lifecycle cho PTT
- startRecording() → bật mic, ghi vào chunks[]
- stopRecording() → dừng mic, trả về Blob (webm/wav)
- Edge cases:
  - Audio < 1.5s → trả về null + toast warning
  - Mic > 30s không dừng → tự stop
  - Mic không có quyền → throw PermissionError

Return: { status, startRecording, stopRecording, audioDurationMs }
```

### 4.2 `use-openai-pipeline.ts`

```
Trách nhiệm: STT → LLM → TTS (3 bước tuần tự)
- run(audioBlob, chatHistory, systemPrompt, pronunciationContext?)
  Step 1: STT — POST audio to server → /api/v1/speaking/stt
           Server calls gpt-4o-mini-transcribe
  Step 2: LLM — POST transcript + history → /api/v1/speaking/chat
           Server calls gpt-5-mini (streaming SSE)
           System prompt includes phoneme errors from Azure (if available)
  Step 3: TTS — POST reply text → /api/v1/speaking/tts
           Server calls gpt-4o-mini-tts (audio/mpeg streaming)
           Client plays via AudioContext (streaming chunks)

onSttDone: (transcript) → hiển thị ngay user bubble trong chat
onLlmChunk: (textDelta) → streaming AI bubble
onTtsChunk: (audioChunk) → play audio chunk realtime
onTtsDone: () → setStatus('idle')

Return: { run, interrupt, status }
```

### 4.3 `use-azure-pronunciation.ts`

```
Trách nhiệm: Azure SDK Pronunciation Assessment
- assess(audioBlob, referenceText)
  1. Fetch token: GET /api/v1/azure-speech/token (cached 9min)
  2. SpeechConfig.fromAuthorizationToken(token, region)
  3. PronunciationAssessmentConfig(referenceText, HundredMark, Phoneme, enableMiscue=true)
  4. AudioConfig.fromWavFileInput(audioBlob) → convert blob → WAV buffer
  5. recognizer.recognizeOnceAsync() → parse result

Return: { assess, result, status, error }
```

### 4.4 `use-coach-session.ts` (Main Orchestrator)

```
Trách nhiệm: Kết hợp 3 hooks + state machine toàn bộ turn

handleToggleMic():
  if (status === 'idle') → startRecording()  // status = 'recording'
  if (status === 'recording'):
    blob = stopRecording()
    if (blob === null) return   // quá ngắn
    status = 'processing'
    
    referenceText = gradingConfig.referenceText || currentTranscript
    
    // Song song:
    [openaiResult, azureResult] = await Promise.allSettled([
      openaiPipeline.run(blob, chatHistory, systemPrompt),
      azurePronunciation.assess(blob, referenceText),
    ])
    
    // Azure xong trước → inject vào LLM system prompt nếu chưa xong
    // (thực tế: Azure thường xong sau STT, trước LLM response)
    
    showScoreCard(azureResult)   // hiển thị ngay khi Azure done
    // LLM + TTS vẫn tiếp tục

Return: {
  pttStatus,
  chatMessages,
  liveTranscript,
  turnResult,
  handleToggleMic,
  resetSession,
}
```

---

## 5. Server — 3 API Endpoints Mới

### 5.1 POST `/api/v1/speaking/stt`

```typescript
// Controller: speaking-pipeline.controller.ts
// Input: multipart/form-data { audio: File (webm/wav), lessonId: string }
// Process: OpenAI.audio.transcriptions.create({ model: 'gpt-4o-mini-transcribe', ... })
// Output: { transcript: string, durationMs: number }
// Rate limit: 20 req/min per user
```

### 5.2 POST `/api/v1/speaking/chat`

```typescript
// Input: { lessonId, transcript, chatHistory, pronunciationContext? }
// pronunciationContext format:
//   "User mispronounced: /r/ in 'restaurant' (accuracy: 32). Help them correct it."
// Process: 
//   1. Load systemPrompt from lesson config
//   2. Append pronunciationContext to systemPrompt (if present)
//   3. OpenAI.chat.completions.create({ model: 'gpt-5-mini', stream: true })
// Output: Server-Sent Events (SSE) — text/event-stream
//   event: chunk → data: { text: string }
//   event: done → data: { latencyMs, tokenUsage, model }
// Rate limit: 15 req/min per user
```

### 5.3 POST `/api/v1/speaking/tts`

```typescript
// Input: { text: string, voiceId?: string, lessonId: string }
// Process: OpenAI.audio.speech.create({ model: 'gpt-4o-mini-tts', ... stream: true })
// Output: audio/mpeg streaming (chunked transfer)
// Rate limit: 15 req/min per user
```

---

## 6. Thiết kế UI Mới — `SandboxControls.tsx` (Rewrite)

```
┌─────────────────────────────────────────────────────┐
│                   SANDBOX CONTROLS                   │
├─────────────────────────────────────────────────────┤
│                                                       │
│          [ PronunciationScoreCard ]                  │
│          (hidden until first turn done)               │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │     [ 🎙️ PttMicButton ]                      │   │
│  │     5 states: idle/recording/processing/     │   │
│  │               ai_speaking/error              │   │
│  └──────────────────────────────────────────────┘   │
│                                                       │
│  [💡 Hints] [🔄 Reset Session]                       │
│                                                       │
│  [mic status text] [error text]                      │
└─────────────────────────────────────────────────────┘
```

**PttMicButton — 5 states:**

| State | Icon | Color | Label | onClick |
|-------|------|-------|-------|---------|
| `idle` | `Mic` | emerald ring | "Tap to speak" | startRecording |
| `recording` | `MicOff` + pulse | red + spin ring | "Tap to stop" | stopRecording |
| `processing` | `Loader2` spin | amber | "Analyzing…" | disabled |
| `ai_speaking` | Robot icon + wave | blue | "AI is speaking…" | (hides, shows interrupt if needed) |
| `error` | `AlertTriangle` | red | "Tap to retry" | retry |

**PronunciationScoreCard layout:**
```
┌─────────────────────────────────────┐
│ Overall Score: 87/100               │
│                                     │
│ Accuracy    92  Fluency      85     │
│ Prosody     80  Completeness 95     │
├─────────────────────────────────────┤
│ Word Analysis:                      │
│ [beautiful]  Acc: 94  ← text-emerald│
│   /b/99 /ju/90 /tɪ/72 ← color coded│
│ [restaurant] Acc: 52 ← text-red     │
│   /r/45 /ɛs/88 /tə/38 ← color coded│
└─────────────────────────────────────┘
Color: ≥80 → emerald | ≥60 → amber | <60 → red
```

**SandboxTelemetryPanel — Thêm section:**
```diff
+ ── Pronunciation (Azure) ──
+ Overall: 87/100
+ Accuracy / Fluency / Prosody / Completeness
+ Recognized: "I would like to book a restaurant"
+ Reference:  "I would like to book a restaurant"
```

---

## 7. Cấu trúc Thư Mục Sau Khi Hoàn Thành

```
SpeakingStudio/
├── SpeakingStudio.tsx              (cập nhật nhỏ — bỏ WebRTC hooks)
├── components/
│   ├── DynamicEditors/             (giữ nguyên)
│   └── Sandbox/
│       ├── SandboxChatPanel.tsx    (giữ nguyên)
│       ├── SandboxControls.tsx     ← REWRITE
│       ├── SandboxTelemetryPanel.tsx ← CẬP NHẬT (thêm Azure section)
│       ├── PttMicButton.tsx        ← MỚI
│       └── PronunciationScoreCard.tsx ← MỚI
├── hooks/
│   ├── use-keyword-coverage.ts     (giữ nguyên)
│   ├── use-speaking-telemetry.ts   (giữ nguyên)
│   ├── use-coach-session.ts        ← MỚI (main orchestrator)
│   ├── use-ptt-recorder.ts         ← MỚI
│   ├── use-openai-pipeline.ts      ← MỚI
│   ├── use-azure-pronunciation.ts  ← MỚI
│   │
│   │── REMOVED ───────────────────────────────────
│   ├── use-speaking-realtime.ts    ← XÓA
│   ├── use-speech-recognition.ts   ← XÓA
│   └── use-audio-streaming.ts      ← XÓA
├── lib/
│   └── audio-codec.ts              (giữ nguyên — PCM decoder vẫn dùng)
├── types/
│   ├── speaking.types.ts           (giữ — cập nhật thêm CoachChatMessage.pronunciation)
│   └── pipeline.types.ts           ← MỚI
└── validations/
    └── speaking.validation.ts      (giữ nguyên)
```

---

## 8. Cập nhật `SpeakingStudio.tsx`

Những thay đổi trong file chính:

```typescript
// XÓA:
import { useAudioStreaming } from './hooks/use-audio-streaming';
import { useSpeakingRealtime } from './hooks/use-speaking-realtime';
import { useSpeechRecognition } from './hooks/use-speech-recognition';

// THÊM:
import { useCoachSession } from './hooks/use-coach-session';

// XÓA toàn bộ state:
// isVoiceRealtimeOn, liveTranscript, lastMicError, coachState,
// lastLatencyMs, lastTokenUsage, lastModelName, lastRequestedModelName,
// lastTargetLanguage, lastVoiceId, lastRoleName, lastSessionId,
// lastUsedFallback, rawRealtimeEvents
// streamingAssistantMessageIdRef, streamingUserMessageIdRef, voiceRealtimeRef

// THAY BẰNG:
const {
    pttStatus,
    chatMessages,
    liveTranscript,
    turnResult,        // { stt, llm, pronunciation, error }
    telemetry,         // { latencyMs, tokenUsage, model, ... }
    handleToggleMic,
    resetSession,
} = useCoachSession({ lessonId, gradingConfig: getValues('gradingConfig') });

// SandboxControls props thay đổi:
<SandboxControls
    pttStatus={pttStatus}
    turnResult={turnResult}
    liveTranscript={liveTranscript}
    hints={hints}
    onToggleMic={handleToggleMic}
    onResetSession={resetSession}
/>
```

---

## 9. Thứ Tự Triển Khai (PR Sequence)

```
PR #1 — Types
  + types/pipeline.types.ts
  + Cập nhật speaking.types.ts (xóa @v2-deferred comments, thêm pronunciation field)

PR #2 — Server Endpoints
  + controllers/speaking-pipeline.controller.ts (3 endpoints: stt, chat, tts)
  + routes/speaking-pipeline.routes.ts
  + Zod validation cho mỗi endpoint
  + Rate limit config

PR #3 — Recorder Hook
  + hooks/use-ptt-recorder.ts
  + Edge cases: < 1.5s, > 30s timeout, mic permission error

PR #4 — OpenAI Pipeline Hook
  + hooks/use-openai-pipeline.ts
  + SSE client cho /chat endpoint
  + Audio streaming client cho /tts endpoint

PR #5 — Azure Pronunciation Hook
  + hooks/use-azure-pronunciation.ts
  + Token caching (TanStack Query, staleTime=9min)
  + WAV conversion từ webm blob

PR #6 — Orchestrator Hook
  + hooks/use-coach-session.ts
  + Promise.allSettled cho 2 luồng song song
  + Phoneme context injection vào LLM

PR #7 — UI Components
  + components/Sandbox/PttMicButton.tsx (5 states)
  + components/Sandbox/PronunciationScoreCard.tsx
  + components/Sandbox/SandboxControls.tsx (rewrite)
  + components/Sandbox/SandboxTelemetryPanel.tsx (update)

PR #8 — Integration + Cleanup
  + SpeakingStudio.tsx — swap hooks, remove dead state
  + Xóa: use-speaking-realtime.ts, use-speech-recognition.ts, use-audio-streaming.ts
  + E2E test trong Sandbox
```

---

## 10. Edge Cases & Error Handling

| Tình huống | Xử lý |
|-----------|--------|
| Audio < 1.5 giây | `use-ptt-recorder` → return null → toast "Vui lòng nói lâu hơn" |
| Mic > 30s không dừng | Auto stop recording + toast warning |
| Nhấn mic khi AI đang nói | Button disabled (pttStatus = 'ai_speaking') |
| Lỗi mạng STT | Retry button hiện trong chat area, không mất transcript |
| Azure token hết hạn | TanStack Query refetch tự động (staleTime = 9min < Azure TTL 10min) |
| Azure không nhận diện được | `recognizedText` rỗng → hiển thị "Speech not clear" trong ScoreCard |
| gpt-5-mini quá tải | Server retry 2 lần → fallback gpt-4o-mini → báo telemetry |
| TTS streaming bị gián đoạn | `interrupt()` trong use-openai-pipeline stops AudioContext |
| WebRTC deps còn sót trong package | Remove `RTCPeerConnection` usage → no breaking change cho build |

---

## 11. Compliance

| Rule | Status |
|------|--------|
| Tailwind CSS (Admin) | ✅ Toàn bộ UI mới dùng Tailwind + Shadcn/UI |
| TanStack Query (Azure token cache) | ✅ staleTime = 9min |
| TypeScript strict — No `any` | ✅ pipeline.types.ts đầy đủ |
| Server: Zod validation + catchAsync | ✅ 3 endpoints mới |
| Server: Rate limit (Redis) | ✅ 15-20 req/min per endpoint |
| Server: Winston logger (no console.log) | ✅ |
| Azure key không expose ra client | ✅ Token proxy pattern |
| Accessibility: aria-label mic button | ✅ aria-label + aria-pressed |
| Edge cases documented | ✅ Section 10 |
