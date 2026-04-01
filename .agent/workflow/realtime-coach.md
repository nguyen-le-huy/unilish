# Realtime Coach Workflow (Client → Server → OpenAI Realtime)

## 1) Mục tiêu tài liệu

Tài liệu mô tả **luồng Speaking Realtime production hiện tại** của hệ thống Unilish:

1. Admin client xin realtime bootstrap từ server.
2. Server dựng prompt theo lesson và tạo ephemeral session với OpenAI.
3. Client kết nối WebRTC trực tiếp OpenAI, stream mic/audio + xử lý realtime events.

> Lưu ý: kiến trúc Socket.IO `speech-coach` legacy đã xóa hoàn toàn khỏi runtime.

---

## 2) Thành phần và code ownership

### 2.1 Frontend (Admin)

- Entry UI: `admin/src/features/curriculum/courses/components/SpeakingStudio/SpeakingStudio.tsx`
- API layer: `admin/src/features/curriculum/courses/api/speaking.api.ts`
- Realtime transport hook: `admin/src/features/curriculum/courses/components/SpeakingStudio/hooks/use-speaking-realtime.ts`
- Types: `admin/src/features/curriculum/courses/components/SpeakingStudio/types/speaking.types.ts`

### 2.2 Backend (Server)

- App route mount: `server/src/app.ts`
- Lesson nesting: `server/src/routes/lesson.route.ts`
- Speaking routes: `server/src/routes/speaking.route.ts`
- Validation: `server/src/validations/speaking.validation.ts`
- Controller: `server/src/controllers/speaking.controller.ts`
- Service: `server/src/services/speaking.service.ts`
- Prompt builder: `server/src/services/speaking-prompt-builder.ts`
- Mongo repository: `server/src/repositories/mongo/speaking-lesson.mongo.repository.ts`
- Response envelope: `server/src/utils/send-response.ts`
- Env schema/defaults: `server/src/config/env.ts`

---

## 3) Luồng kiến trúc end-to-end

```text
Admin SpeakingStudio
   │
   │ GET /api/curriculum/lessons/:lessonId/speaking/session
   ▼
Server speaking route (protect + validate + controller)
   │
   │ POST https://api.openai.com/v1/realtime/sessions
   ▼
OpenAI returns client_secret.value
   │
   │ { ephemeralKey, model, voiceId, targetLanguage, greeting, roleName }
   ▼
Admin WebRTC direct: POST /v1/realtime?model=... + data channel events
```

### Ownership rule

- **Server-owned**: model/voice/turn detection/noise reduction/max tokens/prompt.
- **Client-owned**: WebRTC lifecycle, mic permission, playback, event-to-UI mapping.
- **OpenAI-owned**: realtime ASR + inference + audio generation.

---

## 4) HTTP API contract (server)

### 4.1 Endpoint

- Effective path: `GET /api/curriculum/lessons/:lessonId/speaking/session`
- Router chain:
  - `/api/curriculum/lessons` (app)
  - `/:lessonId/speaking` (lesson route)
  - `/session` (speaking route)

### 4.2 Security

- `protect` bắt buộc cho speaking router.
- Endpoint `/session` không yêu cầu `restrictTo`, chỉ cần user đã đăng nhập.

### 4.3 Validation

- `getSpeakingRealtimeSessionSchema`
  - `params.lessonId`: ObjectId hợp lệ.

### 4.4 Response envelope

Controller dùng `sendResponse(...)`, dạng trả về:

```json
{
  "status": "success",
  "code": 200,
  "message": "Speaking realtime session created successfully",
  "data": {
    "ephemeralKey": "...",
    "model": "gpt-realtime-mini-2025-12-15",
    "targetLanguage": "en-US",
    "voiceId": "marin",
    "roleName": "Immigration Officer",
    "greeting": "Good evening..."
  }
}
```

---

## 5) Backend flow chi tiết

### 5.1 `speakingService.createRealtimeSession(lessonId)`

1. Lấy lesson context từ `SpeakingLessonMongoRepository.findLessonContext`.
2. Build system prompt bằng `PromptBuilderService.buildSystemPrompt`.
3. Resolve voice theo thứ tự:
   - `lesson aiConfig.voiceId` nếu thuộc allow-list
   - `env.OPENAI_REALTIME_VOICE`
   - fallback cuối: `marin`
4. Resolve turn detection theo `OPENAI_REALTIME_TURN_DETECTION_MODE`:
   - `normal` hoặc `server_vad` → gửi `type: 'server_vad'`
   - `semantic` → gửi `type: 'semantic_vad'`
   - `disabled` → không gửi `turn_detection`
5. Gọi OpenAI `POST /v1/realtime/sessions` với payload gồm:
   - `model`, `voice`, `instructions`, `temperature`
   - `input_audio_transcription: { model, language }`
   - `input_audio_noise_reduction: { type }`
   - `max_response_output_tokens`
   - `turn_detection` (nếu bật)
6. Parse `client_secret.value` thành `ephemeralKey` trả client.

### 5.2 Lesson context normalization

Repository đang normalize:

- `targetLanguage` về BCP-47
- default `aiConfig.roleName = 'Friendly speaking partner'`
- default `aiConfig.temperature = 0.7`
- lấy `preferredVoiceId` từ language TTS config nếu provider `OPENAI`

### 5.3 Prompt policy hiện tại

Prompt builder enforce:

- in-character roleplay, anti-teacher
- tránh hỏi lặp fact
- natural/warm/playful/witty speaking style
- không dạy theo template kiểu “You can say...”
- kết thúc luôn có farewell tự nhiên

---

## 6) Frontend flow chi tiết

### 6.1 Bật Realtime (toggle ON)

Trong `SpeakingStudio.tsx`, gọi `startRealtime(...)` từ `useSpeakingRealtime`:

1. `speakingApi.getRealtimeSession(lessonId)` lấy bootstrap.
2. Tạo `RTCPeerConnection`.
3. `getUserMedia({ audio: true })` và `addTrack` vào peer.
4. Tạo data channel `oai-events`.
5. Tạo offer SDP + `setLocalDescription`.
6. POST SDP tới `https://api.openai.com/v1/realtime?model=...` với bearer `ephemeralKey`.
7. `setRemoteDescription(answerSdp)`.
8. Chờ data channel open (timeout 8s) trước khi đánh dấu ready.

### 6.2 `dc.onopen` gửi `session.update`

Client hiện gửi cố định:

- `modalities: ['audio', 'text']`
- `input_audio_transcription.model = 'gpt-4o-mini-transcribe'`
- `input_audio_noise_reduction.type = 'far_field'`
- `turn_detection = { type: 'server_vad', threshold: 0.5, prefix_padding_ms: 300, silence_duration_ms: 500, create_response: false }`
- `max_response_output_tokens = 4096`

Sau đó gửi `response.create` để assistant nói greeting turn đầu tiên.

### 6.3 Runtime events mapping

- `response.audio_transcript.done` → append assistant transcript final
- `conversation.item.input_audio_transcription.completed` → append user transcript final + gửi `response.create`
- `conversation.item.input_audio_transcription.failed` → raise warning + vẫn gửi `response.create` fallback
- `response.done` → mark assistant turn complete (không auto-disconnect)
- `error` → map `SessionErrorEvent`

### 6.4 Dừng session

- Chỉ dừng khi user toggle OFF (`stopRealtime`)
- Cleanup gồm close data channel, close peer, stop mic tracks, remove audio element.

---

## 7) Event matrix vận hành

### 7.1 Happy path

1. `session.created`
2. `session.updated`
3. `response.created`
4. `response.done` (assistant greeting xong)
5. `input_audio_buffer.speech_started`
6. `input_audio_buffer.speech_stopped`
7. `input_audio_buffer.committed`
8. `conversation.item.created`
9. `conversation.item.input_audio_transcription.completed`
10. `response.created` / `response.done`

### 7.2 Failure path phổ biến

- `conversation.item.input_audio_transcription.failed`
  - nguyên nhân: quota, audio quality, ASR side errors
  - behavior hiện tại: warning + fallback `response.create` để session không bị đứng

---

## 8) Env cấu hình chuẩn hiện tại

Theo `server/src/config/env.ts` và `server/.env`:

- `OPENAI_REALTIME_MODEL = gpt-realtime-mini-2025-12-15`
- `OPENAI_REALTIME_VOICE = marin`
- `OPENAI_REALTIME_TRANSCRIPT_MODEL = gpt-4o-mini-transcribe`
- `OPENAI_REALTIME_TURN_DETECTION_MODE = normal`
- `OPENAI_REALTIME_TURN_THRESHOLD = 0.5`
- `OPENAI_REALTIME_PREFIX_PADDING_MS = 300`
- `OPENAI_REALTIME_SILENCE_DURATION_MS = 500`
- `OPENAI_REALTIME_NOISE_REDUCTION = far_field`
- `OPENAI_REALTIME_MAX_OUTPUT_TOKENS = 4096`

> Operational note: lỗi `insufficient_quota` từ OpenAI sẽ chặn realtime response dù session có thể vẫn tạo thành công.

---

## 9) Security & compliance notes

- API bootstrap bắt buộc auth JWT.
- OpenAI API key chỉ tồn tại server-side.
- Client chỉ giữ ephemeral key để bắt tay WebRTC.
- Không còn internal speech-coach socket namespace.

---

## 10) Debug checklist

### 10.1 Client-side

- `rawRealtimeEvents` để xác định event stage.
- `lastMicError` để surfacing connect/ASR lỗi.
- telemetry fields: `sessionId`, `voiceId`, `roleName`, `realtimeModel`.

### 10.2 Server-side

- `[SpeakingService] Failed to call OpenAI realtime sessions API`
- `[SpeakingService] OpenAI realtime sessions API returned non-OK`
- `[PromptBuilder] System prompt built`

### 10.3 Triệu chứng nhanh

- Không có lời chào đầu:
  - check `session.created`/`session.updated`
  - check browser autoplay
  - check quota OpenAI
- Có VAD started/stopped nhưng không trả lời:
  - check `conversation.item.input_audio_transcription.failed`

---

## 11) Functional guarantees hiện tại

- ✅ Prompt luôn build server-side theo lesson context.
- ✅ Không expose OpenAI secret key ra client.
- ✅ Session endpoint có auth + validation.
- ✅ Có fallback greeting nếu lesson không có first message.
- ✅ Session không tự ngắt sau farewell; user chủ động tắt.

---

## 12) Out-of-scope

- Legacy Socket.IO speech-coach: đã xóa khỏi runtime.
- Auto-end session theo farewell: đang tắt theo yêu cầu sản phẩm.
- Persist full realtime transcript backend: chưa implement cho WebRTC path.

---

## 13) Sequence tóm tắt

1. User bật Voice Realtime.
2. Admin gọi `GET /api/curriculum/lessons/:lessonId/speaking/session`.
3. Server lấy lesson + build prompt + xin OpenAI session + trả bootstrap.
4. Client tạo WebRTC trực tiếp tới OpenAI bằng ephemeral key.
5. Client gửi `session.update` + `response.create` greeting.
6. OpenAI stream audio/transcript qua data channel.
7. User nói; ASR completed thì client trigger `response.create` cho lượt kế.
8. User bấm tắt để đóng session và cleanup local resources.

