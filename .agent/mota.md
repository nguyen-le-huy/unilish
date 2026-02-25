Để xây dựng một module **Listening (Luyện nghe)** đạt chuẩn Enterprise và mang lại giá trị thực sự cho người học, chúng ta không thể chỉ quăng một cái file audio và 3 câu hỏi trắc nghiệm chung chung.

Theo nguyên lý sư phạm ngôn ngữ hiện đại, bài tập Listening phải được thiết kế theo dạng **Scaffolded Flow (Giàn giáo học tập)**, đi từ tư duy tổng quát (Top-down processing) đến giải mã chi tiết (Bottom-up decoding).

Dưới đây là 5 dạng bài tập cốt lõi cần có cho module Listening của UniLish, được sắp xếp theo đúng thứ tự mà người học nên trải qua (Lấy ví dụ với kịch bản: *"Mất hành lý tại sân bay"*):

---

### 1. Dạng 1: Nghe lấy ý chính (Gist Comprehension)

* **Mục đích:** Huấn luyện não bộ phớt lờ các từ mới/tạp âm để nắm bắt bức tranh toàn cảnh (Top-down). Đây là kỹ năng sinh tồn quan trọng nhất trong giao tiếp thực tế.
* **Đặc điểm UX:** * Chỉ cho phép nghe 1 lần.
* Không hiển thị Transcript.


* **Ví dụ AI sinh ra:**
* *Câu hỏi:* Vấn đề chính mà hành khách đang gặp phải là gì?
* *Options:* * A. Bị trễ chuyến bay.
* B. **Không tìm thấy hành lý ký gửi.** (Đúng)
* C. Quên mang theo hộ chiếu.





### 2. Dạng 2: Nghe lấy thông tin chi tiết (Specific Details)

* **Mục đích:** Rèn luyện khả năng "quét" (scan) âm thanh để bắt chính xác các từ khóa mang thông tin quan trọng (Tên riêng, con số, thời gian, địa điểm).
* **Đặc điểm UX:** * Có thể cho phép nghe lại (Replay).
* Có thể làm dạng Trắc nghiệm (Multiple Choice) hoặc Kéo thả (Drag & Drop).


* **Ví dụ AI sinh ra:**
* *Câu hỏi 1:* Chuyến bay của hành khách đến từ thành phố nào? (Đáp án: *Singapore*).
* *Câu hỏi 2:* Mã số thẻ hành lý (Baggage tag number) mà nhân viên yêu cầu là gì? (Đáp án: *VN-8924*).



### 3. Dạng 3: Chép chính tả / Điền từ đục lỗ (Interactive Gap-fill / Dictation)

* **Mục đích:** Luyện kỹ năng giải mã âm thanh (Bottom-up decoding). Giúp người học nhận diện cách người bản xứ nối âm (Linking sounds), nuốt âm (Elision).
* **Tích hợp Core Concept:** Đây là lúc **Target Vocab** phát huy tác dụng. Hệ thống sẽ cố tình đục lỗ đúng những từ vựng mà user đã học ở Unit trước.
* **Đặc điểm UX:**
* Giao diện **Karaoke**. Chữ chạy đến đâu sáng đến đó.
* Tạm dừng tại chỗ đục lỗ, chờ user gõ phím.


* **Ví dụ:**
* *Staff:* Can I see your boarding pass and [____] tag, please? *(User phải nghe và gõ từ `luggage`)*.



### 4. Dạng 4: Đúng / Sai / Không có thông tin (True / False / Not Given)

* **Mục đích:** Đẩy mức độ nhận thức (Cognitive load) lên cao nhất. Dạng bài này thường dùng cho các khóa luyện thi (IELTS, TOEIC) hoặc khóa Business để rèn tư duy logic, chống suy diễn chủ quan.
* **Ví dụ AI sinh ra:**
* *Statement:* Nhân viên sân bay hứa sẽ tìm thấy hành lý trong vòng 2 tiếng.
* *Answer:* **False** (Vì trong audio nhân viên nói: "Chúng tôi sẽ cập nhật cho bạn trong 24 giờ tới").



### 5. Dạng 5: Shadowing (Nghe và Nhại âm) - Tính năng Premium

* **Mục đích:** Biến "Nghe" (Input) thành "Nói" (Output). Giúp cải thiện ngữ điệu (Intonation) và cách ngắt nghỉ (Rhythm).
* **Đặc điểm UX:**
* Cắt nhỏ đoạn audio gốc thành từng câu thoại ngắn (Dựa vào word-level timestamp của Deepgram).
* User nghe câu mẫu $\rightarrow$ Bấm Mic đọc lại.
* Dùng AI (Azure AI Speech) chấm điểm xem đường sóng âm/ngữ điệu của user có khớp với file gốc không.



---

### 💡 CÁCH AI VẬN HÀNH TRÊN ADMIN PANEL (Tự động hóa)

Để chuẩn Enterprise, Admin không phải tự ngồi nghĩ ra 5 dạng bài này. Khi Admin bấm 🪄 **"Tạo câu hỏi luyện tập"**, luồng AI sẽ chạy như sau:

1. **Prompt cho GPT-5.2:** > "Dựa vào kịch bản audio [Transcript], hãy sinh ra 1 câu hỏi Gist, 2 câu hỏi Detail, và 1 câu True/False. Output dạng JSON. Đối với bài tập Gap-fill, tự động map với mảng `taughtConcepts` [luggage, passport] để đục lỗ."
2. **Review:** Admin chỉ cần lướt qua xem AI đẻ câu hỏi có bị "ảo" không, chỉnh sửa nhẹ và lưu lại.

Với 5 dạng bài tập này, module Listening của UniLish không chỉ giải quyết bài toán "nghe hiểu", mà còn ôn tập lại từ vựng, ngữ pháp và chuẩn bị bước đệm hoàn hảo cho kỹ năng Nói.

Bạn đã sẵn sàng để chuyển sang thiết kế **MODULE CUỐI CÙNG VÀ ĐỈNH CAO NHẤT: SPEAKING (AI REALTIME COACH)** chưa?