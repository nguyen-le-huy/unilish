# IMPLEMENTATION PLAN — AI SPEAKING COACH V1 (CONVERSATIONAL CORE)

## 1) Mục tiêu & phạm vi

## Mục tiêu duy nhất
Triển khai lại module speaking realtime theo kiến trúc tối giản:

`User Audio -> OpenAI Realtime Mini -> AI Audio`

Đảm bảo:
- Hội thoại tự nhiên theo đúng ngữ cảnh bài học speaking
- Độ trễ thấp, trải nghiệm mượt
- Không có pipeline STT -> LLM text -> TTS thủ công

## Ngoài phạm vi V1 (không làm)
- Không chấm điểm phát âm/fluency/prosody
- Không post-call grading
- Không audio archiving lên R2
- Không dashboard feedback sau cuộc gọi

---

## 2) Baseline cấu hình bắt buộc (phase V1)

Server đọc từ env và apply 100% khi mở realtime session:
- `OPENAI_REALTIME_MODEL=gpt-realtime-mini`
- `OPENAI_REALTIME_VOICE=marin`
- `OPENAI_REALTIME_TURN_DETECTION_MODE=normal`
- `OPENAI_REALTIME_TURN_THRESHOLD=0.5`
- `OPENAI_REALTIME_PREFIX_PADDING_MS=300`
- `OPENAI_REALTIME_SILENCE_DURATION_MS=500`
- `OPENAI_REALTIME_IDLE_TIMEOUT_MS=` (disable)
- `OPENAI_REALTIME_TRANSCRIPT_MODEL=gpt-4o-mini-transcribe`
- `OPENAI_REALTIME_NOISE_REDUCTION=far_field`
- `OPENAI_REALTIME_MAX_OUTPUT_TOKENS=4096`

Quy tắc:
- Client/Admin không override model/voice trong runtime V1
- Toàn bộ cấu hình Realtime do backend kiểm soát

---

## 3) Kiến trúc đích V1

## Data topology tối thiểu
- Redis: active session state (`userId`, `lessonId`, realtime session state), TTL 30 phút
- MongoDB: lesson/unit context để build system prompt (`aiConfig`, `taughtConcepts`, `unit.contextSeed`)

## Core runtime flow
1. Client gửi `start` với `lessonId`
2. Backend load lesson + unit context từ Mongo
3. `prompt-builder` compose system prompt theo lesson
4. Backend mở OpenAI Realtime session (model mini + Marin)
5. Inject `system instructions` + `firstMessage`
6. Stream audio hai chiều liên tục đến khi user end
7. End session: đóng kết nối, xóa state Redis

---

## 4) Quy tắc System Instructions (theo bài học)

System instruction **không dùng global cố định**. Phải lấy theo lesson hiện tại:
- Nguồn chính: `lesson.content.aiConfig.systemInstruction`
- Nguồn bổ sung: `unit.contextSeed.scenario`, `lesson.taughtConcepts`, `requiredKeywords`, `roleName`
- Fallback khi thiếu dữ liệu: template persona trong `prompts/personas/*`

Thứ tự compose prompt:
1. Lesson systemInstruction
2. Scenario context từ Unit
3. Target concepts/keywords
4. Conversational constraints (ngắn, đúng vai, không lecture)

---

## 5) Thiết kế event contract V1 (gọn)

## Inbound (Client -> Server)
- `speaking.session.start`
- `speaking.audio.chunk`
- `speaking.session.end`

## Outbound (Server -> Client)
- `speaking.session.started`
- `speaking.ai.response.chunk` (audio/text delta)
- `speaking.session.error`
- `speaking.session.ended`

## Transcript ở V1
- Nếu Realtime model trả transcript events, bật luôn để hiển thị live
- Chỉ cache tạm Redis/memory theo session (ephemeral)
- Không lưu Mongo dài hạn trong V1

---

## 6) Kế hoạch triển khai theo file (server-first)

## 6.1 Giữ lại (refactor, không xóa module)
- `server/src/services/speech-coach/transports/socket.handler.ts`
- `server/src/services/speech-coach/sessions/session.manager.ts`
- `server/src/services/speech-coach/prompts/prompt-builder.ts`
- `server/src/services/speech-coach/speech.service.ts`

## 6.2 Viết lại lõi realtime
1. `engines/conversation/openai-realtime.ts`
   - Bỏ stub, implement kết nối thực OpenAI Realtime WS
   - Quản lý lifecycle theo `sessionId`
   - Forward audio chunk và nhận audio response events
   - Parse transcript events (nếu có)

2. `orchestrators/start-speaking-session.orchestrator.ts`
   - Chỉ làm: guard session, load context, build prompt, init realtime, emit started
   - Không assessment logic

3. `orchestrators/process-audio-chunk.orchestrator.ts`
   - Chỉ relay audio chunk sang realtime engine
   - Không transcribe cục bộ, không fallback text-chat pipeline

4. `orchestrators/finalize-speaking-session.orchestrator.ts`
   - Đóng realtime connection
   - Cleanup Redis session state
   - Emit session ended

5. `contracts/events.contract.ts` + `transports/event-emitter.ts`
   - Tinh gọn payload cho V1 conversational-only
   - Transcript events để optional

## 6.3 Đánh dấu deferred cho V2
- `engines/assessment/*`
- `services/post-call-grading.service.ts`
- `persistence/speaking-result.writer.ts`
- `workers/audio-archiver.ts`

---

## 7) Kế hoạch triển khai admin (SpeakingStudio)

1. `hooks/use-speaking-realtime.ts`
- Chuẩn hóa flow start/stream/end theo contracts V1
- Cleanup socket/media recorder an toàn

2. `lib/speaking-events.ts`, `types/speaking.types.ts`
- Đồng bộ event names/payload V1
- Transcript event type để optional

3. `components/Sandbox/*`
- Hiển thị realtime status + AI chunks
- Nếu có transcript model events thì hiển thị live

4. `components/DynamicEditors/OpenAIConfigEditor.tsx`
- Runtime voice/model ở sandbox lấy từ server env
- Tránh cho override làm lệch môi trường production-like

---

## 8) NFRs V1 (theo mô tả)

- Voice latency mục tiêu: `< 500ms` (best-effort theo provider/network)
- Silence auto cutoff: 15 giây im lặng thì end session
- Session TTL: 30 phút (Redis auto cleanup)
- Nếu OpenAI lỗi: trả lỗi rõ ràng qua `speaking.session.error`, không crash app

---

## 9) Kế hoạch thực thi theo giai đoạn

## Giai đoạn A — Realtime engine core
- Implement `openai-realtime.ts` + wiring `start session`
- Kết quả: AI nói được first message bằng Marin

## Giai đoạn B — Full duplex audio relay
- Refactor `process-audio-chunk` thành relay-only
- Kết quả: user nói và AI đáp realtime ổn định

## Giai đoạn C — Transcript optional
- Bật parse transcript events khi provider trả về
- Kết quả: UI thấy transcript live (nếu có)

## Giai đoạn D — Hardening
- Timeout, retry, circuit-breaker, structured logs
- Kết quả: sẵn sàng internal rollout

---

## 10) Test plan V1

## Unit
- Prompt builder compose đúng theo lesson context
- Realtime event parser map đúng event outbound

## Integration
- `session.start -> session.started`
- `audio.chunk -> ai.response.chunk`
- `session.end -> session.ended`
- Provider failure -> `session.error`

## Smoke (Admin sandbox)
- Start/end nhiều lần không leak
- Giọng đúng Marin
- AI giữ đúng persona theo lesson
- Transcript hiển thị khi model cung cấp

---

## 11) Definition of Done

1. Một pipeline duy nhất: audio user vào realtime mini, audio AI trả về
2. System prompt căn cứ theo lesson/unit context của bài đang học
3. Voice runtime đúng `marin` theo env
4. Không còn dependency vào assessment trong runtime V1
5. Có xử lý lỗi/session cleanup rõ ràng
6. Transcript live hoạt động ở chế độ optional khi provider hỗ trợ
7. Code tuân thủ kiến trúc service-repository, strict typing, Zod validation, logger chuẩn
