# 🎙️ PLAN: AI Voice Conversation — Luyện Tập Giao Tiếp Với AI

## Tổng quan chức năng

User chọn topic + level → AI sinh 6 scenarios → User chọn scenario → Nhấn bắt đầu →
Cửa sổ chat mở ra với lời chào của AI → Hội thoại bộ đàm (PTT) liên tục → AI tự kết thúc bằng lời chào kết.

### Cơ chế pipeline (tái dụng từ SpeakingStudio/Admin)
```
User giữ mic → MediaRecorder (webm) → POST /api/v1/ai-voice/stt → Whisper STT
→ POST /api/v1/ai-voice/chat → GPT stream (SSE) → onChunk render text + enqueueTTS
→ POST /api/v1/ai-voice/tts → MP3 blob → Audio Queue phát tuần tự
```

---

## Phụ thuộc giữa 2 Agents

```
Phase 1: BE Agent (Độc lập)
Phase 2: FE Agent (Phụ thuộc Phase 1 xong)
Phase 3: BE Agent (Độc lập — scenario generation)
Phase 4: FE Agent (Phụ thuộc Phase 3 xong)
```

---

## 🔧 PHASE 1 — BE Agent: AI Voice Pipeline API

> **Agent:** `be-dev`
> **Branch:** `feat/ai-voice-pipeline`
> **Mục tiêu:** Tạo các endpoints STT / Chat / TTS riêng cho AI Voice (tách biệt với SpeakingStudio của Admin), không yêu cầu `lessonId`, nhận `scenarioId` thay thế.

### 1.1 Zod Validation Schema

**File:** `server/src/validations/ai-voice.validation.ts` **[NEW]**

```typescript
// Zod schemas:
aiVoiceSttSchema        // body: { sessionId: string }, file: audio
aiVoiceChatSchema       // body: { sessionId, scenario, transcript, chatHistory[], level, topic }
aiVoiceTtsSchema        // body: { text: string }
```

**Rules:**
- `sessionId`: UUID format (client tự generate phía FE bằng `crypto.randomUUID()`)
- `transcript`: min 1 char, max 1000 chars
- `chatHistory`: max 50 items
- `level`: enum `['free-level','a1','a2','b1','b2','c1','c2']`
- `topic`: enum `['free-talk','ielts-speaking','travel','office']`

---

### 1.2 Service Layer

**File:** `server/src/services/ai-voice.service.ts` **[NEW]**

```typescript
export const aiVoiceService = {
    // 1. STT: wrap speakingPipelineService.transcribeAudio()
    transcribeAudio(audio: Buffer): Promise<{ transcript: string; durationMs: number }>

    // 2. Chat: build system prompt dựa vào scenario + level
    //    - KHÔNG cần lessonId / DB lookup
    //    - Nhận thẳng { scenario, level, topic, chatHistory, transcript }
    //    - Build prompt bằng aiVoicePromptBuilder (xem 1.3)
    //    - Gọi OpenAI chat.completions.create stream + fallback gpt-4o-mini
    //    - AI tự kết thúc khi > MAX_TURNS (8 turns) bằng cách inject hướng dẫn vào system prompt
    createChatCompletion(params): Promise<ChatCompletionResult>

    // 3. TTS: wrap speakingPipelineService.synthesizeSpeech()
    synthesizeSpeech(text: string): Promise<Response>
}
```

> **Lưu ý quan trọng:** `createChatCompletion` phải inject rule vào system prompt:
> - Khi `chatHistory.length >= MAX_TURNS (8)`: AI bắt buộc kết thúc cuộc trò chuyện bằng lời chào tạm biệt ("It was great talking to you! Goodbye and good luck with your English!")
> - Dùng `env.OPENAI_MODEL` (gpt-5.4-mini), fallback `gpt-4o-mini`

---

### 1.3 Prompt Builder

**File:** `server/src/services/ai-voice-prompt-builder.ts` **[NEW]**

```typescript
// buildSystemPrompt({ scenario, level, topic }) → string
//
// Cấu trúc prompt:
// 1. Vai trò của AI (theo scenario.description — "Bạn là người phục vụ",...)
// 2. Level adaptation: điều chỉnh độ phức tạp từ vựng/ngữ pháp theo CEFR level
// 3. Topic context: du lịch / công sở / ielts / tự do
// 4. Conversation rules:
//    - AI luôn là người mở đầu (được xử lý ở FE, không cần prompt)
//    - Hội thoại tự nhiên, ngắn gọn (2-4 câu mỗi lượt)
//    - Sau MAX_TURNS phải kết thúc bằng lời tạm biệt thân thiện
//    - KHÔNG dạy ngữ pháp, chỉ hội thoại tự nhiên
```

---

### 1.4 Controller

**File:** `server/src/controllers/ai-voice.controller.ts` **[NEW]**

```typescript
// Thin adapter, chỉ gọi service:
aiVoiceController.stt    // POST multipart/form-data → aiVoiceService.transcribeAudio()
aiVoiceController.chat   // POST → SSE stream (giống speaking-pipeline.controller.ts)
aiVoiceController.tts    // POST → pipe audio binary response
```

**SSE format cho `/chat`** (giống speaking-pipeline):
```
event: chunk\ndata: {"text": "Hello..."}\n\n
event: done\ndata: {"latencyMs": 342, "tokenUsage": 87, "model": "...", "isConversationEnded": false}\n\n
```
> Thêm field `isConversationEnded: boolean` vào event `done` để FE biết AI đã kết thúc.

---

### 1.5 Rate Limiting

**File:** `server/src/middlewares/ai-voice-rate-limit.middleware.ts` **[NEW]**

```typescript
// Tương tự speaking-pipeline-rate-limit.middleware.ts:
aiVoiceSttRateLimit   // 20 req / 1 phút / IP
aiVoiceChatRateLimit  // 30 req / 1 phút / IP
aiVoiceTtsRateLimit   // 40 req / 1 phút / IP
```

---

### 1.6 Routes + Auth

**File:** `server/src/routes/ai-voice.route.ts` **[NEW]**

```typescript
router.use(protect);  // Yêu cầu đăng nhập, KHÔNG restrictTo — mọi role user đều dùng được

router.post('/stt',  aiVoiceSttRateLimit,  upload.single('audio'), validate(aiVoiceSttSchema),  aiVoiceController.stt);
router.post('/chat', aiVoiceChatRateLimit, validate(aiVoiceChatSchema), aiVoiceController.chat);
router.post('/tts',  aiVoiceTtsRateLimit,  validate(aiVoiceTtsSchema),  aiVoiceController.tts);
```

> Đăng ký vào `app.ts`: `app.use('/api/v1/ai-voice', aiVoiceRouter);`

---

### 1.7 Swagger JSDoc

Thêm JSDoc cho 3 endpoints theo chuẩn của dự án.

### ✅ Checklist Phase 1 (BE Agent)

- [ ] `server/src/validations/ai-voice.validation.ts`
- [ ] `server/src/services/ai-voice-prompt-builder.ts`
- [ ] `server/src/services/ai-voice.service.ts`
- [ ] `server/src/controllers/ai-voice.controller.ts`
- [ ] `server/src/middlewares/ai-voice-rate-limit.middleware.ts`
- [ ] `server/src/routes/ai-voice.route.ts`
- [ ] Đăng ký route trong `server/src/app.ts`
- [ ] Swagger JSDoc cho 3 endpoints

---

## 🎨 PHASE 2 — FE Agent: Voice Chat UI

> **Agent:** `fe-dev`
> **Branch:** `feat/ai-voice-chat-ui`
> **Mục tiêu:** Port pipeline của SpeakingStudio → `ai-voice` feature ở client, adapt cho context không cần `lessonId`. Cơ chế bộ đàm PTT (Push-to-Talk), AI nói trước, FE detect `isConversationEnded` để tự khóa mic.

**Prerequisite:** Phase 1 (BE) phải xong và deploy trước.

### 2.1 Types

**File:** `client/src/features/dashboard/ai-voice/types/ai-voice.types.ts` **[NEW]**

```typescript
export type PttStatus = 'idle' | 'recording' | 'processing' | 'ai_speaking' | 'error' | 'ended';

export interface AiVoiceChatMessage {
    id: string;
    role: 'assistant' | 'user';
    content: string;
    createdAt: number;
}

export interface AiVoiceScenario {
    id: string;
    title: string;
    description: string;  // "Bạn là người phục vụ..."
}

export interface ChatHistoryItem {
    role: 'user' | 'assistant';
    content: string;
}
```

---

### 2.2 API Service

**File:** `client/src/features/dashboard/ai-voice/api/ai-voice.service.ts` **[NEW]**

```typescript
// Axios instance từ lib/axios.ts
// BASE: /api/v1/ai-voice

// STT: POST multipart/form-data
stt(audio: Blob, sessionId: string): Promise<{ transcript: string; durationMs: number }>

// TTS: POST → ArrayBuffer (không qua TanStack Query, streaming trực tiếp)
tts(text: string): Promise<Blob>

// Chat: POST → ReadableStream (SSE)
// Dùng fetch trực tiếp (như useOpenAiPipeline trong Admin) vì axios không support streaming
chat(params: AiVoiceChatParams): Promise<Response>
```

---

### 2.3 Custom Hooks (Port & Adapt từ Admin)

#### Hook 1: `usePttRecorder`

**File:** `client/src/features/dashboard/ai-voice/hooks/use-ptt-recorder.ts` **[NEW]**

> Port gần như nguyên từ `admin/...SpeakingStudio/hooks/use-ptt-recorder.ts`.
> Giữ nguyên: MIN_DURATION_MS (1500), MAX_DURATION_MS (30000), auto-stop timer.

#### Hook 2: `useAiVoicePipeline`

**File:** `client/src/features/dashboard/ai-voice/hooks/use-ai-voice-pipeline.ts` **[NEW]**

> Adapt từ `admin/...SpeakingStudio/hooks/use-openai-pipeline.ts`.
> Thay đổi:
> - Endpoint: `/api/v1/ai-voice/stt`, `/api/v1/ai-voice/chat`, `/api/v1/ai-voice/tts`
> - Không cần `lessonId` — truyền `sessionId` (UUID)
> - `streamReply` nhận thêm `{ scenario, level, topic }` để gửi lên `/chat`
> - Parse thêm field `isConversationEnded` từ event `done` → trả về trong `LlmResult`
> - Audio unlock, queue, interrupt: giữ nguyên logic

```typescript
interface UseAiVoicePipelineReturn {
    transcribe(audio: Blob, sessionId: string): Promise<SttResult>
    streamReply(params: AiVoiceStreamReplyParams): Promise<AiVoiceLlmResult>
    playDirectly(text: string): Promise<void>
    waitForAudio(): Promise<void>
    interrupt(): void
    unlockAudio(): void
}

interface AiVoiceLlmResult {
    reply: string
    latencyMs: number
    tokenUsage: number
    model: string
    isConversationEnded: boolean  // NEW
}
```

#### Hook 3: `useAiVoiceSession` ⭐ (Hook chính)

**File:** `client/src/features/dashboard/ai-voice/hooks/use-ai-voice-session.ts` **[NEW]**

> Adapt từ `admin/...SpeakingStudio/hooks/use-coach-session.ts`.
> Thay đổi chính:

```typescript
interface UseAiVoiceSessionParams {
    scenario: AiVoiceScenario;
    level: string;
    topic: string;
    onConversationEnd?: () => void;  // Callback khi AI kết thúc
}

interface UseAiVoiceSessionReturn {
    pttStatus: PttStatus;
    chatMessages: AiVoiceChatMessage[];
    isConversationEnded: boolean;
    sessionId: string;
    startSession(): Promise<void>;   // Phát lời chào mở đầu của AI
    handleToggleMic(): Promise<void>;
    resetSession(): void;
}
```

`startSession()` logic:
1. Unlock audio (`pipeline.unlockAudio()`)
2. Gọi `/chat` với `chatHistory: []` và `transcript: '__START__'` (hoặc signal đặt biệt)
3. AI trả về câu mở đầu → phát TTS → render vào chatMessages với role `assistant`

> **Lưu ý:** Lần đầu (`__START__`), server nhận ra đây là lượt mở đầu → trả về câu chào + câu mở màn phù hợp với scenario.

`processTurn()` logic (khi user submit audio):
1. STT → render user message
2. gọi streamReply → render assistant message streaming
3. Nếu `isConversationEnded === true` → setPttStatus('ended') + gọi `onConversationEnd()`

---

### 2.4 Components

#### Component 1: `MicButton` (PTT Button dành cho Client)

**File:** `client/src/features/dashboard/ai-voice/components/mic-button/mic-button.tsx` **[NEW]**
**File:** `client/src/features/dashboard/ai-voice/components/mic-button/mic-button.module.css` **[NEW]**

> Thay thế nút mic hiện tại (static) trong `chat-window.tsx` bằng component có state.
> Các trạng thái visual (theo CSS Modules + CSS Variables):

| PttStatus | Visual |
|---|---|
| `idle` | Nền `--dark-green`, icon mic |
| `recording` | Nền đỏ, pulse animation, icon mic-off |
| `processing` | Nền amber, spinner |
| `ai_speaking` | Nền xanh dương, icon wave/bot, disabled |
| `error` | Nền đỏ, icon alert |
| `ended` | Hidden / disabled hoàn toàn |

**CSS:** Sử dụng CSS Modules + CSS Variables. Animation `@keyframes pulse` dùng GSAP hoặc CSS animation.

#### Component 2: Cập nhật `ChatWindow`

**File:** `client/src/features/dashboard/ai-voice/components/chat-window/chat-window.tsx` **[MODIFY]**

Nhận thêm props:
```typescript
interface ChatWindowProps {
    scenario: AiVoiceScenario;
    level: string;
    topic: string;
    onClose: () => void;
}
```

Tích hợp `useAiVoiceSession` hook bên trong component.

Cấu trúc render:
```
<section chatWindow>
    <div closeRow> ... </div>
    <div messageList ref={scrollRef}>
        // Tin nhắn đầu: scenario.description (role: system-info)
        // Tin nhắn thứ 2+: chatMessages từ hook
        // Auto-scroll xuống khi chatMessages thay đổi (useLayoutEffect)
    </div>
    {isConversationEnded && <EndedBanner />}
    <div micControlArea>
        <MicButton status={pttStatus} onToggle={handleToggleMic} />
    </div>
</section>
```

> **Nút translate** (như SandboxChatPanel): Giữ lại UI đã có (icon dịch), implement dùng Google Translate free endpoint tương tự `SandboxChatPanel.tsx`.

---

### 2.5 Cập nhật AIVoice Page

**File:** `client/src/features/dashboard/ai-voice/pages/AIVoice.tsx` **[MODIFY]**

Thay đổi:
- `ChatWindow` nhận `scenario`, `level`, `topic` thay vì `scenarioDescription`
- Xoá mock `SCENARIO_OPTIONS` — dữ liệu thật sẽ đến từ Phase 4 (generate by AI)
- Tạm thời giữ mock data đến khi Phase 3+4 hoàn thành

---

### ✅ Checklist Phase 2 (FE Agent)

- [ ] `features/dashboard/ai-voice/types/ai-voice.types.ts`
- [ ] `features/dashboard/ai-voice/api/ai-voice.service.ts`
- [ ] `features/dashboard/ai-voice/hooks/use-ptt-recorder.ts`
- [ ] `features/dashboard/ai-voice/hooks/use-ai-voice-pipeline.ts`
- [ ] `features/dashboard/ai-voice/hooks/use-ai-voice-session.ts`
- [ ] `features/dashboard/ai-voice/components/mic-button/mic-button.tsx` + `.module.css`
- [ ] `features/dashboard/ai-voice/components/chat-window/chat-window.tsx` (MODIFY)
- [ ] `features/dashboard/ai-voice/pages/AIVoice.tsx` (MODIFY — dùng tạm mock data)

---

## 🔧 PHASE 3 — BE Agent: Scenario Generation API

> **Agent:** `be-dev`
> **Branch:** `feat/ai-voice-scenario-gen`
> **Mục tiêu:** Endpoint sinh 6 scenarios từ AI dựa vào topic + level.

### 3.1 Zod Validation

**File:** `server/src/validations/ai-voice.validation.ts` **[MODIFY — thêm schema]**

```typescript
aiVoiceGenerateScenariosSchema = z.object({
    body: z.object({
        topic: z.enum(['free-talk', 'ielts-speaking', 'travel', 'office']),
        level: z.enum(['free-level', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2']),
    })
})
```

---

### 3.2 Service

**File:** `server/src/services/ai-voice.service.ts` **[MODIFY — thêm method]**

```typescript
generateScenarios(topic: string, level: string): Promise<AiVoiceScenario[]>
```

**Logic:**
- Gọi OpenAI `chat.completions.create` (NON-stream, `response_format: { type: 'json_object' }`)
- Model: `env.OPENAI_MODEL` (gpt-5.4-mini)
- Prompt yêu cầu AI trả về JSON:
  ```json
  {
    "scenarios": [
      { "id": "uuid", "title": "...", "description": "Bạn là ..." }
    ]
  }
  ```
- Luôn trả về đúng 6 scenarios, mô tả theo format "Bạn là [vai trò]..."
- Validate output bằng Zod trước khi trả về client

---

### 3.3 Controller + Route

**File:** `server/src/controllers/ai-voice.controller.ts` **[MODIFY — thêm handler]**

```typescript
aiVoiceController.generateScenarios  // POST /api/v1/ai-voice/generate-scenarios
```

**File:** `server/src/routes/ai-voice.route.ts` **[MODIFY]**

```typescript
router.post(
    '/generate-scenarios',
    aiVoiceGenerateRateLimit,  // 10 req / 1 phút / user
    validate(aiVoiceGenerateScenariosSchema),
    aiVoiceController.generateScenarios,
);
```

---

### ✅ Checklist Phase 3 (BE Agent)

- [ ] Cập nhật `ai-voice.validation.ts` — thêm `aiVoiceGenerateScenariosSchema`
- [ ] Cập nhật `ai-voice.service.ts` — thêm `generateScenarios()`
- [ ] Cập nhật `ai-voice.controller.ts` — thêm handler `generateScenarios`
- [ ] Cập nhật `ai-voice.route.ts` — thêm route + rate limit
- [ ] Swagger JSDoc cho endpoint mới

---

## 🎨 PHASE 4 — FE Agent: Real Scenario Generation

> **Agent:** `fe-dev`
> **Branch:** `feat/ai-voice-scenario-gen-ui`
> **Mục tiêu:** Thay mock data `SCENARIO_OPTIONS` bằng TanStack Query mutation gọi `/generate-scenarios`.

**Prerequisite:** Phase 3 (BE) phải xong.

### 4.1 Cập nhật API Service

**File:** `client/src/features/dashboard/ai-voice/api/ai-voice.service.ts` **[MODIFY]**

```typescript
// Thêm:
generateScenarios(topic: string, level: string): Promise<AiVoiceScenario[]>
```

---

### 4.2 TanStack Query Mutation Hook

**File:** `client/src/features/dashboard/ai-voice/hooks/use-generate-scenarios.ts` **[NEW]**

```typescript
export const useGenerateScenarios = () => {
    return useMutation({
        mutationFn: ({ topic, level }: { topic: string; level: string }) =>
            aiVoiceService.generateScenarios(topic, level),
    });
};
```

---

### 4.3 Cập nhật AIVoice Page

**File:** `client/src/features/dashboard/ai-voice/pages/AIVoice.tsx` **[MODIFY]**

Thay đổi logic:

```
useEffect([selectedTopicId, selectedLevelId]):
    - Khi cả 2 được chọn → clear scenarios cũ → setScenarioState('loading')
    - Gọi mutation.mutate({ topic, level })
    - onSuccess → setScenarioState('ready'), scenarios = data
    - onError → setScenarioState('error') + toast

ScenarioSelector:
    - options = scenarios từ mutation (thay vì SCENARIO_OPTIONS mock)
```

> **Xóa hoàn toàn** `SCENARIO_OPTIONS` mock constant.

**Loading state:** Giữ nguyên UI loading spinner hiện tại (`AI đang tạo tình huống...`).

**Error state:** Thêm retry button khi generation thất bại.

---

### ✅ Checklist Phase 4 (FE Agent)

- [ ] Cập nhật `ai-voice.service.ts` — thêm `generateScenarios()`
- [ ] Tạo `hooks/use-generate-scenarios.ts`
- [ ] Cập nhật `pages/AIVoice.tsx`:
  - [ ] Xóa `SCENARIO_OPTIONS` mock
  - [ ] Tích hợp `useGenerateScenarios` mutation
  - [ ] Loading state khi đang generate
  - [ ] Error state + retry button

---

## 📐 API Contract (BE ↔ FE)

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/api/v1/ai-voice/generate-scenarios` | 🔒 user | `{topic, level}` | `{scenarios: AiVoiceScenario[]}` |
| POST | `/api/v1/ai-voice/stt` | 🔒 user | `FormData {audio, sessionId}` | `{transcript, durationMs}` |
| POST | `/api/v1/ai-voice/chat` | 🔒 user | `{sessionId, scenario, transcript, chatHistory, level, topic}` | `SSE stream` |
| POST | `/api/v1/ai-voice/tts` | 🔒 user | `{text}` | `binary audio/mp3` |

### SSE Event Format (`/chat`):
```
event: chunk
data: {"text": "Hello there!"}

event: done
data: {"latencyMs": 342, "tokenUsage": 87, "model": "gpt-5.4-mini-...", "isConversationEnded": false}
```

---

## 🔑 KEY DECISIONS & CONSTRAINTS

### Quyết định thiết kế
1. **Không dùng `lessonId`** cho AI Voice — context được truyền trực tiếp qua request body (scenario + level + topic). Điều này giúp tính năng hoạt động mà không cần tạo bất kỳ document nào trong DB.
2. **`sessionId`** do FE tự sinh (`crypto.randomUUID()`) để phân biệt session, server không lưu session state.
3. **Tái dụng pipeline** của SpeakingStudio (STT → LLM stream → TTS queue) nhưng đặt trong feature riêng (không cross-import từ admin).
4. **AI kết thúc cuộc hội thoại** bằng cách inject rule vào system prompt: khi `chatHistory.length >= 8` lượt, AI phải kết thúc bằng lời tạm biệt. FE detect qua `isConversationEnded: true` trong SSE event `done`.
5. **Auth:** Endpoint AI Voice yêu cầu đăng nhập (`protect`) nhưng không phân biệt role — tất cả user đều dùng được (khác Admin Sandbox yêu cầu `admin`/`content_creator`).

### Constraints kỹ thuật
- **No `any` types** — strict TypeScript theo rules
- **CSS Modules** cho tất cả client components — không dùng Tailwind ở client
- **TanStack Query** cho `generateScenarios` (server state), `useState` cho session/chat state (local state)
- **Zustand không cần** ở đây — state toàn gói gọn trong `ChatWindow` + hooks cục bộ
- **`console.log` BANNED** ở server — dùng `Logger.info/error`
- **`catchAsync`** wrap toàn bộ async controllers
- Rate limit riêng để tránh abuse

---

## 🔢 Thứ tự triển khai

```
Phase 1 (BE) → Phase 2 (FE) → Phase 3 (BE) → Phase 4 (FE)
```

Trong thực tế, Phase 1 và 3 có thể làm song song nếu team BE có 2 người;
FE có thể làm Phase 2 song song với Phase 3 (vì Phase 2 chỉ cần Phase 1).

---

*Plan created: 2026-04-20*
*Feature owner: AI Voice Conversation*
