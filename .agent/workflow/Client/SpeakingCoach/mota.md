# AI Speaking Coach — Bài trình bày với HR / Nhà tuyển dụng

---

## Mở đầu — Giới thiệu tính năng (30 giây)

> *"Tôi đã xây dựng một tính năng tên là AI Speaking Coach — về cơ bản đó là một người bạn luyện nói tiếng Anh được mô phỏng bằng AI, hoạt động hoàn toàn theo thời gian thực. Người dùng nói vào micro, AI nghe hiểu rồi đáp lại bằng giọng nói — giống như đang nói chuyện với một người thật, nhưng người đó lại là một nhân vật được lập trình sẵn theo từng kịch bản học tập như: xin việc, thông quan tại sân bay, đặt phòng khách sạn..."*

---

## Vấn đề tôi giải quyết

Học nói tiếng Anh có một nghịch lý rất lớn: **bạn cần được nói thật nhiều để giỏi, nhưng lại không có ai để nói cùng.** Tìm gia sư thì tốn tiền, học với app thì chỉ đọc/chọn đáp án chứ không thực sự "giao tiếp".

Tôi muốn tạo ra trải nghiệm gần nhất với việc nói chuyện với người thật — có hỏi đáp, có phản hồi tức thì, và đặc biệt là **biết bạn đang phát âm sai ở đâu**.

---

## Tôi đã làm gì — Giải thích kiến trúc (1–2 phút)

Toàn bộ pipeline tôi xây từ đầu, gồm 3 tầng làm việc song song với nhau:

### **Tầng 1 — Người dùng nói, máy nghe hiểu**

Khi người dùng nhấn giữ nút micro trên giao diện (Push-To-Talk), trình duyệt bắt đầu thu âm bằng `MediaRecorder API`. Khi thả tay ra, file âm thanh được gửi ngầm lên backend, xử lý qua **OpenAI Whisper** để chuyển thành văn bản — gọi là STT (Speech-to-Text). Toàn bộ bước này mất khoảng 0.5 đến 1 giây.

### **Tầng 2 — AI phản hồi thông minh, phát tiếng ngay**

Sau khi có văn bản, tôi gửi nó vào **GPT-4o** kèm theo toàn bộ lịch sử hội thoại. GPT không chờ nghĩ xong rồi mới trả lời — nó trả về từng chữ một theo chuẩn Server-Sent Events, gần giống kiểu ChatGPT gõ từng chữ vậy.

Điểm tôi tự hào nhất: **tôi không đợi AI nói xong rồi mới đọc**. Thay vào đó, cứ mỗi khi AI hoàn thành được một câu đầy đủ — có dấu chấm, dấu hỏi, hay dấu chấm than — tôi lập tức tách câu đó ra, gửi lên API Text-to-Speech để lấy file âm thanh, và phát ngay. Trong khi câu đầu đang vang lên loa, câu thứ hai đã được tải về sẵn sàng phát tiếp. Kết quả là người dùng nghe AI phản hồi trong vòng chưa đến 2 giây sau khi thả micro — cảm giác rất tự nhiên, không bị chờ đợi.

### **Tầng 3 — Chấm điểm phát âm chi tiết đến từng âm tiết**

Đây là phần kỹ thuật phức tạp nhất. Trong khi AI đang phản hồi ở tầng 2, tôi **đồng thời** gửi file âm thanh vừa ghi được sang **Azure Cognitive Services Speech SDK**, kết nối qua WebSocket trực tiếp đến máy chủ Microsoft ở khu vực Đông Nam Á.

Azure không chỉ chấm điểm tổng — nó phân tích chi tiết xuống từng âm tiết (phoneme). Ví dụ từ "passport": âm `æ` được 48/100, đánh dấu là Mispronunciation; âm `s` được 91/100. Hệ thống của tôi sau đó **đưa thông tin này vào System Prompt của GPT trong lượt hội thoại tiếp theo** — để AI tự biết người dùng đang yếu âm gì, và có thể khéo léo tạo cơ hội cho họ luyện lại từ đó ngay trong kịch bản roleplay, mà không cần phá vỡ vai diễn.

---

## Thách thức kỹ thuật thú vị nhất

**1. Trình duyệt chặn tự động phát âm thanh**

Chrome và Safari có chính sách nghiêm ngặt: chỉ cho phép phát âm thanh nếu người dùng vừa tương tác trực tiếp. Vì AI phản hồi sau một vài giây (bất đồng bộ), trình duyệt coi đó là "tự phát tự nhiên" và chặn luôn. Giải pháp tôi dùng: ngay tại thời điểm người dùng nhấn nút (đồng bộ, trong cùng một sự kiện click), tôi tạo một thẻ `Audio` và phát một file âm thanh im lặng cỡ 1 byte — đủ để "mở khóa" cái channel đó. Từ đó trở đi mọi âm thanh phát qua cùng channel này đều không bị chặn nữa.

**2. Mô hình AI chậm vì hay suy nghĩ quá nhiều**

Các mô hình GPT thế hệ mới như gpt-5 hay o-series có một chế độ gọi là "chain-of-thought" — AI tự suy luận trước khi trả lời, rất tốt cho bài toán phức tạp nhưng lại mất 8–12 giây — quá lâu cho một cuộc hội thoại thoại realtime. Tôi phát hiện ra có thể tắt tính năng này bằng tham số `reasoning_effort: 'low'`, giảm thời gian phản hồi xuống còn khoảng 1–2 giây mà chất lượng hội thoại thông thường vẫn rất tốt.

**3. Azure WebSocket bị vòng lặp vô hạn**

Lần đầu tích hợp Azure, tôi gặp tình trạng kết nối WebSocket cứ liên tục reconnect — logs server bị lấp đầy. Nguyên nhân là tôi vô tình gọi đồng thời nhiều lần `recognizeOnceAsync` trước khi cái trước kết thúc. Tôi fix bằng cách thêm một flag `isAssessingRef` để đảm bảo chỉ có một phiên Azure chạy tại một thời điểm, kết hợp cơ chế cooldown 2 phút nếu liên tục thất bại.

---

## Kết quả & Bài học

Tính năng hoàn thành với trải nghiệm rất mượt: người dùng nói xong là nghe AI đáp lại trong vòng dưới 2 giây, đồng thời nhìn thấy điểm phát âm chi tiết của mình trên màn hình. Về mặt kỹ thuật, tôi học được rất nhiều về xử lý concurrent stream, quản lý WebSocket, tối ưu latency AI, và cả cách browser enforce security policies.

Tôi nghĩ điểm hay nhất của mình trong dự án này là **không chỉ làm cho nó "chạy được", mà còn làm cho nó chạy đủ nhanh và đủ mượt để thực sự có thể luyện nói được**.

---

*Stack: React + TypeScript · Node.js + Express · OpenAI (Whisper / GPT-4o / TTS) · Azure Cognitive Services · TanStack Query · SSE Streaming*

---

## Phần kỹ thuật chuyên sâu — Cho technical interviewer

---

### A. "Realtime" thực sự hoạt động như thế nào?

Khi nói "realtime" trong dự án này, ý tôi là **độ trễ đủ thấp để người dùng không cảm thấy chờ đợi** — chứ không phải realtime kiểu WebRTC hay WebSocket hai chiều song song trong từng millisecond. Đây là một lựa chọn kiến trúc có chủ đích.

Pipeline hoạt động theo mô hình **PTT — Push-To-Talk**, giống bộ đàm:

```
[Nhấn mic] → [Nói] → [Thả mic]
     → [STT] → [LLM stream] → [TTS stream]
                                    ↓
                          [Audio phát từng câu]
```

**Tại sao không dùng WebSocket realtime hai chiều?**

Tôi đã cân nhắc OpenAI Realtime API (WebSocket, audio-in audio-out hoàn toàn). Nhưng nó có hai hạn chế lớn:
1. Không tích hợp được Azure Pronunciation Assessment — vì audio bị xử lý bên trong model, không trích xuất ra được để gửi sang Azure.
2. Không kiểm soát được từng bước để hiển thị transcript, điểm số, telemetry lên UI.

Vì vậy tôi chọn kiến trúc **pipeline sử dụng HTTP thông thường + SSE** — đơn giản hơn nhiều, dễ debug, dễ kiểm soát từng bước, mà độ trễ vẫn đủ thấp (1.5–2.5s) để trải nghiệm mượt mà.

**Yếu tố làm cho nó cảm giác "realtime":**
- TTS phát theo từng câu ngay khi câu đó vừa hoàn chỉnh, không đợi LLM xong toàn bộ.
- Azure chấm điểm song song, không làm chậm flow hội thoại.
- UI cập nhật ngay khi có dữ liệu (text stream hiện từng chữ).

---

### B. File audio ghi âm của user được xử lý như thế nào?

Có **hai luồng xử lý audio khác nhau** cho cùng một file ghi âm:

#### Luồng 1: Gửi lên OpenAI Whisper để nhận transcript

```
MediaRecorder (browser)
  → Blob (WebM/OGG Opus, ~16kHz)
  → FormData { audio: blob, lessonId }
  → POST /api/v1/speaking/stt
  → Backend: toFile(buffer, 'speech.webm', { type: 'audio/webm' })
  → openai.audio.transcriptions.create({ model: 'whisper-1', file })
  → { transcript: "Hello, my name is..." }
```

Định dạng WebM/OGG được chọn vì `MediaRecorder` của Chrome mặc định dùng codec Opus — nén tốt, chất lượng ổn, Whisper xử lý được. Không cần convert phía frontend.

#### Luồng 2: Gửi sang Azure để chấm phát âm

Azure Speech SDK **không nhận WebM hay OGG** — nó yêu cầu **WAV PCM 16-bit, 16kHz, mono channel**. Vì vậy tôi phải convert ngay trên browser trước khi gửi:

```
Blob (WebM)
  → blob.arrayBuffer()
  → AudioContext.decodeAudioData(buffer)   // Giải mã về dạng Float32
  → getChannelData(0)                       // Lấy channel đầu (mono)
  → floatTo16BitPCM()                       // Chuyển Float32 → Int16
  → WAV header (44 bytes) + PCM data
  → new File([wavBuffer], 'recording.wav')
  → SpeechSDK.AudioConfig.fromWavFileInput(file)
  → recognizer.recognizeOnceAsync()
```

Việc encode WAV xảy ra hoàn toàn trong browser, không tốn bandwidth gửi lên server, và `AudioContext` là Web API có sẵn, không cần thư viện ngoài.

**Hai luồng này chạy song song**, không cái nào chờ cái nào:
```typescript
// Luồng 1: Gửi Whisper (await — cần transcript trước)
const stt = await openAiPipeline.transcribe(lessonId, audioBlob);

// Luồng 2: Azure chạy ngầm (void — không block LLM)
void azure.assess(audioBlob, referenceText).then(result => {
  // Cập nhật điểm số vào state khi có kết quả
});

// Luồng 3: LLM phản hồi, TTS phát âm (chạy ngay sau khi có transcript)
const llm = await openAiPipeline.streamReply({ transcript: stt.transcript, ... });
```

---

### C. Làm sao để AI nhớ lịch sử hội thoại?

Đây là câu hỏi nhiều người hay hỏi. Câu trả lời ngắn gọn: **LLM không có bộ nhớ — tôi tự quản lý lịch sử và gửi lại mỗi lần.**

#### Cách thức cụ thể:

Frontend giữ một mảng `chatMessages` trong React state, mỗi tin nhắn gồm `role` (user/assistant) và `content`:

```typescript
chatMessages = [
  { role: 'assistant', content: 'Good evening. Show me your passport.' },
  { role: 'user',      content: 'Hello, my name is Nguyen Le Huy.' },
  { role: 'assistant', content: 'Thank you. How long will you stay?' },
  { role: 'user',      content: 'Two weeks.' },
  // ... lượt hiện tại đang xử lý
]
```

Mỗi lần gọi `POST /api/v1/speaking/chat`, toàn bộ mảng này được gửi kèm trong body:

```typescript
body: JSON.stringify({
  lessonId,
  transcript,          // Lời user vừa nói (lượt hiện tại)
  chatHistory,         // Toàn bộ lịch sử trước đó
  pronunciationContext // Điểm yếu phát âm lượt trước (nếu có)
})
```

Backend nhận vào, xếp vào messages theo đúng thứ tự OpenAI yêu cầu:

```typescript
messages = [
  { role: 'system',    content: systemPrompt },   // Persona + luật roleplay
  ...chatHistory,                                  // Lịch sử cũ
  { role: 'user',      content: transcript },      // Câu vừa nói
]
```

#### Tại sao không lưu session xuống database?

Với Admin Sandbox (môi trường kiểm thử nội bộ của team edu content), tôi chủ ý không persist — mỗi lần test là một session độc lập. Khi đưa ra cho user học ngoài production, `chatHistory` sẽ được bổ sung lưu xuống MongoDB theo từng `learningSession` document, và load lại khi user quay vào bài học dở dang.

---

### D. Gửi audio lên Azure chấm điểm như thế nào?

Azure Pronunciation Assessment là một dịch vụ dạng **Speech Recognition kết hợp chấm điểm**. Nó không nhận file gửi lên qua HTTP thông thường — mà yêu cầu kết nối **WebSocket độc quyền** qua Speech SDK.

#### Luồng xác thực:

```
Frontend (TanStack Query, staleTime 9 phút)
  → GET /api/v1/azure-speech/token    (mỗi 9 phút một lần)
  → Backend dùng subscription key lấy JWT ngắn hạn từ Azure
  → Trả JWT về cho frontend (10 phút hợp lệ)
  → SDK dùng JWT này để kết nối WebSocket trực tiếp đến Azure
```

Subscription Key **không bao giờ xuất hiện ở frontend**. Backend đóng vai proxy bảo mật — đây là tiêu chuẩn enterprise khi tích hợp các Azure Cognitive Services.

#### Luồng chấm điểm:

```
1. Tạo cấu hình:
   SpeechConfig.fromAuthorizationToken(jwt, region)
   PronunciationAssessmentConfig({
     referenceText,                  // Câu đúng để so sánh
     gradingSystem: HundredMark,     // Thang điểm 100
     granularity: Phoneme,           // Chấm chi tiết đến âm tiết
     enableMiscue: true              // Phát hiện từ thừa/thiếu
   })

2. Tạo Recognizer:
   SpeechRecognizer(speechConfig, AudioConfig.fromWavFileInput(wavFile))
   pronunciationConfig.applyTo(recognizer)

3. Chạy nhận dạng:
   recognizer.recognizeOnceAsync(
     (result) => {
       // Parse PronunciationAssessmentResult
       // Parse JSON từ SpeechServiceResponse_JsonResult → NBest[0].Words[]
     }
   )

4. Timeout 15s: nếu Azure không trả về → resolve(null), tiếp tục
```

#### Dữ liệu nhận về từ Azure:

Azure trả về hai tầng dữ liệu:

**Tầng 1** — Từ `PronunciationAssessmentResult`:
- `accuracyScore`: Chính xác phát âm
- `fluencyScore`: Trôi chảy (không dừng giữa chừng)
- `prosodyScore`: Ngữ điệu, nhấn âm đúng chỗ
- `completenessScore`: Nói đủ tất cả các từ không bỏ sót

**Tầng 2** — Từ JSON thô `SpeechServiceResponse_JsonResult → NBest[0].Words[]`:
```json
{
  "Word": "passport",
  "PronunciationAssessment": {
    "AccuracyScore": 62,
    "ErrorType": "Mispronunciation"
  },
  "Phonemes": [
    { "Phoneme": "p",  "PronunciationAssessment": { "AccuracyScore": 95 } },
    { "Phoneme": "æ",  "PronunciationAssessment": { "AccuracyScore": 48, "ErrorType": "Mispronunciation" } },
    { "Phoneme": "s",  "PronunciationAssessment": { "AccuracyScore": 91 } },
    { "Phoneme": "p",  "PronunciationAssessment": { "AccuracyScore": 89 } },
    { "Phoneme": "oʊ", "PronunciationAssessment": { "AccuracyScore": 76 } },
    { "Phoneme": "r",  "PronunciationAssessment": { "AccuracyScore": 83 } },
    { "Phoneme": "t",  "PronunciationAssessment": { "AccuracyScore": 70 } }
  ]
}
```

Tôi parse tầng 2 thủ công bằng TypeScript, map về cấu trúc `WordScore[]` với `PhonemeScore[]` lồng trong từng từ, rồi hiển thị trực tiếp lên UI với màu sắc:
- **Xanh lá** (≥ 80): Phát âm tốt
- **Vàng cam** (60–79): Trung bình
- **Đỏ** (< 60): Cần cải thiện

Người dùng nhấn "Xem chi tiết" ở mỗi lượt nói để mở modal với toàn bộ phân tích này.

