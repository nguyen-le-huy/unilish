# 🏗️ TÀI LIỆU KIẾN TRÚC HỆ THỐNG AI SPEAKING COACH (UNILISH REAL-TIME SPEECH)

**Phiên bản:** 2.0.0 | **Phân hệ:** AI Services / Voice & Speech Processing

**Mục tiêu:** Định hình kiến trúc lõi cho Trợ lý Giao tiếp 1:1 (Real-time AI Coach) và Hệ thống Chấm điểm Phát âm (Pronunciation Assessment). Đảm bảo giao tiếp giọng nói hai chiều (Full-duplex) với độ trễ siêu thấp (<500ms) và phân tích lỗi phát âm đến từng âm vị (Phoneme-level).

---

## 1. CẤU TRÚC DỮ LIỆU & QUẢN LÝ PHIÊN (SESSION & DATA TOPOLOGY)

Khác với RAG lưu trữ vector tĩnh, hệ thống Speaking xử lý các luồng dữ liệu động (Data Streams) và trạng thái kết nối (Stateful Connections). Dữ liệu được chia làm 2 lớp: In-memory (Lưu trữ tạm thời tốc độ cao) và Persistent (Lưu trữ vĩnh viễn).

| **Loại Dữ liệu** | **Công nghệ lưu trữ** | **Mục đích & Đặc tả cấu trúc** |
| --- | --- | --- |
| **Active Session State** | Redis (In-memory) | Quản lý phiên gọi (Call Session). Chứa `userId`, `lessonId`, lịch sử hội thoại tạm thời (Context buffer) và trạng thái kết nối (Connected/Disconnected) để tự động phục hồi khi rớt mạng. |
| **Audio Blobs / Streams** | Caching Layer $\rightarrow$ Cloudflare R2 | Lưu trữ luồng âm thanh thô (Raw Audio) định dạng `.webm` hoặc `.wav`. Chỉ ghi xuống R2 sau khi kết thúc phiên để làm bằng chứng chấm điểm hoặc khi user khiếu nại. |
| **Pronunciation Assessment** | MongoDB (Persistent) | Lưu kết quả chấm điểm chi tiết. Schema bao gồm: Điểm tổng (Overall), Trôi chảy (Fluency), Ngữ điệu (Prosody), và mảng chi tiết từng từ sai (`mispronounced_words`: [từ, âm vị sai, âm vị đúng]). |

---

## 2. KIẾN TRÚC XỬ LÝ ÂM THANH THỜI GIAN THỰC (DUAL-TRACK PIPELINE)

Để đảm bảo AI vừa có thể "nói chuyện tự nhiên" vừa "chấm điểm khắt khe", luồng âm thanh đầu vào (User Audio) được nhân bản và xử lý song song (Parallel Processing) theo kiến trúc **Dual-Track**.

### Giai đoạn 1: Ingestion & Streaming (Tiếp nhận & Truyền phát)

- **Giao thức kết nối:** Sử dụng **WebRTC** (thông qua LiveKit) hoặc **WebSocket** để truyền phát luồng âm thanh hai chiều (Bi-directional streaming). Bỏ qua hoàn toàn HTTP Polling do độ trễ lớn.
- **Audio Chunking:** Client cắt âm thanh thành các chunk nhỏ (ví dụ 100ms - 250ms) gửi liên tục lên Server để tạo cảm giác thời gian thực (Real-time).

### Giai đoạn 2: Track 1 - Conversational Engine (Luồng Đối đáp)

- **Mục tiêu:** Đảm bảo độ trễ phản hồi nhanh nhất có thể (<500ms) để cuộc hội thoại không bị sượng.
- **Công nghệ:** Sử dụng **OpenAI Realtime API** (Speech-to-Speech model). Bỏ qua mô hình cũ (STT $\rightarrow$ LLM text $\rightarrow$ TTS) vốn mất tới 2-3 giây.
- **Context Injection:** Trước khi mở mic, Backend bơm `systemPrompt` (Ví dụ: *"Bạn là nhân viên Hải quan khó tính ở sân bay..."*) và `taughtConcepts` (Từ vựng mục tiêu) vào phiên kết nối của OpenAI để ép AI đóng vai chuẩn xác.

### Giai đoạn 3: Track 2 - Assessment Engine (Luồng Chấm điểm)

- **Mục tiêu:** Phân tích kỹ thuật học thuật, không cần phản hồi ngay lập tức (Có thể chạy ngầm và trả kết quả sau khi user nói xong câu).
- **Công nghệ:** Stream chunk âm thanh của user sang **Azure AI Speech (Pronunciation Assessment API)**.
- **Nhiệm vụ:** Chấm điểm dựa trên kịch bản tham chiếu (Reference Text) hoặc chấm tự do (Unscripted). Đánh giá 4 tiêu chí: Độ chính xác (Accuracy), Trôi chảy (Fluency), Hoàn chỉnh (Completeness), và Ngữ điệu (Prosody).

### Giai đoạn 4: Feedback Synchronization (Đồng bộ Phản hồi)

- Backend nhận kết quả từ Azure (Track 2) và nội dung đối đáp từ OpenAI (Track 1).
- Đóng gói thành chuẩn JSON (Event-driven data) và bắn qua WebSocket về Client.
- UI Client sẽ tự động render: AI trả lời bằng giọng nói (Track 1) $\rightarrow$ Hiện bảng phân tích từ nào phát âm sai màu đỏ (Track 2).

---

## 3. THIẾT KẾ CẤU TRÚC MÃ NGUỒN (CODEBASE DIRECTORY)

Module `speech-coach` được thiết kế độc lập, áp dụng mô hình **Event-Driven Architecture (Kiến trúc hướng sự kiện)**:

```bash
src/services/speech-coach/
├── transports/                 # Lớp Giao tiếp Mạng (Network Layer)
│   ├── webrtc.manager.ts       # Quản lý kết nối WebRTC (LiveKit/PeerJS)
│   └── socket.handler.ts       # Xử lý các event (Join room, Audio chunk, Disconnect)
│
├── engines/                    # Các lõi xử lý AI (Core Engines)
│   ├── conversation/           # Track 1: OpenAI Realtime Integration
│   │   └── openai-realtime.ts  
│   └── assessment/             # Track 2: Azure AI Speech Integration
│       └── azure-evaluator.ts  
│
├── sessions/                   # Quản lý Trạng thái (State Management)
│   └── session.manager.ts      # Redis CRUD cho Active Calls
│
├── prompts/                    # Quản lý Persona của AI Coach
│   ├── personas/               # (Airport Staff, IELTS Examiner, Business Client)
│   └── prompt-builder.ts       # Logic ghép Context Seed vào Prompt
│
├── workers/                    # Tác vụ nền (Background Jobs)
│   └── audio-archiver.ts       # Upload audio backup lên R2 Cloudflare sau khi kết thúc
│
└── speech.service.ts           # Facade Pattern: Entry point điều phối toàn bộ module
```

---

## 4. TIÊU CHUẨN CÔNG NGHỆ & VẬN HÀNH (TECH STACK & NFRs)

Module Voice AI ngốn tài nguyên và chi phí bậc nhất trong hệ thống. Việc tuân thủ các chỉ số phi chức năng (NFRs) là sống còn.

### Tech Stack Lõi

- **Streaming Protocol:** WebRTC (Ưu tiên dùng cơ sở hạ tầng của **LiveKit** để scale số lượng phòng gọi mà không chết Server Node.js).
- **Conversational AI:** OpenAI Realtime API.
- **Scoring AI:** Azure Cognitive Services (Speech).
- **In-memory Store:** Redis (Pub/Sub & Session Storage).

### Non-Functional Requirements (Tiêu chuẩn Doanh nghiệp)

1. **Độ trễ (Latency SLA):**
    - Độ trễ khứ hồi giọng nói (Voice-to-Voice Turnaround Time): **< 500ms** (Mức lý tưởng của giao tiếp con người).
    - Độ trễ trả về điểm số phát âm (từ lúc kết thúc câu nói): **< 1500ms**.
2. **Quản trị Chi phí (Cost Intelligence & Observability):**
    - Cài đặt **Circuit Breaker (Cầu dao tự động):** Nếu user giữ mic im lặng quá 15 giây, hệ thống tự động ngắt kết nối OpenAI để tránh bị tính tiền token âm thanh trống (Silence token drain).
    - Log realtime số phút Audio/Token vào hệ thống Analytics để tính toán biên lợi nhuận (Unit Economics) trên mỗi user Freemium vs Premium.
3. **Khả năng Chịu lỗi (Fault Tolerance):**
    - Fallback mechanism: Nếu OpenAI Realtime API bị sập (Downtime), hệ thống tự động giáng cấp (Downgrade) về luồng truyền thống: `Browser STT -> Text -> GPT-4o-mini -> Audio TTS`. Trải nghiệm chậm hơn nhưng App không bị chết.
    - Cơ chế tự động khôi phục ngữ cảnh (Context Recovery) khi mạng 4G/Wifi của học viên bị chập chờn.