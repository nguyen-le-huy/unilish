📘 MODULE: VOCABULARY (CONTEXTUAL AI & PRACTICE)
1. Chiến lược Nội dung (AI-Driven Contextual Content)
Khác với các ứng dụng cũ (tạo list từ ngẫu nhiên), UniLish sử dụng AI để sinh từ vựng bám sát Hạt giống ngữ cảnh (Context Seed) của từng Unit.
Generator: GPT-5.1 (Tối ưu hiệu năng/chi phí).
Audio: OpenAI TTS (model tts-1, giọng Alloy/Echo) + Cloudflare R2 (Lưu trữ).
Constraint (Ràng buộc ngữ cảnh):
Input: Không sinh từ ngẫu nhiên. AI phải xử lý danh sách targetVocab được định nghĩa trong Unit.context.
Contextual Examples: Câu ví dụ (example_sentence) bắt buộc phải khớp với Unit.context.scenario.
Ví dụ: Unit "Airport", từ "Check-in".
Đạt: "I need to go to the check-in counter." (Đúng ngữ cảnh Sân bay).
Không đạt: "I check-in at the hotel." (Sai ngữ cảnh).

2. Thiết kế Database (Lesson Schema Update)
Sử dụng cấu trúc Lesson chuẩn đã thống nhất, tích hợp cả nội dung và bài tập thực hành.
A. Lesson Schema (MongoDB)
// models/Lesson.js
import mongoose from "mongoose";

const LessonSchema = new mongoose.Schema({
  unitId: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  title: { type: String, required: true }, // VD: "Core Vocabulary: Airport"
  type: { 
    type: String, 
    enum: ['VOCAB', 'READING', 'LISTENING', 'SPEAKING', 'WRITING', 'GRAMMAR'], 
    default: 'VOCAB' 
  },
  
  // 1. NỘI DUNG LÝ THUYẾT (Flashcards)
  content: { type: mongoose.Schema.Types.Mixed },

  // 2. [UPDATE] BÀI TẬP THỰC HÀNH NGAY SAU KHI HỌC
  // Thay vì tạo Lesson Quiz riêng, ta nhúng vào đây
  practiceConfig: {
    mode: { type: String, default: 'FIXED' },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }], // Link tới 10 câu hỏi sinh ra từ từ vựng
    passingScore: 80
  },

  // 3. METADATA (CONCEPT TRACKING)
  // Dùng để truy vấn ngược: User yếu Concept A -> Tìm ra bài học này.
  taughtConcepts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Concept' }] 

}, { timestamps: true });

B. Cấu trúc JSON của content (Khi type = 'VOCAB')
Cập nhật thêm trường definition_native để hỗ trợ đa ngôn ngữ (Ví dụ: Khóa học cho người Nhật thì native là tiếng Nhật).
JSON
{
  "items": [
    {
      "id": "vocab_item_1",
      "conceptId": "65d4f8a123...", // ID của Concept "luggage" trong DB (Core)
      "word": "Luggage",
      "pos": "noun", // Part of speech
      "ipa": "/ˈlʌɡ.ɪdʒ/",
      
      // Định nghĩa theo ngôn ngữ mẹ đẻ của khóa học
      "definition_native": "Hành lý", // Hoặc "荷物" nếu là khóa cho người Nhật
      "definition_en": "Bags and cases that you carry with you when you are travelling.",
      
      "audioUrl": "<https://r2.unilish.com/audio/luggage.mp3>",
      "imageUrl": "<https://r2.unilish.com/img/luggage.jpg>", // AI Gen hoặc Stock
      
      "example": {
        "sentence": "Please put your luggage on the scale.",
        "translation": "Vui lòng đặt hành lý lên cân.",
        "audioUrl": "<https://r2.unilish.com/audio/ex_luggage.mp3>"
      }
    }
  ]
}


3. Workflow Sản xuất & Sinh Bài tập (Automation)
Quy trình "One-Click Generation" cho Admin.
Sinh Từ Vựng: Admin nhập Topic -> AI sinh JSON Vocab (như trên).


Sinh Audio: Backend gọi TTS tạo file nghe cho từ và câu ví dụ.


[UPDATE] Sinh Câu Hỏi Thực Hành (Auto-Practice):

 Ngay sau khi lưu từ vựng, hệ thống tự động sinh 10 Question Documents và link vào practiceConfig.questionIds:


Dạng 1: Nghe - Chọn từ (Audio Matching)
Dạng 2: Điền từ vào ngữ cảnh (Context Fill) - Tận dụng câu example vừa sinh.
Dạng 3: Nối từ (Matching) - Nối Word với Definition.

4. Thiết kế UI Flashcard (Tính năng cao cấp)
Tech stack: React + Framer Motion.
A. Logic ghi nhớ (Spaced Repetition)
Action: User lật thẻ "Luggage".
Nút "Đã nhớ" (Easy): Frontend chuyển thẻ tiếp theo. Backend tăng masteryLevel.
Nút "Chưa nhớ" (Hard):
Frontend: Đẩy thẻ xuống cuối hàng đợi để lặp lại ngay.
Backend: Giảm masteryLevel. Đánh dấu Concept này vào danh sách cần ôn tập.
B. [NEW] Micro-Speaking (Luyện phát âm ngay lập tức)
Trên mỗi Flashcard, thêm nút 🎙️ "Thử phát âm".
User ấn giữ và đọc từ "Luggage".
Hệ thống dùng Speech-to-Text (Browser Native hoặc AI) để check nhanh.
Đúng: Hiện hiệu ứng pháo hoa 🎉 -> Tự động chuyển thẻ (Tạo cảm giác Flow).
Sai: Hiện IPA những âm đọc sai (Ví dụ: /lʌ/ đúng, nhưng /dʒ/ sai).

5. Bài kiểm tra (Practice Mode)
Thay vì bài Quiz tách biệt, sau khi user lướt hết Flashcard, UI hiện popup:
"Bạn đã học xong 10 từ. Hãy làm bài tập nhanh để mở khóa bài tiếp theo!"
User làm 10 câu hỏi (đã sinh ở bước 3).
Nếu đúng > 80% -> Lesson Completed.
Nếu sai -> Hệ thống highlight những từ vựng bị sai và yêu cầu học lại Flashcard các từ đó.
📘 MODULE: GRAMMAR (INDUCTIVE & CONTEXTUAL)
1. Chiến lược Nội dung (Inductive Learning Strategy)
Thay vì dạy ngữ pháp khô khan ("Công thức: S + V-ed"), UniLish áp dụng phương pháp Quy nạp (Inductive Approach):
Immerse: Người học tiếp xúc ngữ pháp qua câu chuyện/hội thoại (có chứa từ vựng Unit).
Notice: AI tô sáng (highlight) các cấu trúc ngữ pháp để gây chú ý.
Formulate: Người học tự rút ra quy luật (hoặc xem giải thích).
Practice: Thực hành ngay lập tức trong ngữ cảnh đó.
Generator: GPT-5.2 để viết Story & sinh câu hỏi.
Context Injection: AI bắt buộc phải sử dụng lại Unit.context.keywords (từ vựng đã học) để viết ví dụ ngữ pháp.

2. Thiết kế Database (Lesson Polymorphic Pattern)
Dữ liệu ngữ pháp được lưu trong Lesson với type: 'GRAMMAR'. Cấu trúc JSON trong content được chuẩn hóa để Frontend dễ render.
A. Lesson Schema (MongoDB)
// models/Lesson.js
{
  unitId: ObjectId("unit_airport_id"),
  title: "Grammar: Past Simple with Travel",
  type: "GRAMMAR",
  
  // 1. NỘI DUNG LÝ THUYẾT & KHÁM PHÁ (Discovery Phase)
  content: {
    // Phần A: Câu chuyện ngữ cảnh (Story/Dialogue)
    context_story: {
      text: "Yesterday, I [booked] a flight to Singapore but I [lost] my passport.",
      translation: "Hôm qua tôi đã đặt vé...",
      audio_url: "<https://r2.unilish.com/grammar/past_simple_airport.mp3>",
      
      // Các từ cần highlight để user chú ý (Click vào hiện giải thích)
      highlights: [
        { word: "booked", type: "regular_verb", root: "book" },
        { word: "lost", type: "irregular_verb", root: "lose" }
      ]
    },

    // Phần B: Quy tắc ngữ pháp (The Rule)
    grammar_rule: {
      name: "Past Simple (Quá khứ đơn)",
      usage: "Diễn tả hành động đã chấm dứt trong quá khứ.",
      formulas: [
        { type: "positive", structure: "S + V-ed/V2", example: "I booked a ticket." },
        { type: "negative", structure: "S + did not + V-inf", example: "I did not go." },
        { type: "question", structure: "Did + S + V-inf?", example: "Did you check in?" }
      ],
      // Danh sách động từ bất quy tắc xuất hiện trong bài này
      irregular_verbs: [
        { base: "lose", past: "lost" },
        { base: "go", past: "went" }
      ]
    }
  },

  // 2. CẤU HÌNH BÀI TẬP THỰC HÀNH (Practice Phase)
  practiceConfig: {
    mode: "FIXED", // Bài tập cố định bám theo Story trên
    questionIds: [ObjectId("q1"), ObjectId("q2"), ObjectId("q3")],
    passingScore: 80
  },

  // 3. TRACKING (Để AI biết user đã học Concept này chưa)
  taughtConcepts: [ObjectId("concept_past_simple_id")] 
}


3. Workflow tạo bài học (Automation)
Quy trình này đảm bảo tính "kết dính" giữa Từ vựng và Ngữ pháp.
Bước 1 (Trigger): Admin chọn Unit "Airport" (đã có từ vựng luggage, check-in) và chọn Concept "Past Simple".
Bước 2 (Context Injection): Backend gửi Prompt sang AI:
Input: Vocab List [luggage, check-in], Grammar [Past Simple].
Task: "Viết đoạn hội thoại 4 câu tại sân bay. Dùng thì Quá khứ đơn cho các động từ. Phải chứa ít nhất 2 từ vựng trên."
Bước 3 (Generation):
AI sinh context_story và grammar_rule.
AI sinh 5 câu hỏi trắc nghiệm/điền từ dựa trên đoạn hội thoại đó.
Bước 4 (Save):
Lưu Lesson.
Lưu 5 câu hỏi vào collection Question và link ID vào practiceConfig.
Quan trọng: Đảm bảo taughtConcepts trỏ đúng tới ID của Concept "Past Simple".

4. Quy trình Học tập & UI (User Experience)
Giao diện React chia làm 3 tab hoặc 3 bước (Stepper):
Bước 1: Discovery (Khám phá)
UI: Hiện đoạn hội thoại + Nút Play Audio.
Interaction: Các từ booked, lost có màu nổi bật. User bấm vào -> Hiện Popup: "Đây là dạng quá khứ của 'Book'. Quy tắc: thêm -ed".
Bước 2: The Rules (Công thức)
UI: Grammar Card dạng slide (Khẳng định -> Phủ định -> Nghi vấn).
Tính năng "AI Explain": Nút 🤖 "Giải thích cho tôi".
User bấm vào, AI (RAG) sẽ giải thích lại quy tắc bằng ngôn ngữ tự nhiên (Tiếng Việt) dựa trên level của user.
Bước 3: Practice & Production (Thực hành)
Sử dụng các dạng câu hỏi từ Question Model:
Unscramble (Sắp xếp): luggage / lost / I / my / .
Morphology (Chia từ): "She (buy) ____ a ticket." -> User gõ bought.
Production (Viết/Nói - AI Grader):
Đề bài: "Kể lại 1 việc bạn đã làm ở sân bay hôm qua."
User Input: "I check-ined late."
AI Feedback:
Lỗi: Sai quy tắc chia động từ.
Sửa: check-ined -> checked in.
Giải thích: "Check-in là cụm động từ, bạn chỉ thêm -ed vào động từ chính (check) thôi nhé."

5. Tổng kết Công nghệ Module Grammar
Thành phần
Công nghệ
Vai trò
Generator
GPT-5.2
Sinh Story ngữ cảnh & Bài tập.
Grader
Fine-tuned LLM
Chấm bài Writing, sửa lỗi ngữ pháp kèm giải thích.
Database
MongoDB
Lưu trữ cấu trúc phân tầng (Story -> Rule -> Practice).
Audio
OpenAI TTS or ElevenLabs
Đọc mẫu câu chuyện và ví dụ ngữ pháp.
Assessment
Question Bank
Tái sử dụng câu hỏi cho các bài kiểm tra sau này.

📘 MODULE: LISTENING (AUTHENTIC & INTERACTIVE)
1. Chiến lược Nội dung (Authentic Listening Strategy)
Chúng ta chuyển từ "Nghe thụ động" sang "Nghe thực chiến" (Authentic Decoding).
Multi-Accent: Không chỉ giọng Mỹ chuẩn (Standard US), hệ thống sẽ mix giọng Anh, Úc, Ấn... tùy theo độ khó và ngữ cảnh (VD: IELTS cần đa giọng).
Ambient Noise (Tạp âm): Bài nghe "Airport" sẽ có tiếng loa thông báo văng vẳng hoặc tiếng ồn đám đông mức độ thấp. Giúp user không bị "sốc" khi ra thực tế.
Scaffolded Flow: Gist (Ý chính) $\rightarrow$ Detail (Chi tiết) $\rightarrow$ Shadowing (Nhại lại).

2. Thiết kế Database (Lesson Polymorphic Pattern)
Dữ liệu Listening được lưu trong Lesson.content với type: 'LISTENING'.
A. Lesson Schema (MongoDB Update)
JavaScript
// models/Lesson.js
{
  title: "Listening: The Lost Luggage Situation",
  type: "LISTENING",
  unitId: ObjectId("unit_airport_checkin"),
  
  // NỘI DUNG ĐA HÌNH CHO LISTENING
  content: {
    // 1. Metadata Tài nguyên Media
    media: {
      audioUrl: "<https://r2.unilish.com/audio/dialogue_airport_mixed.mp3>",
      duration: 65.5,
      accent: "en-US", // hoặc "en-UK", "mixed"
      noiseLevel: "low", // low/medium/high (Độ ồn nền)
      speed: 1.0 // Tốc độ gốc
    },

    // 2. Kịch bản & Timestamp (Output từ Deepgram/Whisper)
    transcript: [
      {
        speaker: "Adam",
        role: "Staff",
        text: "Good morning. May I see your passport?",
        startTime: 0.5,
        endTime: 3.2,
        words: [ // Word-level timestamps cho Karaoke
          { word: "Good", start: 0.5, end: 0.8 },
          { 
             word: "passport", 
             start: 2.5, 
             end: 3.1, 
             // [QUAN TRỌNG] Link tới Concept để tracking
             conceptId: ObjectId("concept_passport_id"), 
             isTargetVocab: true 
          }
        ]
      },
      // ... các đoạn thoại khác
    ],

    // 3. Cấu hình tương tác trên Player (Dictation/Gap-fill)
    interactiveConfig: {
      mode: "GAP_FILL", // hoặc "SHADOWING"
      hidePercentage: 20, // Ẩn 20% số từ (ưu tiên targetVocab)
      allowSlowSpeed: true // Cho phép user nghe chậm 0.75x
    }
  },

  // 4. BÀI TẬP KIỂM TRA HIỂU (Comprehension Check)
  // Sử dụng model Question chung
  practiceConfig: {
    mode: "FIXED",
    questionIds: [ObjectId("q_gist_1"), ObjectId("q_detail_1")]
  }
}


3. Workflow Sản xuất (The Studio Pipeline)
Quy trình tự động hóa để tạo ra file nghe chất lượng cao và dữ liệu Karaoke chuẩn xác.
Script Gen (GPT-5.2):
Input: Topic "Airport", Vocab [luggage, delay].
Prompt: "Viết hội thoại giữa Staff và Passenger. Chèn tiếng động mô tả trong ngoặc [SFX: airport announcement]. Dùng từ vựng trên."
Voice Gen (ElevenLabs):
Sinh file giọng nói riêng lẻ cho từng nhân vật (Multi-speaker).
[WOW FACTOR] Audio Mixing (FFmpeg/Python):
Backend tự động trộn (Mix) các file giọng nói lại.
Chèn file âm thanh nền airport_ambience.mp3 vào background với volume thấp (-20dB).
Alignment (Deepgram/Whisper):
Gửi file đã mix sang Deepgram để lấy word_timestamps.
Mapping lại conceptId từ Unit vào JSON kết quả.

4. Quy trình Học tập (UX Flow)
Giao diện React chia làm 3 giai đoạn (Stages):
Chặng 1: Gist Listening (Nghe Thấm)
UI: Màn hình tối, chỉ hiện sóng âm (Waveform) hoặc hình ảnh ngữ cảnh.
Task: Nghe 1 lần và trả lời 1 câu hỏi tổng quát ngay lập tức.
Q: "Người phụ nữ đang gặp vấn đề gì?" (A. Mất vé / B. Mất hành lý).
Mục đích: Bắt user tập trung vào ngữ điệu và bối cảnh thay vì dịch từng từ.
Chặng 2: Interactive Karaoke (Nghe Chi Tiết)
UI: Transcript chạy chữ Karaoke.
Challenge: Các từ Target Vocab (Luggage, Passport) bị che mờ hoặc đục lỗ [____].
Interaction:
User nghe và gõ lại từ còn thiếu.
Nếu sai $\rightarrow$ Hệ thống highlight đỏ, hiện gợi ý.
Tracking: Nếu user sai từ "Luggage" $\rightarrow$ Update weakConceptsDetected vào bảng UserLessonProgress.
Chặng 3: Shadowing (Luyện Nói theo - Optional)
UI: Hiện từng câu thoại.
Action:
Nghe mẫu.
Bấm Mic thu âm nhại lại.
AI chấm điểm ngữ điệu (Intonation) xem có giống mẫu không.

5. Tech Stack & Điểm "Wow"
Thành phần
Công nghệ
Lý do chọn (Selling Point)
Audio Gen
ElevenLabs
Tạo giọng cảm xúc (Emotional Speech), ngắt nghỉ tự nhiên.
Mixing
FFmpeg
[WOW] Tạo môi trường âm thanh giả lập (3D Sound) giúp bài học sống động.
Sync Engine
Deepgram
Timestamp chính xác từng mili-giây, hỗ trợ Karaoke mượt mà.
Data Logic
MongoDB
Lưu cấu trúc lồng nhau (Transcript -> Words -> ConceptId) hiệu quả.
Player UI
Wavesurfer.js
Hiển thị sóng âm chuyên nghiệp, click-to-seek tiện lợi.

📘 MODULE: SPEAKING (HYBRID AI COACH)
1. Nguyên lý Giáo dục (Dual-Core Pedagogy)
Hệ thống áp dụng mô hình Đánh giá Kép (Dual Assessment Model) để đảm bảo người học vừa nói tự nhiên, vừa nói chuẩn.
Communicative Competence (Năng lực Giao tiếp): User có phản xạ nhanh không? Có giải quyết được vấn đề trong tình huống không?
Phụ trách: OpenAI Realtime API.
Phonological Competence (Năng lực Ngữ âm): User phát âm có đúng âm vị (Phoneme) không? Có ngữ điệu (Prosody) lên xuống tự nhiên không?
Phụ trách: Azure AI Speech.

2. Thiết kế Database (Lesson Polymorphic Pattern)
Dữ liệu Speaking được lưu trong Lesson.content với type: 'SPEAKING'. Cấu hình được chia tách rõ ràng cho 2 con AI.
A. Lesson Schema (MongoDB Update)
// models/Lesson.js
{
  title: "Speaking Mission: Report Lost Luggage",
  type: "SPEAKING",
  unitId: ObjectId("unit_airport_checkin"),
  
  // NỘI DUNG ĐA HÌNH CHO SPEAKING
  content: {
    // 1. Kịch bản & Nhiệm vụ (Briefing)
    missionTitle: "Báo mất hành lý",
    missionDescription: "Bạn không thấy vali màu xanh trên băng chuyền. Hãy báo với nhân viên hải quan tên là John.",
    
    // 2. Cấu hình "Bộ não" (OpenAI Realtime - Conversational Flow)
    aiConfig: {
      roleName: "Officer John",
      voiceId: "alloy", // Giọng nam trầm ổn
      temperature: 0.7, // Độ sáng tạo vừa phải
      firstMessage: "Excuse me, sir. You look lost. Can I help you?",
      // System Prompt định hình hành vi (Context Injection)
      systemInstruction: "You are a helpful airport officer. The user lost a blue luggage. Ask for their flight number and bag description. Don't correct their grammar instantly, let the conversation flow."
    },

    // 3. Cấu hình "Đôi tai" (Azure AI Speech - Grading)
    gradingConfig: {
      referenceText: null, // Để null cho chế độ Free Talk (Unscripted)
      gradingSystem: "FivePoint", // Thang điểm 5
      granularity: "Phoneme", // Chấm chi tiết đến từng âm vị
      enableProsodyAssessment: true, // Bật chấm ngữ điệu (trọng âm, nhịp điệu)
      
      // [QUAN TRỌNG] Các từ khóa bắt buộc phải nói được
      requiredKeywords: ["luggage", "flight", "lost", "blue"],
      
      // Mapping từ khóa sang Concept ID để tracking lỗi
      keywordConceptMap: [
        { word: "luggage", conceptId: ObjectId("concept_luggage_id") },
        { word: "flight", conceptId: ObjectId("concept_flight_id") }
      ]
    },

    // 4. Gợi ý (Scaffolding - Hỗ trợ lúc bí từ)
    hints: [
      { vi: "Tôi bị mất hành lý", en: "I lost my luggage" },
      { vi: "Chuyến bay VN123", en: "Flight VN123" }
    ]
  }
}


3. Quy trình Học tập (The User Flow)
Chặng 1: Briefing (Nhận nhiệm vụ)
UI: Hiển thị Card nhiệm vụ + List từ vựng mục tiêu (Target Vocab) cần sử dụng.
Action: User bấm "Start Call".
Chặng 2: Realtime Action (Thực chiến với OpenAI)
Công nghệ: OpenAI Realtime API (Websocket).
Trải nghiệm: Hội thoại 1:1 thời gian thực, độ trễ < 500ms (cảm giác như gọi điện thật).
Client Logic:
Frontend stream audio lên OpenAI để hội thoại.
Frontend đồng thời ghi âm (Record) luồng audio của User thành file .wav chất lượng cao để dành cho bước chấm điểm.
Chặng 3: Precision Grading (Chấm điểm Async)
Ngay sau khi user bấm "End Call", hệ thống backend thực hiện quy trình phân tích:
Logical Analysis (OpenAI GPT-4o):
Input: Transcript cuộc hội thoại.
Task: "User có báo được mất hành lý không? User có mô tả được màu sắc vali không?"
Output: Điểm hoàn thành nhiệm vụ (Task Completion Score).
Pronunciation Analysis (Azure AI Speech):
Input: File ghi âm User + Transcript (hoặc List Keyword).
API: Pronunciation Assessment (Unscripted Mode).
Output JSON:
Accuracy: Điểm phát âm từng âm tiết.
Fluency: Độ trôi chảy (phát hiện ậm ừ, ngắt quãng).
Prosody: Điểm ngữ điệu (User có nói như robot không?).
WordErrors: Danh sách từ phát âm sai (Mispronunciation).
Chặng 4: The Dashboard (Báo cáo tổng hợp)
Giao diện kết quả chia làm 2 cột:
Cột 1: Nội dung (Communicative)
✅ Nhiệm vụ: Hoàn thành.
✅ Từ vựng: Đã dùng 3/4 từ khóa.
⚠️ Ngữ pháp: Nhầm lẫn "lose" và "lost".
Cột 2: Kỹ thuật (Phonological - Azure)
🗣️ Phát âm: 85/100.
🎵 Ngữ điệu: 70/100 (Nhận xét: "Bạn nói hơi ngang, hãy nhấn giọng vào từ quan trọng").
🔴 Heatmap: User bấm vào từ "Luggage" đang đỏ $\rightarrow$ Nghe lại đoạn mình nói VS. Giọng bản xứ.

4. Cơ chế Tracking & Feedback Loop (No-Neo4j Update)
Thay vì dùng Neo4j, chúng ta sử dụng UserLessonProgress và Concept trong MongoDB.
Phát hiện lỗi: Azure trả về user phát âm sai từ "Luggage" (Accuracy < 60).
Truy vết: Hệ thống tìm trong gradingConfig.keywordConceptMap để lấy conceptId của "Luggage".
Lưu vết (Tracking):
Update bảng UserLessonProgress của bài Speaking này.
Push conceptId vào mảng weakConceptsDetected.
Hệ quả (Adaptive):
Hệ thống tự động kích hoạt "Pronunciation Drill" (Bài tập luyện âm) cho từ "Luggage" vào phiên học ngày hôm sau.

5. Tech Stack & Điểm "Wow"
Thành phần
Công nghệ
Vai trò & Lý do chọn
Conversation Core
OpenAI Realtime API
Xử lý hội thoại tự nhiên, phản xạ nhanh như người thật. Đóng vai trò "Bạn diễn".
Grading Engine
Azure AI Speech
"Thầy giáo khó tính". Chấm điểm Unscripted tốt nhất thị trường. Cung cấp chỉ số Prosody (ngữ điệu) mà OpenAI chưa có.
Logic Analysis
GPT-5.2
Phân tích ngữ nghĩa, kiểm tra xem user có hoàn thành nhiệm vụ (Mission) hay không.
Storage
Cloudflare R2
Lưu trữ file ghi âm phiên học để user nghe lại.
Database
MongoDB
Lưu kết quả chấm điểm chi tiết (JSON) và mapping lỗi sai với Concept.

TỔNG KẾT
Mô hình này là sự kết hợp "Best of Both Worlds":
Sự tự do, phóng khoáng của OpenAI (để user dám nói).


Sự chính xác, tỉ mỉ của Azure (để user nói chuẩn).

 Đây là tiêu chuẩn vàng cho các ứng dụng luyện nói Enterprise hiện nay.



📘 MODULE: READING (CONTEXTUAL & INTERACTIVE)
1. Nguyên lý Giáo dục (Pedagogy)
Áp dụng mô hình Comprehensible Input (Đầu vào dễ hiểu) kết hợp Visual Reinforcement (Củng cố thị giác):
Re-exposure (Tái tiếp xúc): Gặp lại từ vựng vừa học ở bài Vocab ngay trong ngữ cảnh câu văn.
Contextual Meaning: Hiểu nghĩa của từ dựa vào tình huống (thay vì dịch word-by-word).
Audio-Assisted Reading: Nghe và đọc cùng lúc (Immersion) để não bộ liên kết mặt chữ và âm thanh, ngăn chặn việc phát âm sai trong đầu (Subvocalization).

2. Thiết kế Database (Lesson Polymorphic Pattern)
Dữ liệu bài đọc lưu trong Lesson.content với type: 'READING'.
Chúng ta nhúng Glossary (Từ điển mini) trực tiếp vào bài để tính năng "Chạm để dịch" hoạt động tức thì (Zero-latency).
A. Lesson Schema (MongoDB Update)
JavaScript
// models/Lesson.js
{
  title: "Reading: Complaint Email about Lost Luggage",
  type: "READING",
  unitId: ObjectId("unit_airport_checkin"),
  
  // NỘI DUNG ĐA HÌNH CHO READING
  content: {
    // 1. Văn bản chính (HTML/Markdown)
    // Sử dụng thẻ <mark> kèm data-concept-id để tracking
    text: `
      <p>Dear Sir,</p>
      <p>I am writing to complain about the <mark data-concept="concept_delay_id">delay</mark> of flight VN123.</p>
      <p>Furthermore, upon arrival, I discovered my <mark data-concept="concept_luggage_id">luggage</mark> was lost.</p>
    `,

    // 2. Audio dẫn chuyện (OpenAI TTS - Tối ưu chi phí)
    media: {
      audioUrl: "<https://r2.unilish.com/audio/reading_airport_email.mp3>",
      duration: 45.0, // giây
      speed: 1.0
    },

    // 3. Từ điển ngữ cảnh (Pre-generated Glossary)
    // Key là Concept ID. Giúp tính năng "Tap-to-translate" chạy 0ms độ trễ.
    glossary: {
      "concept_delay_id": { 
        word: "delay", 
        definition: "Sự chậm trễ (do máy bay đến muộn)", 
        type: "noun",
        ipa: "/dɪˈleɪ/" 
      },
      "concept_luggage_id": { 
        word: "luggage", 
        definition: "Hành lý (vali, túi xách ký gửi)", 
        type: "noun",
        ipa: "/ˈlʌɡ.ɪdʒ/" 
      }
    }
  },

  // 4. CẤU HÌNH BÀI TẬP ĐỌC HIỂU (Comprehension Check)
  // Sử dụng chuẩn practiceConfig chung của hệ thống
  practiceConfig: {
    mode: "FIXED",
    passingScore: 80,
    questionIds: [ObjectId("q_read_gist"), ObjectId("q_read_detail")]
  },

  // 5. TRACKING
  taughtConcepts: [ObjectId("concept_delay_id"), ObjectId("concept_luggage_id")]
}


3. Quy trình Sản xuất (Backend Workflow)
Quy trình tối ưu chi phí: Dùng OpenAI TTS (giá rẻ) cho Reading, để dành ngân sách ElevenLabs cho Speaking/Listening.
Context Retrieval (Lấy nguyên liệu):
Backend lấy Unit.context: Topic (Airport), Keywords (luggage, delay), Grammar (Past Simple).
Content Generation (GPT-4o/GPT-5-mini):
Prompt: "Viết email phàn nàn (150 từ). Level A2. BẮT BUỘC dùng các từ: [luggage, delay]. Dùng thì Quá khứ đơn. Đánh dấu từ khóa bằng format <mark data-concept='ID'>word</mark>."
Glossary Generation (Tạo từ điển):
Prompt: "Tạo định nghĩa tiếng Việt ngắn gọn cho các từ khóa trên, phù hợp chính xác với ngữ cảnh bài văn này."
Output: JSON object mapping Concept ID -> Definition.
Audio Narration (OpenAI TTS):
API: v1/audio/speech.
Model: tts-1 (Chuẩn, rẻ).
Voice: Onyx (Nam trầm, nghiêm túc) hoặc Nova (Nữ, tự nhiên) để đọc văn bản dẫn chuyện.

4. Quy trình Học tập (User Flow)
Chặng 1: Active Reading (Đọc chủ động)
Giao diện: Văn bản hiển thị sạch sẽ, các từ khóa (Target Vocab) được tô nền màu vàng nhẹ.
Hành động:
User bấm nút Play $\rightarrow$ Nghe giọng đọc mẫu.
Mắt dõi theo văn bản.
Lợi ích: Ngăn chặn việc phát âm sai trong đầu (Subvocalization).
Chặng 2: Instant Lookup (Tra cứu tức thì)
Vấn đề: Google Translate thường dịch sai ngữ cảnh (VD: "Book a flight" dịch là "Quyển sách").
Giải pháp (Zero-Latency Contextual Lookup):
User chạm vào từ <mark>delay</mark>.
App lấy dữ liệu từ content.glossary (đã tải sẵn ở Client) hiển thị Popup ngay lập tức.
Kết quả: "Sự chậm trễ (do máy bay đến muộn)" - Chính xác 100% theo ngữ cảnh.
Chặng 3: Comprehension Check (Kiểm tra hiểu)
User làm bài tập ngay bên dưới bài đọc (dựa trên practiceConfig).
Dạng câu hỏi:
Gist: "Mục đích chính của email này là gì?" (Complain vs Thank).
Detail: "Chuyến bay số hiệu bao nhiêu bị delay?".

5. Tech Stack & Điểm "Wow" (Selling Points)
Thành phần
Công nghệ
Vai trò & Lợi ích
Generator
GPT-5.2
Viết văn bản, đánh dấu từ khóa tự động.
Narration
OpenAI TTS (tts-1)
Giọng đọc tự nhiên, rẻ hơn 5 lần so với ElevenLabs. Tối ưu chi phí cho Startup.
Dictionary
Pre-generated JSON
[WOW] Zero-Latency Lookup: Tra từ tốc độ 0ms, hoạt động offline (sau khi load bài), độ chính xác ngữ nghĩa 100%.
Tracking
Concept ID
Khi user tra từ "Delay", hệ thống ghi nhận user đang quan tâm/chưa thuộc Concept này để nhắc lại sau.
Frontend
HTML Parser
Render văn bản có thẻ <mark> và xử lý sự kiện Touch/Click mượt mà.

TỔNG KẾT LUỒNG DỮ LIỆU (THE CONTEXTUAL FLOW)
Đây là mảnh ghép hoàn thiện bức tranh ngữ cảnh:
Vocab: Học từ "Luggage" (Hình ảnh + Âm thanh).
Reading (Module này): Thấy từ "Luggage" sống trong một email phàn nàn thực tế.
Grammar: Học thì "Quá khứ đơn" (để hiểu tại sao email viết là delayed, lost).
Listening: Nghe hội thoại giải quyết vụ mất hành lý.
Speaking: Đóng vai khách hàng đi đòi hành lý.
$\rightarrow$ Mọi thứ liên kết chặt chẽ, tạo nên hệ sinh thái Deep Contextual Learning.
📘 MODULE: WRITING (PROCESS & SCAFFOLDING)
1. Nguyên lý Giáo dục (Pedagogy)
Áp dụng mô hình Process Writing (Viết theo quy trình) kết hợp Scaffolding (Giàn giáo hỗ trợ):
Guided Writing (Viết có hướng dẫn): Khởi động bằng việc sắp xếp câu hoặc viết lại câu (Sentence Building) để ôn cấu trúc.
Constraint-Based Writing (Viết theo ràng buộc): Viết đoạn văn hoàn chỉnh nhưng BẮT BUỘC phải sử dụng các từ vựng/ngữ pháp đã học trong Unit.
Comparative Feedback (Phản hồi so sánh): Cung cấp bài mẫu chuẩn bản xứ (Native Rewrite) ngay bên cạnh bài của user để họ tự nhận ra sự khác biệt về văn phong (Collocation, Tone).

2. Thiết kế Database (Lesson Polymorphic Pattern)
Dữ liệu bài Writing được lưu trong Lesson.content với type: 'WRITING'.
A. Lesson Schema (MongoDB Update)
JavaScript
// models/Lesson.js
{
  title: "Writing: Email to Airline Customer Service",
  type: "WRITING",
  unitId: ObjectId("unit_airport_checkin"),
  
  // NỘI DUNG ĐA HÌNH CHO WRITING
  content: {
    // 1. Cấu hình đề bài
    prompt: "Viết email phàn nàn gửi hãng hàng không về việc chuyến bay VN123 bị trễ và bạn bị thất lạc hành lý.",
    config: {
      minWords: 50,
      maxWords: 150,
      format: "EMAIL", // ESSAY, STORY, CHAT
      tone: "FORMAL"   // CASUAL, NEUTRAL
    },

    // 2. Ràng buộc (Constraints) - Map với Concept ID để Tracking
    // User bắt buộc phải dùng các từ này mới được điểm tối đa
    requiredConcepts: [
      { 
        conceptId: ObjectId("concept_luggage_id"), 
        keyword: "luggage", // Từ hiển thị gợi ý
        points: 10 // Điểm thưởng nếu dùng đúng
      },
      { 
        conceptId: ObjectId("concept_delay_id"), 
        keyword: "delay",
        points: 10
      }
    ],
    
    // Ràng buộc ngữ pháp (AI sẽ check)
    requiredGrammar: "Past Simple", 

    // 3. Giàn giáo (Scaffolding) - Gợi ý mở đầu
    sentenceStarters: [
      "Dear Customer Service Team,",
      "I am writing to express my dissatisfaction with..."
    ],

    // 4. Bài tập khởi động (Warm-up)
    // Tái sử dụng Question Model nhưng nhúng trực tiếp để load nhanh
    warmupTasks: [
      {
        type: "UNSCRAMBLE",
        words: ["flight", "was", "My", "delayed", "yesterday"],
        correct: "My flight was delayed yesterday."
      }
    ]
  },
  
  // Metadata
  taughtConcepts: [ObjectId("concept_luggage_id"), ObjectId("concept_delay_id")]
}


3. Quy trình Sản xuất (Backend Workflow)
Quy trình tạo bài tập Writing tự động dựa trên ngữ cảnh Unit.
Context Retrieval (Lấy nguyên liệu):
Backend lấy Unit.context: Topic (Airport), Vocab (Luggage, Delay), Grammar (Past Simple).
Prompt Generation (GPT-4o):
Prompt: "Tạo bài tập viết Email trình độ A2. Chủ đề: Airport. Yêu cầu user dùng thì Quá khứ đơn. Liệt kê 3 câu xáo trộn từ (Scramble) liên quan để làm warm-up."
Validation & Save:
Backend nhận JSON từ AI.
Tự động map các từ khóa (luggage, delay) với Concept ID có sẵn trong DB.
Lưu vào Lesson.

4. Quy trình Học tập (User Flow)
Chặng 1: Warm-up (Khởi động)
Giao diện: Game kéo thả từ ngữ (Drag & Drop).
Nhiệm vụ: Sắp xếp luggage / my / lost / I $\rightarrow$ "I lost my luggage."
Mục đích: Kích hoạt trí nhớ về cấu trúc câu (Syntax) và từ vựng trước khi viết dài.
Chặng 2: The Editor (Soạn thảo thông minh)
Giao diện: Textarea + Sidebar bên phải.
Keyword Tracker (Sidebar): Danh sách requiredConcepts (Luggage, Delay).
Realtime Interaction:
User gõ: "I arrived late and my luggage..."
Frontend (Regex): Phát hiện từ "luggage" $\rightarrow$ Sidebar hiện dấu ✅ xanh lá và thanh tiến độ tăng lên.
Tác dụng: Visual Motivation (Động lực thị giác), khuyến khích user chèn từ mới học vào bài.
Chặng 3: AI Assessment & Native Rewrite
Action: User bấm "Submit".


Backend Processing:


Lưu nội dung vào UserTestAttempt.
Gửi sang GPT-5.2 để chấm điểm.
AI Prompt:


 "Đóng vai giám khảo IELTS. Chấm điểm bài viết này (0-100). Kiểm tra xem user có dùng từ [luggage, delay] và thì Past Simple không.

 Quan trọng: Hãy viết lại (Rewrite) bài này theo văn phong tự nhiên của người bản xứ (Native Speaker), giữ nguyên ý nhưng sửa lỗi và nâng cấp từ vựng."



Chặng 4: The "Magic Fix" (Kết quả)
Giao diện Diff View (So sánh 2 cột):
Bài của bạn (User)
Bài sửa của AI (Native Rewrite)
"I wait for my bag but it not come."
"I waited for my luggage, but it did not arrive."
(Lỗi: Sai thì, dùng từ 'bag' sơ sài)
(AI dùng 'luggage', 'arrive', quá khứ đơn)

Feedback: User bấm vào chỗ bôi đỏ để xem giải thích: "Dùng 'bag' không sai, nhưng trong ngữ cảnh hàng không, 'luggage' chuyên nghiệp hơn."
Tracking: Nếu bài viết đạt điểm > 80, hệ thống update status='COMPLETED' cho Lesson này.

5. Tech Stack & Kiến trúc
Thành phần
Công nghệ
Vai trò
Grader Logic
GPT-5.2
Model mạnh nhất để xử lý lý luận (Reasoning) và sửa văn phong (Stylistic correction).
Diff Engine
diff-match-patch
Thư viện (Google JS) để so sánh chuỗi văn bản User vs AI, tạo hiệu ứng Highlighting sự khác biệt.
Editor UI
React Textarea
Xử lý logic highlight từ khóa realtime (Regex Client-side).
Data Storage
UserTestAttempt
Lưu trữ toàn bộ lịch sử bài viết và bài sửa của AI để user review sau này.

TỔNG KẾT HỆ SINH THÁI UNILISH (CONTEXTUAL LEARNING ECOSYSTEM)
Đây là thiết kế cho một hệ thống giáo dục Đồng nhất (Cohesive) và Khép kín (Closed Loop):
Vocab: Nạp dữ liệu (Luggage, Delay).
Reading: Thấy dữ liệu trong ngữ cảnh thụ động (Đọc email phàn nàn).
Grammar: Hiểu quy luật cấu tạo dữ liệu (Quá khứ đơn).
Listening: Nghe dữ liệu trong hội thoại cảm xúc (Nghe loa sân bay).
Speaking: Dùng dữ liệu để giao tiếp (Roleplay báo mất đồ).
Writing: Dùng dữ liệu để tư duy và trình bày (Viết email đòi bồi thường).
$\rightarrow$ Kết quả: Người học làm chủ hoàn toàn ngữ cảnh đó, không học vẹt.

