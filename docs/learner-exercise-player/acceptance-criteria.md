# Tiêu chí nghiệm thu

Mỗi tiêu chí ánh xạ trực tiếp tới requirement: AC-01..02 → FR-01/FR-07; AC-03 → FR-02; AC-04..06 → FR-03/FR-04; AC-07 → FR-05/NFR-01; AC-08 → FR-06; AC-09..10 → FR-07; AC-11..13 → FR-08/FR-09; AC-14 → NFR-01; AC-15..16 → FR-10; AC-17..18 → FR-11/FR-09; AC-19 → FR-12/NFR-02; AC-20 → NFR-04; AC-21 → NFR-03; AC-22 → NFR-05; AC-23 → NFR-06.

## Ready và navigation

### AC-01 — Màn hình bắt đầu

Given learner mở một objective exercise hợp lệ chưa có checkpoint  
When Lesson load thành công  
Then player hiển thị số câu, điểm đạt và `Bắt đầu làm bài`, chưa hiển thị answer hoặc correctness.

### AC-02 — Tiếp tục checkpoint

Given learner có checkpoint tương thích ở câu 3 với hai answer đã lưu  
When learner mở lại Lesson và chọn `Tiếp tục làm bài`  
Then player mở câu 3 và khôi phục chính xác hai answer.

### AC-03 — Một câu mỗi lần

Given exercise có 8 câu theo thứ tự Server  
When learner đang ở phase ANSWERING  
Then chỉ câu hiện tại xuất hiện, header hiển thị `Câu X / 8`, và thứ tự không bị shuffle sau refresh/resume.

### AC-04 — Hỗ trợ đủ question type

Given question set chứa MCQ, fill, true/false, matching và error correction  
When learner hoàn thành từng loại  
Then FE tạo đúng answer shape theo API contract cho cả năm loại.

### AC-05 — Chặn chuyển câu chưa hoàn chỉnh

Given câu hiện tại chưa có answer hoặc matching còn thiếu cặp  
When learner xem action footer  
Then `Tiếp tục`/`Nộp bài` bị vô hiệu và control thiếu dữ liệu được nhận diện bằng text/accessibility state.

### AC-06 — Quay lại sửa câu

Given learner đã trả lời câu 1 và đang ở câu 2  
When learner quay lại câu 1 và đổi answer  
Then answer mới thay thế answer cũ trong checkpoint và submission cuối cùng.

## Bảo mật và kết quả

### AC-07 — Không chấm tại Client trước submit

Given learner chọn bất kỳ answer trước submission  
When UI cập nhật  
Then không hiển thị đúng/sai, correct answer, explanation hoặc số câu đúng.

### AC-08 — Kết quả sau Server grading

Given toàn bộ answer hợp lệ  
When submit thành công  
Then UI hiển thị phần trăm, đúng/tổng, đạt/chưa đạt, điểm đạt và per-question feedback từ response.

### AC-09 — Autosave answer và vị trí

Given learner thay answer hoặc chuyển câu  
When debounce/throttle tới hạn  
Then checkpoint tiếp theo chứa answer hiện tại và `currentQuestionIndex` hiện tại, không gọi request chỉ do render lại.

### AC-10 — Checkpoint không tương thích

Given checkpoint có answer với question version không còn khớp  
When Lesson được tải lại  
Then answer không tương thích không được restore, learner nhận thông báo và các answer tương thích vẫn được giữ.

### AC-11 — Bài chưa đạt

Given Server trả score dưới passingScore  
When result xuất hiện  
Then Lesson chưa bị đánh dấu hoàn thành mới và CTA primary là `Làm lại`.

### AC-12 — Retry có chủ đích

Given learner chọn `Làm lại` sau một result  
When attempt mới bắt đầu  
Then answer UI được reset, `clientAttemptId` mới được dùng, và best score trước đó không giảm.

### AC-13 — Review Lesson đã hoàn thành

Given Lesson đã completed  
When learner mở lại Lesson  
Then UI ở REVIEW và chỉ gọi restart khi learner xác nhận `Làm lại bài này`.

## Error, accessibility và regression

### AC-14 — Learner-safe payload

Given objective exercise chưa submit  
When GET Lesson response và Client state được kiểm tra  
Then không có answer key, correctness hoặc explanation.

### AC-15 — Objective content Lesson không có câu

Given content Lesson không có valid published question  
When GET Lesson thành công  
Then exercise là `COMPLETION` và objective player rỗng không xuất hiện.

### AC-16 — Unit Test không có câu hợp lệ

Given `UNIT_TEST` không có valid published question  
When learner mở Lesson  
Then Server trả `422` và UI hiển thị unavailable + retry, không tự complete.

### AC-17 — Checkpoint conflict

Given checkpoint version trên Server mới hơn Client  
When autosave trả `409`  
Then UI giữ answer local, hiển thị conflict và cho tải tiến trình mới nhất; không âm thầm ghi đè.

### AC-18 — Submit retry idempotent

Given submit timeout sau khi Server có thể đã xử lý  
When learner retry  
Then FE dùng cùng `clientAttemptId`, Server trả cùng attempt result và progress chỉ tăng một lần.

### AC-19 — Keyboard và focus

Given learner chỉ dùng bàn phím  
When bắt đầu, trả lời, chuyển câu và submit  
Then mọi action thao tác được; focus lần lượt tới heading câu mới và heading kết quả; không có keyboard trap ngoài modal có chủ đích.

### AC-20 — Không overflow desktop hỗ trợ

Given viewport rộng 1025 px và question matching có text dài hợp lệ  
When player render  
Then không có horizontal page overflow, text wrap được và footer không che action.

### AC-21 — Chuyển câu không tạo network request

Given question data đã có ở Client  
When learner chuyển tới câu trước hoặc sau  
Then câu mới hiển thị trong tối đa 100 ms, không có request phát sinh chỉ cho navigation và audio không tự phát.

### AC-22 — Log đủ nhưng không chứa answer

Given checkpoint conflict, stale question set, duplicate submit hoặc pass/fail xảy ra  
When Server ghi application log  
Then log chứa event name, user/Lesson/attempt identifier cần thiết để truy vết nhưng không chứa learner answer text, correct answer hoặc recording URL.

### AC-23 — Quality gate

Given thay đổi learner exercise player chuẩn bị merge  
When test suite và coverage report chạy  
Then unit, component và critical integration tests đều pass và business logic mới đạt coverage tối thiểu 80%.
