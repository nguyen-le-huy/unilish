## Hệ thống Kiểm tra Đầu vào Thông minh — UniLish

---

## 1. Tổng Quan (Overview)

Hệ thống Smart Placement Test là cửa ngõ đầu tiên của người dùng trong hệ sinh thái UniLish, được thiết kế để đánh giá toàn diện năng lực ngôn ngữ dựa trên **4 kỹ năng cốt lõi: Nghe, Đọc, Viết, Nói**.

Khác với các bài kiểm tra truyền thống, hệ thống ứng dụng **Adaptive AI** để điều chỉnh độ khó theo thời gian thực, đồng thời sử dụng **Generative AI** để đánh giá các kỹ năng chủ động (Nói & Viết) theo chuẩn IELTS với độ chính xác cao.

Kết quả kiểm tra được tổng hợp, quy đổi sang khung chuẩn quốc tế **CEFR (A1–C2)** và làm cơ sở để hệ thống tự động kiến tạo **Lộ trình học cá nhân hóa (Personalized Roadmap)**.

> **Triết lý thiết kế:** Đảm bảo mọi học viên bắt đầu từ đúng vạch xuất phát phù hợp nhất với năng lực thực tế.
> 

---

## 2. Cấu Trúc Bài Thi (Test Components)

Bài thi gồm **3 module nối tiếp**. Độ khó của module sau phụ thuộc vào kết quả module trước (**Adaptive Difficulty**).

```bash
text[Module 1: TOEIC Compact] ──→ [Module 2: IELTS Writing] ──→ [Module 3: IELTS Speaking]
     ~45 phút                       ~30 phút                      ~12–15 phút
```

---

## Phần 1: Kỹ Năng Thụ Động — TOEIC Compact (Nghe + Đọc)

**Định dạng:** Trắc nghiệm khách quan 4 lựa chọn (Multiple Choice).

**Nguyên tắc rút gọn:** Giữ nguyên **7 Part** chuẩn TOEIC, mỗi part lấy **~50% số câu** so với đề gốc.

**Tổng số câu: ~101 câu | Thời gian: ~45 phút**

## 1A. Listening Section — 4 Parts (~51 câu, ~25 phút)

| Part | Tên | Gốc (câu) | Compact (~50%) | Dạng bài |
| --- | --- | --- | --- | --- |
| Part 1 | Photographs | 6 | **3** | Mô tả tranh ảnh |
| Part 2 | Question-Response | 25 | **13** | Hỏi-đáp ngắn |
| Part 3 | Short Conversations | 39 (13 đoạn × 3 câu) | **21** (7 đoạn × 3 câu) | Hội thoại ngắn |
| Part 4 | Short Talks | 30 (10 bài × 3 câu) | **15** (5 bài × 3 câu) | Bài phát biểu ngắn |
| **Tổng** |  | **100** | **52** |  |

## 1B. Reading Section — 3 Parts (~50 câu, ~20 phút)

| Part | Tên | Gốc (câu) | Compact (~50%) | Dạng bài |
| --- | --- | --- | --- | --- |
| Part 5 | Incomplete Sentences | 30 | **15** | Điền từ vào câu |
| Part 6 | Text Completion | 16 (4 đoạn × 4 câu) | **8** (2 đoạn × 4 câu) | Điền từ vào đoạn văn |
| Part 7 | Reading Comprehension | 54 (single + multi-passage) | **27** (~5 đoạn đơn + 2 nhóm đôi) | Đọc hiểu đơn & ghép đoạn |
| **Tổng** |  | **100** | **50** |  |

**Cơ chế chấm:** Tự động (Rule-based), kết quả lưu vào Redis ngay sau khi nộp bài để xác định level cho Phần 2 & 3.

---

## Phần 2: Kỹ Năng Viết — IELTS Writing Task 2

**Định dạng:** Bài luận tự do (Free-writing) trên Text Editor.

**Thời gian:** 30 phút | **Yêu cầu độ dài:** ≥150 từ (Low Level) / ≥250 từ (High Level).

## Ra đề (AI-Generated — Adaptive)

Đề bài được sinh tự động dựa trên điểm TOEIC Compact:

| TOEIC Compact Score | CEFR Dự kiến | Dạng đề IELTS Writing Task 2 | Ví dụ |
| --- | --- | --- | --- |
| 0–40% | A1–A2 | Descriptive / Opinion đơn giản | *"Do you prefer living in a city or the countryside? Give reasons."* |
| 40–65% | B1 | Discussion / Opinion | *"Some people think social media is harmful to society. Do you agree?"* |
| 65–80% | B2 | Argument / Both views | *"Technology is replacing human workers. Discuss both views and give your opinion."* |
| 80–100% | C1–C2 | Problem–Solution / Complex Argument | *"To what extent does globalization threaten cultural identity? Discuss with examples."* |

## Tiêu chí chấm (IELTS Writing Band Descriptors — 4 criteria)

| Tiêu chí | Trọng số | Mô tả |
| --- | --- | --- |
| **Task Response (TR)** | 25% | Trả lời đúng và đầy đủ yêu cầu đề bài |
| **Coherence & Cohesion (CC)** | 25% | Cấu trúc đoạn văn, từ nối, tính logic |
| **Lexical Resource (LR)** | 25% | Phạm vi từ vựng, chính tả, cách dùng từ |
| **Grammatical Range & Accuracy (GRA)** | 25% | Đa dạng cấu trúc ngữ pháp, ít lỗi |

**Cơ chế chấm:** GPT-5.2 phân tích và trả về JSON (Score + Feedback chi tiết).

---

## Phần 3: Kỹ Năng Nói — IELTS Speaking (Lite Format)

**Định dạng:** Phỏng vấn 1:1 thời gian thực với **AI Examiner** — giọng nói tổng hợp bởi **OpenAI TTS (`tts-1`)**, điều phối hội thoại bởi **GPT-4.1 Mini**, chấm điểm nội dung bởi **GPT-5 Mini**, chấm điểm kỹ thuật âm thanh bởi **Azure AI Speech**.

## Cấu trúc (3 Part chuẩn IELTS Speaking)

| Part | Tên | Thời gian | Nội dung |
| --- | --- | --- | --- |
| **Warm-up** | Introduction | ~1 phút | Chào hỏi, xác nhận tên, giảm lo lắng cho user |
| **Part 1** | Interview | ~4–5 phút | 4–6 câu hỏi ngắn về chủ đề quen thuộc: Work, Study, Hobbies, Daily life |
| **Part 2** | Individual Long Turn | ~3–4 phút | AI đưa cue card → User chuẩn bị 1 phút → Nói liên tục 1–2 phút |
| **Part 3** | Two-way Discussion | ~4–5 phút | 2–3 câu hỏi trừu tượng hơn, liên quan đến chủ đề Part 2 (Why/How/What do you think…) |

> **Lưu ý:** AI Examiner **không sửa lỗi** trong quá trình phỏng vấn. Nếu user ngừng >5 giây, AI nhẹ nhàng gợi ý hoặc chuyển sang câu tiếp theo.
> 

## Tiêu chí chấm (IELTS Speaking Band Descriptors — 4 criteria)

| Tiêu chí | Công cụ phân tích | Mô tả |
| --- | --- | --- |
| **Fluency & Coherence** | Azure AI Speech + GPT-5 Mini | Tốc độ nói (WPM), số lần ngắt (Pause count), tính liên kết ý tưởng trong transcript |
| **Lexical Resource** | GPT-5 Mini | Phạm vi từ vựng, collocations, paraphrasing |
| **Grammatical Range & Accuracy** | GPT-5 Mini | Đa dạng cấu trúc, tần suất lỗi ngữ pháp |
| **Pronunciation** | Azure AI Speech | Phoneme accuracy, intonation, word stress |

## Phân công model theo giai đoạn

| Giai đoạn | Model | Vai trò |
| --- | --- | --- |
| **Trong lúc phỏng vấn** | GPT-4.1 Mini + OpenAI TTS | Điều phối hội thoại, sinh câu hỏi adaptive theo 3 Part, phát giọng nói tới user |
| **Sau phỏng vấn (chấm điểm)** | GPT-5 Mini | Phân tích transcript toàn bộ, chấm Fluency/Coherence, Lexical Resource, GRA |
| **Kỹ thuật âm thanh** | Azure AI Speech | STT lấy transcript + Pronunciation Score, WPM, Pause detection (xuyên suốt bài thi) |

## 3. Công Nghệ Sử Dụng (Tech Stack)

| Phân hệ | Công nghệ | Vai trò chi tiết |
| --- | --- | --- |
| **Frontend** | React + Zustand | Quản lý State bài thi (Timer, Step transition), chống gian lận (Tab switching detection, Disable copy/paste) |
| **Audio Capture** | MediaStream API | Ghi âm High-Quality Audio từ trình duyệt, stream lên Server |
| **Data Core** | MongoDB | `QuestionBank`: Kho đề TOEIC 7 parts. `TestSessions`: Lưu trạng thái tạm (chống mất mạng). `UserResults`: Kết quả chi tiết 4 kỹ năng |
| **Cache / Queue** | Redis + BullMQ | Cache Raw Score giữa các module. Queue xử lý chấm điểm async để tránh timeout |
| **Backend Logic** | Node.js | Điều phối luồng bài thi, Adaptive Level routing |
| **AI Content & Grading** | GPT-5 Mini | Sinh đề IELTS Writing Task 2. Chấm điểm Writing (4 criteria). Phân tích nội dung & chấm điểm Speaking sau phỏng vấn |
| **AI Voice (Examiner)** | **GPT-4.1 Mini + OpenAI TTS (`tts-1`)** | Điều phối hội thoại IELTS Speaking 3 Part, sinh câu hỏi adaptive, phát giọng nói AI Examiner tới user |
| **Voice Analytics** | Azure AI Speech | **STT (Speech-to-Text) lấy transcript + Phân tích kỹ thuật**: Pronunciation score, WPM, Pause detection, Intonation |

---

## 4. Quy Đổi Điểm & Mapping CEFR

| TOEIC Compact (%) | IELTS Writing Band | IELTS Speaking Band | CEFR Level | Mô tả |
| --- | --- | --- | --- | --- |
| 0–25% | 2.0–3.5 | 2.0–3.5 | **A1** | Beginner |
| 25–45% | 3.5–4.5 | 3.5–4.5 | **A2** | Elementary |
| 45–60% | 4.5–5.5 | 4.5–5.5 | **B1** | Pre-Intermediate |
| 60–75% | 5.5–6.5 | 5.5–6.5 | **B2** | Intermediate |
| 75–90% | 6.5–7.5 | 6.5–7.5 | **C1** | Upper-Intermediate |
| 90–100% | 7.5+ | 7.5+ | **C2** | Advanced |

> **Công thức tổng hợp:**
> 
> 
> `CEFR_Final = weighted_avg(TOEIC_CEFR × 0.4, Writing_CEFR × 0.3, Speaking_CEFR × 0.3)`
> 

---

## 5. Kết Quả & Báo Cáo (Result Dashboard)

Sau khi hoàn thành cả 3 module, user được chuyển đến trang kết quả với:

1. **Spider Chart (Radar Chart):** Trực quan hóa điểm 4 kỹ năng (Listening, Reading, Writing, Speaking) trên thang CEFR.
2. **CEFR Level Card:** Hiển thị level tổng hợp + mô tả năng lực tương ứng.
3. **Skill Breakdown:** Điểm chi tiết từng kỹ năng + Band score (Writing & Speaking).
4. **Personalized Roadmap Preview:** Gợi ý 3–5 khóa học / module đầu tiên phù hợp với Level.
5. **Detailed Feedback:** Nhận xét chi tiết từ AI cho Writing và Speaking (strengths, errors, actionable tips).