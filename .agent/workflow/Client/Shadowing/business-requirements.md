## Shadowing Feature — Complete Business Requirements

### 1. Video Input
- User pastes any YouTube URL
- If video **already exists** in library → silently reuse cached transcript, go straight to exercise
- If video is **new** → process it (yt-dlp + Deepgram), add to global library, then start exercise
- No video length limit
- User sees a **loading screen** during processing

***

### 2. Global Video Library
- All processed videos are visible to **all users** — crowd-sourced library
- Each card shows: **YouTube thumbnail + title**
- Sorted by **most recently added**
- No delete, no limit
- Clicking a video always **restarts from sentence 1**

***

### 3. Transcript Processing
- Audio extracted via **yt-dlp**
- Transcribed by **Deepgram Nova-2** with word-level timestamps + sentence utterances
- Cached in DB by **videoId** — never reprocessed once stored

***

### 4. Exercise — Sentence Flow
1. Video plays one sentence → **auto-stops**
2. User clicks **Start Shadowing** → records voice
3. User clicks **Done** → Azure Speech SDK scores pronunciation
4. User sees: overall score + per-word color coding
5. User chooses **Retry** or **Next**
6. No retry limit, no forced passing score

***

### 5. Two Exercise Modes
| | With Transcript | Without Transcript |
|---|---|---|
| During playback | Text visible | Text hidden |
| During shadowing | Text visible | Text revealed after Done |

***

### 6. Out of Scope (MVP)
- No session history / score saving
- No resume progress
- No video delete / management
- No waveform comparison
- No fill-in-the-blank mode
- No video length enforcement

***

## Data Models

Unilish dùng MongoDB, nên đây là 2 collections cần thêm:

***

### Collection 1: `shadowing_videos`

Lưu mỗi video đã được xử lý — **1 document per unique YouTube video**.

```
shadowing_videos
├── _id
├── videoId          String, unique   — YouTube video ID (e.g. "dQw4w9WgXcQ")
├── title            String           — fetched từ YouTube oEmbed
├── thumbnailUrl     String           — fetched từ YouTube oEmbed
├── durationSeconds  Number           — độ dài video
├── addedBy          ObjectId → User  — user đầu tiên submit URL này
├── cues             Array
│   ├── id           String           — "cue-0", "cue-1"...
│   ├── text         String           — nội dung câu
│   ├── startMs      Number           — thời điểm bắt đầu (ms)
│   └── endMs        Number           — thời điểm kết thúc (ms)
├── status           Enum             — "processing" | "ready" | "failed"
├── createdAt        Date
└── updatedAt        Date
```

**Lý do thiết kế:**
- `cues` được **embed trực tiếp** vào document (không tách collection riêng) vì chúng luôn được đọc cùng nhau, không bao giờ query riêng lẻ
- `status` cần thiết vì processing mất 20–40s — cần biết video đang ở trạng thái nào để hiện loading screen đúng

***

### Collection 2: Không cần thêm

Vì **scores không được lưu** và **library là global read-only**, không cần collection cho session hay user-video relationship.

***

## API Contracts

### Endpoints cần xây dựng

***

**`POST /api/v1/shadowing/videos`**
> User submit một YouTube URL

Request:
```
{ "url": "https://youtube.com/watch?v=dQw4w9WgXcQ" }
```

Response (video mới — đang xử lý):
```
{ "status": "processing", "videoId": "dQw4w9WgXcQ" }
```

Response (video đã tồn tại — reuse):
```
{ "status": "ready", "video": { ...video document } }
```

***

**`GET /api/v1/shadowing/videos/:videoId/status`**
> Client poll mỗi 3s để biết khi nào transcript xong

Response:
```
{ "status": "processing" | "ready" | "failed" }
// Nếu "ready" → kèm full video document với cues
```

***

**`GET /api/v1/shadowing/videos`**
> Lấy danh sách global library

Query params: `page`, `limit`

Response:
```
{
  "data": [ { videoId, title, thumbnailUrl, cueCount, createdAt } ],
  "pagination": { ... }
}
```

***

## Processing Flow (Server-side)

```
POST /videos nhận URL
        ↓
Check DB: videoId đã tồn tại?
    ├── YES → trả về { status: "ready", video }
    └── NO  → tạo document { status: "processing" }
                    ↓
              yt-dlp extract audio
                    ↓
              Deepgram Nova-2 transcribe
                    ↓
              Map utterances → cues[]
                    ↓
              Fetch title + thumbnail từ YouTube oEmbed
                    ↓
              Update document { status: "ready", cues, title, thumbnailUrl }
```

Client poll `GET /status` cho đến khi `status === "ready"` rồi bắt đầu exercise.

***

## Technical Design — Shadowing Feature

***

### Server-side Structure

Following the existing pattern in Unilish (controllers → services → routes):

```
server/src/
├── controllers/
│   └── shadowing.controller.ts
├── services/
│   ├── shadowing.service.ts        — orchestration logic
│   ├── yt-dlp.service.ts           — audio extraction
│   └── deepgram.service.ts         — transcription
├── models/
│   └── shadowing-video.model.ts    — Mongoose schema
├── routes/
│   └── shadowing.route.ts
├── validations/
│   └── shadowing.validation.ts
└── middlewares/
    └── shadowing-rate-limit.middleware.ts
```

***

### Client-side Structure

Following existing feature-based pattern:

```
client/src/features/dashboard/shadowing/
├── api/
│   └── shadowing.service.ts
├── components/
│   ├── VideoInput/                 — URL input + submit
│   ├── VideoLibrary/               — global grid of video cards
│   ├── VideoCard/                  — thumbnail + title
│   ├── ProcessingScreen/           — loading while Deepgram runs
│   ├── ShadowingPlayer/            — YouTube iframe + sentence controls
│   ├── CueDisplay/                 — show/hide text by mode
│   ├── RecorderPanel/              — mic button + recording state
│   └── ScorePanel/                 — per-word colored result
├── hooks/
│   ├── use-submit-video.ts         — POST + poll status
│   ├── use-video-library.ts        — GET library (React Query)
│   ├── use-yt-player.ts            — YouTube IFrame API bridge
│   ├── use-shadowing-machine.ts    — state machine
│   ├── use-shadowing-recorder.ts   — MediaRecorder
│   └── use-azure-pronunciation.ts  — Azure Speech SDK scoring
├── pages/
│   └── ShadowingPage.tsx
└── types/
    └── shadowing.types.ts
```

***

### Key Technical Decisions

#### 1. Async Processing — Polling vs WebSocket
Since loading is synchronous from UX perspective, **polling** (`GET /status` every 3s) is simpler and sufficient — no need for WebSocket overhead for a one-time operation.

#### 2. yt-dlp — Audio Format
Extract as **mp3 at 64kbps** — enough quality for speech transcription, keeps file size small (~5MB for 10min), faster upload to Deepgram.

#### 3. Deepgram Config
Key parameters to enable:
- `model: "nova-2"`
- `utterances: true` → sentence-level splits
- `punctuate: true` → needed for sentence boundary detection
- `words: true` → word-level timestamps for precise auto-stop

#### 4. YouTube IFrame Auto-Stop Mechanism
YouTube's `onStateChange` event is **not precise enough** for millisecond-level stops. Use `setInterval` polling `getCurrentTime()` every **100ms** — stop when `currentTime >= cue.endMs`. Clean up interval on component unmount.

#### 5. Temporary Audio File
yt-dlp writes audio to **disk temporarily** on the server, uploads to Deepgram, then **deletes immediately**. Never stored long-term — avoids ToS and storage issues.

#### 6. YouTube oEmbed
Fetch title + thumbnail via:
```
https://www.youtube.com/oembed?url=https://youtube.com/watch?v={videoId}&format=json
```
Free, no API key, no quota limit.

***

### State Machine — Client

```
IDLE
  ↓ [user clicks Play Sentence]
PLAYING  ←──────────────────────────────┐
  ↓ [auto-stop at cue.endMs]            │
WAITING                                  │
  ↓ [user clicks Start Shadowing]        │
RECORDING                                │
  ↓ [user clicks Done]                   │
SCORING                                  │
  ↓ [Azure returns result]               │
RESULT                                   │
  ├── [Retry] ────────────────────────── ┘ (back to PLAYING)
  ├── [Next]  → increment cueIndex → IDLE
  └── (last cue) → DONE
```

***

### Environment Variables Needed

```bash
# Server — add to .env
DEEPGRAM_API_KEY=...
```

Everything else already exists:
- `AZURE_SPEECH_KEY` + `AZURE_SPEECH_REGION` — already in codebase
- No new client env vars needed

***

### Dependencies to Install

**Server:**
```bash
npm install @deepgram/sdk        # Deepgram Node SDK
# yt-dlp is a binary — install on server OS, not via npm
# Ubuntu: sudo apt install yt-dlp
# Or: pip install yt-dlp
```

**Client:**
```bash
npm install microsoft-cognitiveservices-speech-sdk   # already installed?
```

***

### app.ts — 1 Line to Add

```ts
import shadowingRouter from './routes/shadowing.route.js';
app.use('/api/v1/shadowing', shadowingRouter);
```

***

This design is fully consistent with all existing patterns in Unilish  — same route/controller/service structure, same `protect` middleware, same error handling via `AppError`.