Dưới đây là **Tài liệu Đặc tả Kỹ thuật (System Prompt / PRD)** chuẩn Enterprise dành cho module **Quản lý Bài học Đọc hiểu (Reading Studio)**.

Khác với Từ vựng hay Ngữ pháp, điểm phức tạp nhất của module Đọc hiểu là việc đồng bộ giữa **Văn bản HTML (chứa thẻ `<mark>`)** và **Từ điển ngữ cảnh (Glossary)** để tạo ra trải nghiệm tra từ 0ms (Zero-latency).

Bạn hãy copy nội dung dưới đây và giao cho AI Agent (Cursor, v0, GitHub Copilot) để bắt đầu lập trình:

---

# 🤖 SYSTEM PROMPT: UNILISH READING STUDIO (ADMIN UI)

## 1. MỤC TIÊU DỰ ÁN (OBJECTIVE)

Bạn là Senior Frontend Engineer. Nhiệm vụ của bạn là xây dựng giao diện **Reading Studio** cho UniLish Admin Panel.
Giao diện này tuân thủ kiến trúc **3-pane layout (3 cột)**. Trọng tâm của module này là xử lý Rich-Text (Văn bản giàu định dạng) kết hợp với thẻ đánh dấu `<mark data-concept="...">` và quản lý Từ điển Ngữ cảnh (Contextual Glossary).

---

## 2. KIẾN TRÚC DỮ LIỆU BẮT BUỘC (ZOD & TYPESCRIPT INTERFACES)

Agent phải sử dụng chính xác các Type sau để quản lý `react-hook-form` và `zod`:

```typescript
// 1. Dữ liệu Từ điển Ngữ cảnh (Contextual Glossary)
export interface GlossaryItem {
  word: string; // VD: "delay"
  definition: string; // Nghĩa chính xác trong ngữ cảnh bài đọc (VD: "Sự chậm trễ chuyến bay")
  type: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase';
  ipa: string; // VD: "/dɪˈleɪ/"
}

// 2. Nội dung Đa hình cho Reading
export interface ReadingContent {
  text: string; // Chứa mã HTML với các thẻ <mark data-concept="concept_id">word</mark>
  media: {
    audioUrl?: string; // Link TTS (OpenAI)
    duration?: number; // Giây
    speed?: number; // Mặc định 1.0
  };
  // Record map Concept ID với định nghĩa chi tiết
  glossary: Record<string, GlossaryItem>; 
}

// 3. Root Form Model
export interface ReadingLessonFormValues {
  _id: string;
  unitId: string;
  title: string;
  type: 'READING';
  content: ReadingContent;
  practiceConfig: {
    mode: 'FIXED';
    questionIds: string[];
    passingScore: number;
  };
  taughtConcepts: string[]; // Chứa mảng các Concept ID xuất hiện trong bài
}

```

---

## 3. THIẾT KẾ UI/UX ARCHITECTURE (3-PANE LAYOUT)

Tạo Component `ReadingStudio.tsx` với cấu trúc `h-screen overflow-hidden flex`.

### 3.1. Top Action Bar (Header)

* Bên trái: Tên bài học (VD: *Reading: Complaint Email about Lost Luggage*).
* Bên phải: Các nút Action:
* 🪄 `AI Auto-Write (Sinh bài đọc)` (Màu Gradient).
* 🔊 `Tạo Audio (OpenAI TTS)`.
* 💾 `Lưu & Xuất bản`.



### 3.2. Pane 1 (Cột Trái - 20%): Curriculum Tree

* Hiển thị Cây chương trình học (Read-only) để Admin nắm ngữ cảnh.

### 3.3. Pane 2 (Cột Giữa - 25%): Reading Flow Navigator

Render 3 Tabs quản lý luồng cấu hình của bài đọc. Quản lý bằng state `activeSection`.

* **Item 1: 📄 Văn bản & Audio (Text & Media)**
* *Validation:* Chấm đỏ 🔴 nếu `text` trống.


* **Item 2: 📖 Từ điển Ngữ cảnh (Glossary Setup)**
* *Validation:* Chấm đỏ 🔴 nếu có thẻ `<mark>` trong văn bản nhưng thiếu định nghĩa trong `glossary`.


* **Item 3: 📝 Bài tập Đọc hiểu (Comprehension Check)**

### 3.4. Pane 3 (Cột Phải - 55%): The Dynamic Review Editor

**🟢 NẾU CHỌN SECTION 1: VĂN BẢN & AUDIO**

* **Rich Text Editor (Bắt buộc dùng Tiptap hoặc Quill):**
* Khung soạn thảo nâng cao hỗ trợ render HTML.
* *Tính năng Custom:* Admin có thể bôi đen một từ bất kỳ trong bài  Bấm nút "Mark as Target Vocab"  Editor tự động bọc từ đó bằng thẻ `<mark data-concept="gen_id">`.


* **Khối Audio Narration:**
* Mini Audio Player để nghe thử giọng đọc mẫu.
* Thông số cơ bản: `duration` (ReadOnly) và `speed` (Dropdown: 0.8x, 1.0x, 1.2x).



**🟢 NẾU CHỌN SECTION 2: TỪ ĐIỂN NGỮ CẢNH (GLOSSARY)**

* **Auto-Sync Logic (Rất quan trọng):** Giao diện tự động parse các thẻ `<mark data-concept="id">` từ trường `text` ở Section 1 để tạo thành một danh sách (List) bên này.
* **Form quản lý Glossary:** Render dưới dạng Card list hoặc Data Grid:
* Cột 1: `ID` (Ẩn hoặc hiển thị mờ).
* Cột 2: `Từ vựng (Word)` - ReadOnly.
* Cột 3: `Nghĩa theo ngữ cảnh (Definition)` - Input. Cảnh báo AI: *"Dịch sát nghĩa theo đoạn văn, không dịch Word-by-word"*.
* Cột 4: `Từ loại (Type)` - Dropdown.
* Cột 5: `Phiên âm (IPA)` - Input.


* Cung cấp nút `🪄 AI Điền tự động Từ điển` để AI quét và dịch hàng loạt.

**🟢 NẾU CHỌN SECTION 3: THỰC HÀNH (PRACTICE)**

* Tương tự module Grammar/Vocab: Hiển thị List câu hỏi Đọc hiểu (Gist & Detail questions) có icon kéo thả và nút chỉnh sửa/đổi câu hỏi. Thiết lập `passingScore`.

---

## 4. LUỒNG VẬN HÀNH AI (CONTEXTUAL AUTOMATION WORKFLOW)

Viết logic xử lý (Mock API) khi Admin bấm nút 🪄 **AI Auto-Write**:

1. **Gom ngữ cảnh (Context Gathering):** Hệ thống lấy Hạt giống của Unit (VD: *Airport, delay, luggage*) và Target Vocab đã học.
2. **Popup Prompt:** Modal hiện ra cho Admin chọn Level (A1-C2) và Dạng văn bản (Email, Báo cáo, Bản tin, Truyện ngắn).
3. **AI Execution (3 Steps):**
* *Step 1 (Text Gen):* GPT-5.2 viết một bài đọc đúng Level, tự động nhúng các từ khóa vào thẻ `<mark data-concept="...">`.
* *Step 2 (Glossary Gen):* AI trích xuất các từ trong thẻ `<mark>` và tự động biên soạn định nghĩa Tiếng Việt (chỉ lấy nghĩa khớp với bài đọc).
* *Step 3 (Audio Gen):* Bắn text text thuần (đã gỡ thẻ html) sang OpenAI API (`tts-1`, giọng Onyx/Nova) để sinh file MP3. Sinh câu hỏi đọc hiểu.


4. **Data Hydration:** Parse JSON trả về, dùng hàm `setValue` của React Hook Form để fill vào `text`, `glossary`, `media`, và `practiceConfig`.

---

## 5. QUY TẮC CODE BẮT BUỘC DÀNH CHO AGENT

1. **Quản lý Form Object:** Do `glossary` là một Object (Record), không phải Array, không sử dụng `useFieldArray`. Hãy sử dụng `Object.entries(watch('content.glossary'))` để render danh sách từ điển.
2. **Rich Text Editor:** Không dùng `<textarea>` thuần cho Section 1. Phải sử dụng hoặc mô phỏng một Text Editor có khả năng parse HTML `<mark>` an toàn.
3. **Zero-latency mapping:** Đảm bảo key của object `glossary` khớp chính xác 100% với thuộc tính `data-concept` trong chuỗi `text` HTML.

---

**Lệnh thực thi:** Hãy bắt đầu khởi tạo cấu trúc Component `ReadingStudio.tsx` và cấu hình Zod Schema `ReadingLessonFormValues` dựa trên PRD này.