## Tiêu chí chấm (IELTS Speaking Band Descriptors — 4 criteria)

| Tiêu chí | Công cụ phân tích | Mô tả |
| --- | --- | --- |
| **Fluency & Coherence** | Azure AI Speech + gpt-5.4-mini | Tốc độ nói (WPM), số lần ngắt bất thường (FluencyScore), tính liên kết ý tưởng trong transcript |
| **Lexical Resource** | gpt-5.4-mini | Phạm vi từ vựng, collocations, paraphrasing |
| **Grammatical Range & Accuracy** | gpt-5.4-mini | Đa dạng cấu trúc, tần suất lỗi ngữ pháp |
| **Pronunciation** | Azure AI Speech | Phoneme accuracy, mispronunciation detectiocn, word omission/insertion errors |

## Phân công model theo giai đoạn

| Giai đoạn | Model | Vai trò |
| --- | --- | --- |
| **Trong lúc phỏng vấn** | gpt-5.4-mini + OpenAI TTS | Điều phối hội thoại, sinh câu hỏi, phát giọng nói tới user |
| **Xuyên suốt bài thi** | Azure AI Speech | STT lấy transcript real-time + Pronunciation Assessment liên tục (AccuracyScore, FluencyScore, WPM, word/phoneme errors) |
| **Sau phỏng vấn (chấm điểm)** | gpt-5.4-mini | Phân tích transcript: chấm Fluency/Coherence, Lexical Resource, GRA |