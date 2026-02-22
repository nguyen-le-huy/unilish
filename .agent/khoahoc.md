# 🗄️ DATABASE DESIGN CORE (V2.0 - AI OPS & FREEMIUM INTEGRATED)

## 1. TỔNG QUAN SƠ ĐỒ (ARCHITECTURE)

Hệ thống được chia thành 6 nhóm Collections chính với phân tầng rõ ràng:

1. **System & Global:** Dữ liệu gốc rễ (`Language`, `SystemSetting`).
2. **Curriculum Hierarchy:** Cấu trúc khóa học tĩnh (`LearningGoal` $\rightarrow$ `CourseSeries` $\rightarrow$ `Course` $\rightarrow$ `Unit` $\rightarrow$ `Lesson`).
3. **Knowledge Graph:** Lõi kiến thức phân mảnh để AI theo dõi (`Concept`, `Question`).
4. **AI Operations & Tracking:** Vận hành thông minh và bộ nhớ dài hạn (`PlacementResult`, `DailyReviewSession`, `UserConceptState`, `UserTestAttempt`).
5. **User & Business:** Người dùng, thanh toán, khuyến mãi (`User`, `UserCourseEnrollment`, `Coupon`, `Transaction`).
6. **Certification:** Bằng cấp (`Certificate`).

---

## 2. CHI TIẾT SCHEMAS (MONGOOSE MODELS)

### A. Nhóm Hệ thống & Dữ liệu gốc (System & Global)

**1. Language (Collection) - `[NEW]`**

Nền tảng đa ngôn ngữ và cấu hình giọng đọc AI.

```bash
{
  _id: ObjectId,
  code: String, // "en-US", "ja-JP"
  name: String, // "English"
  ttsConfig: {
    provider: { type: String, enum: ['OPENAI', 'AZURE'] }, // Chọn engine tiết kiệm chi phí
    voiceId: String // VD: "alloy"
  },
  isActive: Boolean
}
```

**2. SystemSetting (Collection) - `[UPDATED]`**

Lưu cấu hình Dynamic (như giới hạn gói Freemium) không cần restart server.

```bash
{
  _id: ObjectId,
  key: String, // "SUBSCRIPTION_CONFIG"
  value: Mixed // Chứa JSON cấu hình limits cho FREE và PREMIUM
}
```

### B. Nhóm Cấu Trúc Khóa Học & Mục Tiêu (Curriculum)

**3. LearningGoal (Collection) - `[UPDATED]`**

Định hình chiến lược và nhân cách của AI.

```bash
const mongoose = require('mongoose');
const { Schema } = mongoose;

const LearningGoalSchema = new Schema({
  slug: { type: String, required: true, unique: true, index: true }, 
  title: { type: String, required: true },
  
  // [NEW] Giải thích ngắn gọn hoặc Đối tượng mục tiêu (Map với UI)
  description: { type: String }, 
  targetAudience: { type: String }, // Có thể gộp chung với description tùy bạn
  
  // Mảng chứa các ID Ngôn ngữ mà Mục tiêu này hỗ trợ
  supportedLanguages: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Language',
    index: true 
  }],

  systemPrompt: { type: String, required: true }, 
  
  skillWeights: {
    listening: { type: Number, default: 0.25 },
    speaking:  { type: Number, default: 0.25 },
    reading:   { type: Number, default: 0.25 },
    writing:   { type: Number, default: 0.25 },
    grammar:   { type: Number, default: 0.0 },
    vocabulary:{ type: Number, default: 0.0 }
  },

  // Lưu dưới dạng mảng các string (VD: ["chính tả", "dấu câu"])
  ignoredSkills: [{ type: String }], 
  
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LearningGoal', LearningGoalSchema);
```

**4. CourseSeries (Collection)**

Bộ khóa học cha.

```bash
{
  _id: ObjectId,
  languageId: ObjectId,
  learningGoalId: ObjectId,
  title: String, // "Tiếng Anh Du lịch Toàn diện"
  totalCourses: Number
}
```

**5. Course (Collection)**

Level cụ thể. Đơn vị để cấp chứng chỉ.

```bash
{
  _id: ObjectId,
  seriesId: ObjectId,
  level: String, // "A1", "B1"
  finalExamConfig: {
    durationMinutes: Number,
    passScore: Number,
    structureMatrix: Mixed // Ma trận đề thi (Số câu Vocab, Grammar...)
  }
}
```

**6. Unit (Collection) - `[UPDATED]`**

Container ngữ cảnh cho RAG.

```bash
{
  _id: ObjectId,
  courseId: ObjectId,
  title: String, // "At the Airport"
  contextSeed: { // Hạt giống cho AI sinh nội dung
    scenario: String, keywords: [String]
  },
  vectorId: String // Tham chiếu sang Pinecone cho RAG Chatbot
}
```

**7. Lesson (Collection) - `[UPDATED]`**

Bài học đa hình.

```bash
{
  _id: ObjectId,
  unitId: ObjectId,
  type: String, // "VOCAB", "SPEAKING", "READING"...
  content: Mixed, // JSON nội dung linh hoạt
  taughtConcepts: [ObjectId], // Ref: Concept (Bài này dạy khái niệm gì?)
  practiceConfig: {
    mode: String, // "FIXED" hoặc "DYNAMIC" (AI tự sinh câu hỏi)
    questionIds: [ObjectId]
  }
}
```

### C. Nhóm Knowledge Graph (Kiến thức lõi)

**8. Concept (Collection) - `[NEW]`**

"Nguyên tử" kiến thức để AI theo dõi điểm yếu.

```bash
{
  _id: ObjectId,
  languageId: ObjectId,
  key: String, // "past_simple"
  type: String, // "GRAMMAR", "VOCAB"
  name: String,
  metaData: Mixed
}
```

**9. Question (Collection) - `[NEW]`**

Ngân hàng câu hỏi dùng chung.

```bash
{
  _id: ObjectId,
  languageId: ObjectId,
  testedConcept: ObjectId, // Dùng để biết user sai câu này là yếu Concept nào
  type: String, // "MULTIPLE_CHOICE", "FILL_IN_BLANK"...
  stem: Mixed, // Nội dung câu hỏi
  content: Mixed, // Đáp án
  explanation: String // AI dùng để giải thích
}
```

### D. Nhóm AI Operations & Tracking (Vận hành & Theo dõi)

**10. PlacementResult (Collection)**: Lưu kết quả "khám bệnh" đầu vào và lộ trình AI kê đơn (Start từ A1 hay B1).

**11. DailyReviewSession (Collection)**: Bài ôn tập hàng ngày do AI tự sinh ra dựa trên các Concept sắp quên.

**12. UserConceptState (Collection)**: Bộ nhớ dài hạn (SRS) lưu trữ `masteryLevel` (0-5) và `nextReviewAt` cho từng Concept của từng User.

**13. UserTestAttempt (Collection)**: Lưu bài làm. Bổ sung `aiOverallFeedback` (Lời nhận xét, động viên từ AI Mentor).

### E. Nhóm Business (Kinh doanh & Khuyến mãi)

**14. Coupon (Collection) - `[NEW]`**

Quản lý mã giảm giá cho hệ thống thanh toán.

```bash
{
  _id: ObjectId,
  code: String, // "TET2026"
  discountType: String, // "PERCENTAGE" hoặc "FIXED_AMOUNT"
  value: Number,
  appliesToPlans: [String], // "MONTHLY", "YEARLY"
  usageLimit: Number,
  usedCount: Number,
  isActive: Boolean
}
```

*(Các collections `User`, `UserCourseEnrollment`, `Transaction` giữ nguyên cấu trúc tiêu chuẩn để liên kết thanh toán PayOS và quản lý quyền truy cập Freemium).*

---

## 3. CẤU HÌNH TRỌNG SỐ MỤC TIÊU (LEARNING GOAL SEEDS)

6 mục tiêu lõi sẽ được nạp vào DB để định hình thuật toán AI:

| **Goal Slug** | **Tên Hiển Thị** | **Trọng số Kỹ năng (skillWeights)** | **Chiến lược AI (AI Persona)** |
| --- | --- | --- | --- |
| `travel-survival` | Du lịch & Sinh tồn | Nghe: 35%, Nói: 35%, Đọc: 15%, Viết: 5%, Từ vựng: 5%, Ngữ pháp: 5% | Ưu tiên sửa lỗi phát âm và phản xạ. Bỏ qua lỗi ngữ pháp nhỏ. Giọng điệu thân thiện. |
| `business_work` | Tiếng Anh Công sở | Viết: 35%, Nói: 25%, Đọc: 25%, Nghe: 15% | Tập trung văn phong trang trọng (Formal). Sửa gắt các từ lóng. |
| `exam_ielts` | Luyện thi IELTS | Nghe/Nói/Đọc/Viết: Đều 25% | Đóng vai Examiner khó tính. Chấm điểm khắt khe theo Rubric. |
| `exam_toeic` | Luyện thi TOEIC | Nghe: 50%, Đọc: 50% | Tập trung bắt Keyword, từ vựng thương mại. |
| `exam_thptqg` | Luyện thi THPTQG | Ngữ pháp: 40%, Từ vựng: 30%, Đọc: 30% | Bám sát format đề thi đại học Việt Nam. Sửa kỹ ngữ pháp. |
| `general_comm` | Giao tiếp Đời thường | Nghe: 40%, Nói: 40%, Đọc: 10%, Viết: 10% | Tập trung Slang, Idioms, độ tự nhiên như người bản xứ. |

---

## 4. LUỒNG VẬN HÀNH THÔNG MINH (AI OPERATIONS FLOW)

- **A. Luồng Onboarding (Xếp lớp thông minh):** User chọn Goal $\rightarrow$ Làm Test $\rightarrow$ AI tính điểm dựa trên `skillWeights` của Goal đó $\rightarrow$ Ghi vào `PlacementResult` $\rightarrow$ Mở khóa Course phù hợp.
- **B. Luồng Grading (Chấm & Nhận xét):** Azure chấm phát âm $\rightarrow$ GPT chấm nội dung dựa trên `systemPrompt` (VD: IELTS thì chấm gắt, Travel thì chấm nới lỏng) $\rightarrow$ Lưu `aiOverallFeedback` vào `UserTestAttempt`.
- **C. Luồng Remediation (Chữa bệnh hàng ngày):** Quét `UserConceptState` $\rightarrow$ Tìm Concept sắp quên $\rightarrow$ Gọi AI sinh kịch bản hội thoại mới chứa Concept đó $\rightarrow$ Lưu thành `DailyReviewSession`.
- **D. Luồng Content Generation (Soạn bài):** Admin nhập `contextSeed` vào Unit $\rightarrow$ AI sinh `Lesson.content` $\rightarrow$ Tự động bóc tách từ vựng gán vào `taughtConcepts` $\rightarrow$ Lưu Vector lên Pinecone cho RAG Chatbot.