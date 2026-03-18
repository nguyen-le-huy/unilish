## 1. Bối cảnh & Mục tiêu

Xây dựng **Trợ lý Giao tiếp 1:1 (Real-time AI Coach)** kết hợp **Hệ thống Chấm điểm Phát âm**, đảm bảo:

- Giao tiếp giọng nói hai chiều (Full-duplex)
- Phân tích lỗi phát âm đến từng âm vị (Phoneme-level)
- Backup thay thế cho `gpt-realtime-mini-2025-12-15`

---

## 2. Stack Công nghệ

## Pipeline chính: STT → LLM → TTS (All-OpenAI)

| Tầng | Model | Lý do chọn |
| --- | --- | --- |
| **STT** | `gpt-4o-mini-transcribe` | Nhanh nhất, vượt Whisper V3, hỗ trợ streaming |
| **LLM** | `gpt-5-mini` | Tốc độ cao, đủ thông minh cho coaching real-time, tiết kiệm chi phí |
| **TTS** | `gpt-4o-mini-tts` | Điều khiển giọng bằng ngôn ngữ tự nhiên, hỗ trợ streaming |
| **Pronunciation** | `Azure Speech SDK` | Chấm điểm phoneme-level (IPA), 5 chỉ số chi tiết |

> **Backup toàn bộ pipeline**: `gpt-realtime-mini-2025-12-15` khi cần end-to-end nhanh nhất
> 

---

## 3. Kiến trúc Hệ thống

Từ **1 audio input** của user → tách thành **2 luồng song song**:

```bash
USER AUDIO INPUT
        │
   ┌────┴────┐
   ▼         ▼
LUỒNG 1    LUỒNG 2
OpenAI     Azure Speech SDK
   │         │
STT          PronunciationAssessment
LLM  ◄───── (phoneme scores inject
TTS          vào system prompt)
   │         │
   └────┬────┘
        ▼
  AI Voice Response
  + Score Card UI
```

**Azure trả về 5 chỉ số:**

- `AccuracyScore` — độ chính xác từng phoneme
- `FluencyScore` — độ trôi chảy
- `ProsodyScore` — ngữ điệu, trọng âm
- `CompletenessScore` — tỷ lệ phát âm đủ
- `ErrorType` — Omission / Insertion / Mispronunciation

---

## 4. Thiết kế UI — Toggle PTT (Push-to-Talk)

**Luồng tương tác:**

```bash
textAI chào trước (TTS tự động)
        ↓
User ấn 🎙️ → Mic BẬT → nói
        ↓
User ấn 🔴 → Mic TẮT → gửi audio
        ↓
Xử lý song song (Azure + OpenAI)
        ↓
AI phản hồi + hiện Score Card
        ↓
Về Idle, chờ lượt tiếp theo
```

**5 trạng thái nút mic:**

| Trạng thái | Icon | Mô tả |
| --- | --- | --- |
| Idle | 🎙️ xanh | *"Tap to speak"* |
| Recording | 🔴 pulse | *"Tap to stop"* + waveform |
| Processing | ⏳ spinner | *"Analyzing..."* |
| AI Speaking | 🤖 wave | Disable mic |
| Result | ✅ | Score card hiện 2s → về Idle |

**Edge cases xử lý:**

- Audio < 1.5 giây → không gửi, toast *"Please speak a bit longer"*
- Mic mở > 30 giây không có tiếng → tự tắt
- Nhấn mic khi AI đang nói → disable, chờ AI xong
- Lỗi mạng → retry button, không mất transcript

---

## 5. Stack Cuối Cùng

```bash
┌─────────────────────────────────────────────┐
│              AI SPEAKING COACH              │
├─────────────────┬───────────────────────────┤
│  Real-time      │  Pronunciation            │
│  Conversation   │  Assessment               │
│                 │                           │
│  STT:           │  Azure Speech SDK         │
│  gpt-4o-mini-   │  Granularity: Phoneme     │
│  transcribe     │  Alphabet: IPA            │
│                 │  nBestPhoneme: 5          │
│  LLM:           │                           │
│  gpt-5-mini     │  Scores:                  │
│                 │  Accuracy / Fluency /     │
│  TTS:           │  Prosody / Completeness / │
│  gpt-4o-mini-   │  ErrorType                │
│  tts            │                           │
├─────────────────┴───────────────────────────┤
│  UI: Toggle PTT  (Tap ON / Tap OFF mic)     │
│  AI greets first → User controls pace      │
└─────────────────────────────────────────────┘
```