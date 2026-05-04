# Shadowing Feature — Implementation Plan

> **Source of truth:** `.agent/workflow/Client/Shadowing/business-requirements.md`
> **Updated:** 2026-05-04

---

## Overview

| Agent | Phases | Dependency |
|---|---|---|
| **be-dev** | Phase 1 | Unblocked — start immediately |
| **fe-dev** | Phase 2 | Blocked until Phase 1 API is live |
| **fe-dev** | Phase 3 | Blocked until Phase 2 hooks are ready |
| **fe-dev** | Phase 4 | Blocked until Phase 3 state machine is stable |

---

## Phase 1 — Backend Foundation `[be-dev]`

> Goal: Expose the 3 API endpoints so FE can wire against real data.

### 1.1 — Environment & Dependencies

**Target files:**
- `server/.env` — add `DEEPGRAM_API_KEY`
- `server/src/config/env.ts` — add Zod field `DEEPGRAM_API_KEY: z.string().min(1)`

**Task:**
```
Add DEEPGRAM_API_KEY to Zod-validated env. App must refuse to boot if key is missing.
Verify yt-dlp binary is available on PATH (run: yt-dlp --version).
Install: npm install @deepgram/sdk
```

---

### 1.2 — Mongoose Model

**Target file:** `server/src/models/mongo/shadowing-video.model.ts`

```typescript
// Schema fields:
_id, videoId (String, unique, indexed),
title (String), thumbnailUrl (String), durationSeconds (Number),
addedBy (ObjectId → User),
cues: [{ id: String, text: String, startMs: Number, endMs: Number }],
status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
timestamps: true
```

**Rules:**
- Index on `videoId` (unique) and `createdAt` (for sort)
- `cues` embedded — never a separate collection
- Use `timestamps: true`

---

### 1.3 — Zod Validation Schema

**Target file:** `server/src/validations/shadowing.schema.ts`

```typescript
submitVideoSchema  → body: { url: string (valid YouTube URL) }
videoIdParamSchema → params: { videoId: string }
listVideosSchema   → query: { page?: number, limit?: number }
```

---

### 1.4 — Services

**Target files:**
- `server/src/services/yt-dlp.service.ts`
- `server/src/services/deepgram.service.ts`
- `server/src/services/shadowing.service.ts`

**yt-dlp.service.ts:**
```
extractAudio(videoId: string): Promise<string>
→ yt-dlp -x --audio-format mp3 --audio-quality 64K -o /tmp/{videoId}.mp3
→ Returns absolute path to mp3
→ Winston logs only (no console.log)
```

**deepgram.service.ts:**
```
transcribe(filePath: string): Promise<Cue[]>
→ @deepgram/sdk with: model:'nova-2', utterances:true, punctuate:true, words:true
→ Map utterances → Cue[] { id:'cue-0'..., text, startMs, endMs }
→ fs.unlink(filePath) immediately after transcription
```

**shadowing.service.ts:**
```
submitVideo(url, userId):
→ Extract videoId from URL
→ If exists & ready → return { status:'ready', video }
→ If processing → return { status:'processing', videoId }
→ If new:
    1. Create { status:'processing', addedBy: userId }
    2. Fire-and-forget async pipeline: extractAudio → transcribe → fetchOEmbed → update to 'ready'
    3. Return { status:'processing', videoId }
→ On pipeline error: update status to 'failed', Logger.error

getVideoStatus(videoId): Promise<{ status, video? }>
→ If ready → return full doc with cues
→ Else → return { status }

listVideos(page, limit):
→ .lean().select('videoId title thumbnailUrl createdAt cues').sort({ createdAt: -1 })
→ Return cueCount (cues.length), NOT the cues array

fetchOEmbed(videoId) [private]:
→ GET https://www.youtube.com/oembed?url=https://youtube.com/watch?v={videoId}&format=json
→ No API key needed
```

---

### 1.5 — Controller

**Target file:** `server/src/controllers/shadowing.controller.ts`

```typescript
// All methods wrapped in catchAsync():
submitVideo(req, res)    → shadowingService.submitVideo(body.url, req.user._id)
getVideoStatus(req, res) → shadowingService.getVideoStatus(params.videoId)
listVideos(req, res)     → shadowingService.listVideos(query.page, query.limit)
```

---

### 1.6 — Route

**Target file:** `server/src/routes/shadowing.route.ts`

```typescript
POST   /                → protect → rate-limit(5/min) → validate(submitVideoSchema) → submitVideo
GET    /:videoId/status → protect → validate(videoIdParamSchema) → getVideoStatus
GET    /                → protect → validate(listVideosSchema) → listVideos
```

---

### 1.7 — Register in app.ts

```typescript
// server/src/app.ts — add after existing route registrations:
import shadowingRouter from './routes/shadowing.route.js';
app.use('/api/v1/shadowing', shadowingRouter);
```

---

### 1.8 — Swagger JSDoc

Add `@swagger` JSDoc comments on all 3 routes in `shadowing.route.ts`.

---

### Phase 1 Acceptance Criteria

- [ ] `POST /api/v1/shadowing/videos` new URL → `{ status: 'processing', videoId }`
- [ ] `GET /api/v1/shadowing/videos/:videoId/status` eventually returns `{ status: 'ready', video: {...} }`
- [ ] `GET /api/v1/shadowing/videos` returns paginated list with `cueCount` not raw `cues`
- [ ] Temp mp3 deleted immediately after Deepgram call
- [ ] No `console.log` — only Winston
- [ ] Boot fails if `DEEPGRAM_API_KEY` is missing

---

## Phase 2 — Frontend Data Layer `[fe-dev]`

> Goal: Wire real API to the existing UI shell.
> **Blocked until Phase 1 is complete.** (FE can mock responses in the meantime using the shapes below.)

### 2.1 — Types

**Target file:** `client/src/features/dashboard/shadowing/types/shadowing.types.ts`

```typescript
export interface Cue {
  id: string;
  text: string;
  startMs: number;
  endMs: number;
}

export interface ShadowingVideo {
  _id: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  durationSeconds: number;
  cues: Cue[];
  status: 'processing' | 'ready' | 'failed';
  createdAt: string;
}

export interface ShadowingVideoSummary {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  cueCount: number;
  createdAt: string;
}

export interface PaginatedVideos {
  data: ShadowingVideoSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
```

---

### 2.2 — API Service

**Target file:** `client/src/features/dashboard/shadowing/api/shadowing.service.ts`

```typescript
// Use axios instance from lib/axios.ts
submitVideo(url: string): Promise<{ status: string; videoId?: string; video?: ShadowingVideo }>
getVideoStatus(videoId: string): Promise<{ status: string; video?: ShadowingVideo }>
listVideos(page?: number, limit?: number): Promise<PaginatedVideos>
```

---

### 2.3 — TanStack Query Hooks

**`hooks/use-video-library.ts`**
```typescript
// useVideoLibrary(page, limit)
// queryKey: ['shadowing', 'library', page, limit]
// staleTime: 30_000
```

**`hooks/use-submit-video.ts`**
```typescript
// useMutation → calls submitVideo(url)
// onSuccess: status==='ready' → navigate to /dashboard/shadowing/{videoId}
// onSuccess: status==='processing' → store videoId → trigger polling hook
```

**`hooks/use-video-status.ts`**
```typescript
// useVideoStatus(videoId: string | null)
// queryKey: ['shadowing', 'status', videoId]
// refetchInterval: (data) => data?.status === 'processing' ? 3000 : false
// enabled: !!videoId
// onSuccess: status==='ready' → navigate to /dashboard/shadowing/{videoId}
```

---

### 2.4 — Wire Hooks to Existing Components

**`VideoInput`** → use `useSubmitVideo()`, show `ProcessingScreen` while polling

**`VideoLibrary`** → use `useVideoLibrary()`, replace mock data

**`VideoCard`** → typed with `ShadowingVideoSummary`, `onClick` navigates to player

---

### Phase 2 Acceptance Criteria

- [ ] Submit YouTube URL → shows ProcessingScreen → auto-navigates to player
- [ ] Video library shows real thumbnails and titles from API
- [ ] Clicking a card navigates to `/dashboard/shadowing/:videoId`

---

## Phase 3 — Exercise Engine `[fe-dev]`

> Goal: YouTube player tự động dừng sau mỗi cue + transcript panel sync + recorder fully functional.
> **Blocked until Phase 2 hooks are stable.**

---

### 3.1 — `use-yt-player.ts` — YouTube Auto-Stop Engine

**Target file:** `shadowing/hooks/use-yt-player.ts`

**Nhiệm vụ:** Điều khiển YouTube IFrame API và dừng chính xác tại `cue.endMs`.

```typescript
interface UseYtPlayerReturn {
  playerRef: React.MutableRefObject<YT.Player | null>;
  isReady: boolean;
  playCue: (cue: Cue) => void;
  replayCue: (cue: Cue) => void;
  pausePlayer: () => void;
}

function useYtPlayer(
  containerId: string,       // id của div mount iframe
  videoId: string,
  onCueEnd: () => void        // callback khi cue kết thúc → state machine chuyển sang WAITING
): UseYtPlayerReturn
```

**Chi tiết triển khai:**

```
1. Khởi tạo:
   - Load YouTube IFrame API script (nếu chưa có window.YT)
   - Khi API ready → new YT.Player(containerId, { videoId, events: { onReady } })
   - Set isReady = true

2. playCue(cue):
   - player.seekTo(cue.startMs / 1000, true)
   - player.playVideo()
   - Bắt đầu polling interval 100ms:
       intervalRef.current = setInterval(() => {
         const currentSec = player.getCurrentTime();
         if (currentSec >= cue.endMs / 1000) {
           clearInterval(intervalRef.current);
           player.pauseVideo();
           onCueEnd();   ← trigger state machine → WAITING
         }
       }, 100);

3. replayCue(cue): clearInterval trước → gọi playCue(cue) lại

4. Cleanup: clearInterval trong useEffect return

QUAN TRỌNG:
- KHÔNG dùng player.onStateChange để stop (không đủ chính xác ms)
- Luôn clearInterval trước khi start interval mới (tránh leak)
- playerRef phải là stable ref, không re-create player khi re-render
```

---

### 3.2 — `use-shadowing-machine.ts` — State Machine

**Target file:** `shadowing/hooks/use-shadowing-machine.ts`

**Nhiệm vụ:** Quản lý toàn bộ trạng thái của flow luyện tập.

```typescript
type ShadowingState = 'idle' | 'playing' | 'waiting' | 'recording' | 'scoring' | 'result' | 'done';

interface ShadowingMachine {
  state: ShadowingState;
  currentCueIndex: number;
  currentCue: Cue;            // cues[currentCueIndex]
  audioBlob: Blob | null;     // set sau khi stopRecording
  pronunciationResult: PronunciationResult | null;

  // Actions:
  playCurrent: () => void;    // IDLE → PLAYING (gọi ytPlayer.playCue)
  onCueEnd: () => void;       // PLAYING → WAITING (callback từ use-yt-player)
  startRecording: () => void; // WAITING → RECORDING
  stopRecording: () => void;  // RECORDING → SCORING (trigger Azure)
  onScoreComplete: (result: PronunciationResult) => void; // SCORING → RESULT
  retry: () => void;          // RESULT → PLAYING (replay cue hiện tại)
  next: () => void;           // RESULT → IDLE (cueIndex+1) hoặc DONE
}
```

**State Transition Diagram:**

```
IDLE
  ↓ [playCurrent()]
PLAYING  ← (ytPlayer đang chạy, interval đang poll)
  ↓ [onCueEnd() — từ interval callback]
WAITING  ← (player đã pause, chờ user)
  ↓ [startRecording()]
RECORDING ← (MediaRecorder đang chạy)
  ↓ [stopRecording()]
SCORING   ← (gửi blob lên Azure, chờ kết quả)
  ↓ [onScoreComplete(result)]
RESULT    ← (hiển thị ScorePanel)
  ├── [retry()]  → PLAYING  (replayCue hiện tại)
  ├── [next()]   → IDLE     (cueIndex + 1, nếu chưa hết)
  └── [next()]   → DONE     (nếu đã hết tất cả cues)
```

**Implementation notes:**
```
- Dùng useReducer để quản lý state transitions (predictable, dễ debug)
- playCurrent phải gọi ytPlayer.playCue(currentCue)
- retry phải gọi ytPlayer.replayCue(currentCue)
- Khi next(): set cueIndex = cueIndex + 1, reset audioBlob và pronunciationResult
- DONE state: hiển thị màn hình hoàn thành (no next cue)
```

---

### 3.3 — `use-shadowing-recorder.ts` — MediaRecorder Wrapper

**Target file:** `shadowing/hooks/use-shadowing-recorder.ts`

```typescript
interface UseShadowingRecorderReturn {
  startRecording: () => Promise<void>;  // requests mic permission nếu chưa có
  stopRecording: () => Promise<Blob>;   // stop → trả về audio Blob (webm/wav)
  isRecording: boolean;
}
```

**Implementation notes:**
```
- mediaRecorderRef.current = new MediaRecorder(stream)
- Collect chunks vào mảng, khi stop → new Blob(chunks, { type: 'audio/webm' })
- Nếu user từ chối mic → throw Error('Microphone permission denied')
- Stream phải được stop() sau khi recording xong để tắt đèn mic
```

---

### 3.4 — Transcript Panel — Auto Active Sync

**Target file:** `shadowing/components/TranscriptPanel/TranscriptPanel.tsx` + `TranscriptPanel.module.css`

**Nhiệm vụ:** Hiển thị danh sách tất cả cues bên phải. Cue đang active được highlight và tự động scroll vào view.

**Props:**
```typescript
interface TranscriptPanelProps {
  cues: Cue[];
  activeCueIndex: number;        // = machine.currentCueIndex
  mode: 'with-transcript' | 'without-transcript';
  state: ShadowingState;         // để ẩn text khi mode without + đang PLAYING
  onCueClick?: (index: number) => void;  // optional: cho phép click nhảy cue
}
```

**UI Spec:**
```
- Mỗi cue render thành 1 card `.cueCard`
- Card active (index === activeCueIndex): có class `.cueCardActive`
  → border highlight (--primary color), background nhạt hơn
- Metadata: "#cue-{N}" + "start → end" hiển thị nhỏ trên đầu card
- Text cue:
  - mode='with-transcript': luôn visible
  - mode='without-transcript' + state='playing': ẩn text (blur hoặc placeholder dots)
  - mode='without-transcript' + state khác: hiển thị text bình thường

Auto-scroll:
- useEffect([activeCueIndex]) → cueRefs[activeCueIndex].current?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest'
  })
- Mỗi card có ref trong mảng cueRefs = useRef<(HTMLDivElement | null)[]>([])
```

**CSS Module spec:**
```css
.panel         { overflow-y: auto; height: 100%; padding: 12px; }
.cueCard       { border-radius: 8px; padding: 12px; margin-bottom: 8px;
                 border: 2px solid transparent; cursor: pointer;
                 transition: border-color 200ms, background 200ms; }
.cueCardActive { border-color: var(--primary); background: var(--primary-subtle); }
.cueIndex      { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
.cueText       { font-size: 14px; line-height: 1.5; }
.cueTextHidden { filter: blur(4px); user-select: none; }
```

---

### 3.5 — `ShadowingPlayer` — Orchestration Component

**Target file:** `shadowing/components/ShadowingPlayer/ShadowingPlayer.tsx`

**Nhiệm vụ:** Gắn tất cả hooks lại với nhau. Layout 2 cột: player bên trái, transcript bên phải.

```typescript
interface ShadowingPlayerProps {
  video: ShadowingVideo;
  mode: 'with-transcript' | 'without-transcript';
  onModeChange: (mode: 'with-transcript' | 'without-transcript') => void;
}
```

**Layout Structure:**
```
┌─────────────────────────────────────────────────────────────┐
│  [Mode Toggle]  [Cue counter: X/Total]                      │
├─────────────────────────────┬───────────────────────────────┤
│                             │                               │
│   YouTube IFrame            │   TranscriptPanel             │
│   (16:9 ratio)              │   (scrollable, auto-active)   │
│                             │                               │
├─────────────────────────────┴───────────────────────────────┤
│  ● Player status dot        │  [State-dependent controls]   │
├─────────────────────────────────────────────────────────────┤
│              CueDisplay (current cue text + id)             │
├─────────────────────────────────────────────────────────────┤
│              [Primary Action Button]                         │
└─────────────────────────────────────────────────────────────┘
```

**Hook wiring:**
```typescript
const machine = useShadowingMachine(video.cues);
const ytPlayer = useYtPlayer('yt-player-container', video.videoId, machine.onCueEnd);
const recorder = useShadowingRecorder();

// Khi state = WAITING → hiển thị nút "Bắt đầu ghi âm"
// Khi state = RECORDING → hiển thị nút "Hoàn thành" + timer
// Khi state = SCORING → loading spinner
// Khi state = RESULT → render <ScorePanel />
```

**State-dependent controls:**

| State | Controls hiển thị |
|---|---|
| `idle` | Nút "▶ Phát câu" (primary) |
| `playing` | Không có nút — đang phát |
| `waiting` | Nút "🎙 Sẵn sàng ghi âm" (primary) + "↩ Phát lại" (ghost) |
| `recording` | Nút "⏹ Hoàn thành" (danger/red) + recording timer |
| `scoring` | Spinner "Đang chấm điểm..." |
| `result` | ScorePanel với Retry + Next |
| `done` | Màn hình hoàn thành + nút "Xem lại từ đầu" |

**Auto-flow on mount:**
```
- Sau khi ytPlayer.isReady = true → tự động gọi machine.playCurrent()
  → video tự play cue đầu tiên ngay khi load xong
```

---

### 3.6 — `CueDisplay` Component

**Target file:** `shadowing/components/CueDisplay/CueDisplay.tsx`

**Props:**
```typescript
interface CueDisplayProps {
  cue: Cue;
  mode: 'with-transcript' | 'without-transcript';
  state: ShadowingState;
}
```

**Behavior:**
```
- Luôn hiển thị: cue id + thời gian (startMs → endMs, format: "12.6s → 13.9s")
- Text:
  - mode='with-transcript': luôn hiện
  - mode='without-transcript':
    → state='playing': ẩn (blur hoặc "...")
    → state='result': hiện (revealed sau khi chấm xong)
    → các state khác: hiện
```

---

### Phase 3 Acceptance Criteria

- [ ] YouTube video tự động play cue đầu tiên khi trang load
- [ ] Video tự dừng chính xác tại `cue.endMs` (100ms polling, không dùng onStateChange)
- [ ] Sau khi dừng → state chuyển sang `waiting`, hiện nút "Sẵn sàng ghi âm"
- [ ] Transcript panel bên phải tự động scroll đến và highlight cue hiện tại
- [ ] Click "Sẵn sàng ghi âm" → state `recording`, mic bắt đầu thu
- [ ] Click "Hoàn thành" → state `scoring`, recorder trả Blob
- [ ] Retry → replayCue, Next → tăng cueIndex, cả transcript panel và CueDisplay đều cập nhật
- [ ] Mode toggle ẩn/hiện text đúng theo spec
- [ ] Không có interval leak khi unmount component

---

## Phase 4 — Azure Pronunciation Scoring `[fe-dev]`

> Goal: Score each recording and display results.
> **Blocked until Phase 3 recorder returns a Blob.**

### 4.1 — `use-azure-pronunciation.ts`

```typescript
// Uses microsoft-cognitiveservices-speech-sdk (verify already installed)
scoreBlob(blob: Blob, referenceText: string): Promise<PronunciationResult>

// Config: speechRecognitionLanguage = 'en-US'
// PronunciationAssessmentConfig: HundredMark, Word granularity
// Push Blob audio via PushAudioInputStream

interface PronunciationResult {
  overallScore: number;
  words: {
    word: string;
    accuracyScore: number;
    errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
  }[];
}
```

---

### 4.2 — `ScorePanel` component (create)

**Target:** `components/ScorePanel/ScorePanel.tsx` + `ScorePanel.module.css`

**UI spec:**
- Large overall score with color ring: green ≥80, yellow ≥60, red <60
- Word list colored by `accuracyScore` (same thresholds)
- `Omission` words shown with strike-through
- `Retry` button + `Next` button

---

### 4.3 — Wire ScorePanel

In `ShadowingPlayer`:
- `state === 'scoring'` → call `scoreBlob(blob, currentCue.text)` → on resolve → transition to `'result'`
- `state === 'result'` → render `<ScorePanel result={...} onRetry={machine.retry} onNext={machine.next} />`

---

### Phase 4 Acceptance Criteria

- [ ] Azure returns `PronunciationResult` after each recording
- [ ] ScorePanel shows overall score + per-word colors
- [ ] Retry re-plays current cue from the beginning
- [ ] Next advances to next cue (or shows completion on last cue)

---

## Execution Order & Parallelism

```
┌─────────────────────────────────────────────┐
│  Phase 1 (be-dev) ← Start immediately       │
│  • Model, Services, Controller, Route        │
└─────────────────┬───────────────────────────┘
                  │ Phase 1 complete ✓
                  ▼
┌─────────────────────────────────────────────┐
│  Phase 2 (fe-dev) ← Types + API layer       │
│  • Types, Service, Query Hooks, Component    │
│    wiring                                    │
└─────────────────┬───────────────────────────┘
                  │ Phase 2 complete ✓
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Phase 3 (fe-dev) ← Exercise engine                         │
│  • use-yt-player (auto-stop 100ms polling)                   │
│  • use-shadowing-machine (7-state reducer)                   │
│  • use-shadowing-recorder (MediaRecorder wrapper)            │
│  • TranscriptPanel (auto-scroll + active highlight)          │
│  • ShadowingPlayer (orchestration, 2-column layout)          │
│  • CueDisplay (with/without transcript mode)                 │
└─────────────────┬───────────────────────────────────────────┘
                  │ Phase 3 complete ✓
                  ▼
┌─────────────────────────────────────────────┐
│  Phase 4 (fe-dev) ← Azure scoring           │
│  • use-azure-pronunciation, ScorePanel       │
└─────────────────────────────────────────────┘
```

> **Tip for fe-dev:** Phases 2–4 can be developed against mock data while Phase 1 is in progress. Use the exact response shapes defined above.

---

## Files Summary

### be-dev — Phase 1

| File | Action |
|---|---|
| `server/.env` | Add `DEEPGRAM_API_KEY` |
| `server/src/config/env.ts` | Add Zod field |
| `server/src/models/mongo/shadowing-video.model.ts` | **Create** |
| `server/src/validations/shadowing.schema.ts` | **Create** |
| `server/src/services/yt-dlp.service.ts` | **Create** |
| `server/src/services/deepgram.service.ts` | **Create** |
| `server/src/services/shadowing.service.ts` | **Create** |
| `server/src/controllers/shadowing.controller.ts` | **Create** |
| `server/src/routes/shadowing.route.ts` | **Create** |
| `server/src/app.ts` | Add 2 lines |

### fe-dev — Phases 2–4

| File | Action |
|---|---|
| `shadowing/types/shadowing.types.ts` | **Create** |
| `shadowing/api/shadowing.service.ts` | **Create** |
| `shadowing/hooks/use-video-library.ts` | **Create** |
| `shadowing/hooks/use-submit-video.ts` | **Create** |
| `shadowing/hooks/use-video-status.ts` | **Create** |
| `shadowing/hooks/use-yt-player.ts` | **Create** (auto-stop engine) |
| `shadowing/hooks/use-shadowing-machine.ts` | **Create** (useReducer state machine) |
| `shadowing/hooks/use-shadowing-recorder.ts` | **Create** |
| `shadowing/hooks/use-azure-pronunciation.ts` | **Create** |
| `shadowing/components/TranscriptPanel/TranscriptPanel.tsx` | **Create** (auto-scroll + active) |
| `shadowing/components/TranscriptPanel/TranscriptPanel.module.css` | **Create** |
| `shadowing/components/ScorePanel/ScorePanel.tsx` | **Create** |
| `shadowing/components/ScorePanel/ScorePanel.module.css` | **Create** |
| `shadowing/components/CueDisplay/CueDisplay.tsx` | **Update** |
| `shadowing/components/ShadowingPlayer/ShadowingPlayer.tsx` | **Update** (2-col layout + orchestration) |
| `shadowing/pages/ShadowingPlayerPage/ShadowingPlayerPage.tsx` | **Update** |
| `shadowing/index.ts` | **Update** |
