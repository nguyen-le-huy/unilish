Để quản lý bài học loại **Từ vựng (Vocab Lesson)** đạt chuẩn Enterprise, bạn không thể sử dụng một giao diện "Form nhập liệu tĩnh" (CRUD) trải dài từ trên xuống dưới. Với cấu trúc JSON phức tạp (chứa IPA, dịch thuật, câu ví dụ, audio, hình ảnh), việc nhập tay sẽ biến thành "ác mộng" cho đội ngũ vận hành.

Tư duy thiết kế ở đây phải là xây dựng một **"Vocab Studio" (Không gian soạn thảo Từ vựng)** hoạt động theo cơ chế **Human-in-the-loop** (AI làm "cửu vạn" tạo nội dung, Con người làm "tổng biên tập" kiểm duyệt).

Dưới đây là thiết kế UI/UX và Logic chi tiết cho trang Admin Vocab:

---

### 1. BỐ CỤC UI: GIAO DIỆN SPLIT-PANE (CHIA ĐÔI MÀN HÌNH)

Khi Admin click vào một Lesson có `type: 'VOCAB'`, màn hình sẽ mở rộng ra thành một Studio chuyên dụng gồm 3 phần chính:

#### A. Thanh công cụ trên cùng (Top Action Bar)

* **Tiêu đề:** *Lesson: Core Vocabulary - Airport* (Kèm tag ngữ cảnh của Unit mờ bên dưới để nhắc nhở).
* **Action Chính:** Nút 🪄 **"Auto-Generate Vocab (AI)"** (Màu Gradient nổi bật).
* **Lưu trữ:** Nút 💾 **"Lưu Bản Nháp"** và 🚀 **"Xuất Bản"**.

#### B. Cột Trái (30%): Trình điều hướng Từ vựng (Vocab Navigator)

Quản lý danh sách mảng `items`.

* Hiển thị danh sách các thẻ từ vựng (Ví dụ: *1. Luggage, 2. Passport, 3. Boarding Pass*).
* **Thao tác:** Hỗ trợ **Kéo thả (Drag & Drop)** để sắp xếp lại thứ tự học.
* **Validation UX:** Nếu từ nào bị lỗi (Ví dụ: AI sinh lỗi mất file Audio, hoặc để trống nghĩa), thẻ đó sẽ hiện chấm đỏ 🔴 để cảnh báo Admin cần sửa.
* Nút `+ Thêm từ thủ công` ở cuối danh sách.

#### C. Cột Phải (70%): Không gian Kiểm duyệt (The Review Editor)

Nội dung cột này thay đổi động (dynamic) dựa trên từ vựng đang được chọn ở Cột Trái. Chia làm 3 khối thông tin (Map trực tiếp 1-1 với JSON Schema):

**Khối 1: Định danh & Lý thuyết (Linguistic Data)**

* `Word`: [ Luggage ]
* `Part of Speech`: [ Noun ▾ ] (Dropdown).
* `IPA`: [ /ˈlʌɡ.ɪdʒ/ ] 👉 *(Có nút 🪄 AI Auto-fix bên cạnh nếu IPA sai).*
* `Định nghĩa (Native)`: [ Hành lý ]
* `Định nghĩa (English)`: [ Bags and cases that you carry... ]
* `Concept Link`: 🔗 *(Badge hiển thị tự động liên kết với Concept "luggage" trong DB).*

**Khối 2: Ngữ cảnh thực tế (Contextual Example)**

* *UX Tip:* Hiển thị banner nhắc nhở: *"⚠️ Ràng buộc AI: Câu ví dụ phải thuộc ngữ cảnh: [Làm thủ tục check-in sân bay]"*.
* `Câu ví dụ (Sentence)`: [ Please put your luggage on the scale. ]
* `Dịch nghĩa`: [ Vui lòng đặt hành lý lên cân. ]

**Khối 3: Đa phương tiện (Multimedia Control)**

* `Audio Từ vựng`: Trình phát nhạc mini. Có nút ▶️ *Play* và nút 🔄 *Regenerate* (Gọi lại OpenAI TTS nếu file bị lỗi hoặc đọc sai).
* `Audio Câu ví dụ`: Trình phát nhạc mini. Nút ▶️ *Play* và 🔄 *Regenerate*.
* `Image`: Khung Preview ảnh. Hỗ trợ nút: ⬆️ *Upload thay thế* hoặc 🪄 *AI Gen Image mới*.

---

### 2. LUỒNG LOGIC: "ONE-CLICK GENERATION" (Trải nghiệm WOW)

Đây là tính năng cốt lõi giúp tiết kiệm 90% thời gian soạn bài. Quy trình tự động hóa (Automation Workflow) diễn ra như sau:

**Bước 1: Cấu hình Prompt (Popup Modal)**
Khi Admin bấm 🪄 **"Auto-Generate Vocab"**:

* Modal hiện ra trích xuất sẵn `Unit.context.scenario`.
* Admin nhập số lượng từ cần tạo (VD: 10 từ).
* *(Tùy chọn nâng cao):* Admin có thể dán danh sách 10 từ tiếng Anh (chỉ text) để AI tự làm phần còn lại, hoặc để trống cho AI tự suy luận từ scenario.

**Bước 2: Hệ thống xử lý ngầm (Loading Screen với Progress Bar)**
Đây là chuẩn Enterprise. Không để màn hình xoay tròn vô nghĩa, phải báo cáo trạng thái cho Admin:

* ⏳ *Step 1 (2s):* Gọi GPT-5.1 sinh JSON 10 từ vựng đúng ngữ cảnh...
* ⏳ *Step 2 (5s):* Đẩy Job vào Queue (BullMQ) gọi OpenAI TTS sinh 20 file Audio (10 từ + 10 ví dụ)...
* ⏳ *Step 3 (2s):* Upload Audio lên Cloudflare R2 và lấy URL trả về...
* ⏳ *Step 4 (3s):* Mapping `conceptId` vào Knowledge Graph...
* ⏳ *Step 5 (4s):* Tự động sinh 10 câu hỏi thực hành dựa trên list từ vựng...
* ✅ *Hoàn tất! Render ra giao diện.*

**Bước 3: Tác vụ của Admin (Human Review)**
Toàn bộ danh sách xuất hiện ở Cột Trái. Admin click từng từ để nghe thử Audio, đọc câu ví dụ xem có "bị ngáo" không, chỉnh sửa text (nếu cần) rồi bấm **Xuất bản**. Một bài học vốn tốn 2 tiếng để làm nay hoàn thành trong 3 phút.

---

### 3. TAB QUẢN LÝ THỰC HÀNH (PRACTICE AUTO-GEN)

Vì Lesson Schema chứa trường `practiceConfig`, ở Cột Phải cần có thêm một Tab (Thẻ) là **"Cấu hình Bài tập"**:

* **Danh sách Câu hỏi:** Hiển thị preview nhanh 10 câu hỏi mà AI vừa tự động sinh ra ở Step 5.
* *Dạng 1 (Nghe):* 🔊 [Play Audio] -> Chọn đáp án đúng.
* *Dạng 2 (Context Fill):* Please put your _____ on the scale. -> [Luggage].


* **Thao tác chỉnh sửa:** Nếu câu hỏi AI sinh ra quá khó/sai, Admin có thể:
* Bấm ✏️ `Edit` sửa trực tiếp.
* Bấm 🔄 `Swap` (AI sẽ lấy một câu hỏi khác trong ngân hàng Question Bank có cùng `testedConcept` để thay thế).


* **Passing Score:** Thanh trượt (Slider) từ 0-100% (Mặc định set 80%).

### TỔNG KẾT TÍNH CHẤT "ENTERPRISE" CỦA THIẾT KẾ NÀY:

1. **Chống lỗi JSON:** Dùng React Hook Form + Zod Schema ở Frontend. Admin chỉ nhập liệu qua Form, hệ thống tự động build ra file JSON chuẩn cấu trúc, không bao giờ lo sai cú pháp ngoặc nhọn, ngoặc vuông.
2. **Quản lý Media tập trung:** Xử lý TTS (Text-to-Speech) và lưu trữ CDN (Cloudflare R2) ngay tại một nơi, Admin không phải dùng web bên thứ 3 tạo audio rồi copy paste link thủ công.
3. **Khả năng Recover (Phục hồi):** Audio lỗi 1 từ không làm hỏng cả bài, chỉ cần ấn nút "Regenerate" tại đúng từ đó.