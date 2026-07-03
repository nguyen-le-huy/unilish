# Yêu cầu

## Mục tiêu nghiệp vụ

Giảm tải nhận thức khi learner phải nhìn toàn bộ danh sách câu hỏi cùng lúc, đồng thời tạo trải nghiệm thống nhất với công cụ Preview của Admin mà không làm yếu cơ chế bảo vệ đáp án và chấm điểm phía Server.

## Actor và quyền

- `Learner`: người đã đăng nhập, đã ghi danh Course và được phép mở Lesson.
- `Admin`: chỉ là nguồn tham chiếu UX và người xuất bản question set; không tham gia runtime learner.
- Learner chỉ đọc/nộp dữ liệu thuộc enrollment của chính mình. Không nhận hoặc gửi `userId`, điểm, pass/fail hay đáp án đúng.

## Functional requirements

### FR-01 — Màn hình sẵn sàng

- **Ưu tiên:** Must
- Với objective exercise hợp lệ, hiển thị số câu, điểm đạt và CTA `Bắt đầu làm bài` trước khi hiển thị câu đầu tiên.
- Nếu có checkpoint, CTA đổi thành `Tiếp tục làm bài` và hiển thị tiến độ đã lưu.
- **Rationale:** giữ mental model `idle → playing` của Admin Practice Sheet.
- **AC:** AC-01, AC-02.

### FR-02 — Một câu tại một thời điểm

- **Ưu tiên:** Must
- Trong phase `ANSWERING`, chỉ một question được hiển thị trong vùng bài tập.
- Thứ tự phải giữ nguyên thứ tự Server trả về; không shuffle ở Client.
- Header hiển thị `Câu X / N` và progress bar. Không hiển thị số câu đúng trước submission.
- **Rationale:** Admin shuffle phù hợp preview, nhưng learner cần resume ổn định và đối chiếu checkpoint bằng index.
- **AC:** AC-03, AC-14.

### FR-03 — Trả lời theo loại câu hỏi

- **Ưu tiên:** Must
- Hỗ trợ đủ năm loại objective hiện có.
- `MULTIPLE_CHOICE` và `TRUE_FALSE`: chọn đúng một giá trị và cho phép đổi trước submission.
- `FILL_IN_BLANK` và `ERROR_CORRECTION`: trim để xác định rỗng nhưng giữ nội dung learner nhập trong checkpoint/submission.
- `MATCHING`: yêu cầu đủ mọi cặp, mỗi target chỉ dùng một lần; cho phép gỡ/đổi cặp trước submission.
- Stem text, image và audio hiển thị khi có; media lỗi không được làm mất phần text còn dùng được.
- **AC:** AC-04, AC-05, AC-16.

### FR-04 — Điều hướng câu hỏi

- **Ưu tiên:** Must
- Có `Quay lại` từ câu 2 trở đi và `Tiếp tục` ở mọi câu chưa phải câu cuối.
- `Tiếp tục` bị vô hiệu khi câu hiện tại chưa có câu trả lời hoàn chỉnh.
- Câu cuối dùng CTA `Nộp bài`.
- Learner có thể quay lại sửa bất kỳ câu trước khi nộp.
- **AC:** AC-05, AC-06.

### FR-05 — Không phản hồi đúng/sai trước khi nộp

- **Ưu tiên:** Must
- Trước submission chỉ hiển thị trạng thái đã trả lời/chưa trả lời.
- Không hiển thị `correctSoFar`, đáp án đúng, explanation hoặc màu semantic đúng/sai như Admin.
- **AC:** AC-07, AC-14.

### FR-06 — Nộp bài và kết quả

- **Ưu tiên:** Must
- Chỉ nộp khi toàn bộ question hợp lệ.
- Trong lúc nộp, khóa CTA chống double-submit và hiển thị `Đang chấm bài…`.
- Sau response hợp lệ, hiển thị phần trăm, số câu đúng/tổng, `Đạt` hoặc `Chưa đạt`, điểm yêu cầu và feedback từng câu.
- Kết quả dùng icon kèm text; không dùng màu làm tín hiệu duy nhất.
- **AC:** AC-06 đến AC-08.

### FR-07 — Checkpoint và resume

- **Ưu tiên:** Must
- Sau thay đổi câu trả lời hoặc chuyển câu, đánh dấu dữ liệu cần autosave.
- Checkpoint gồm answers và `currentQuestionIndex`; debounce 2 giây, throttle tối đa một lần/20 giây khi thay đổi liên tục.
- Khi mở lại Lesson, chỉ restore answer có question ID, version và type còn tương thích.
- **AC:** AC-02, AC-09, AC-10.

### FR-08 — Retry và review

- **Ưu tiên:** Must
- Bài chưa đạt có CTA `Làm lại`; bài đạt có `Bài tiếp theo` và khả năng xem chi tiết.
- Lesson đã hoàn thành mở lại ở `REVIEW`; bắt đầu attempt mới phải qua CTA rõ ràng `Làm lại bài này`.
- Retry tạo `clientAttemptId` mới, xóa answer/checkpoint của attempt đang hiển thị nhưng không làm giảm best score hoặc đảo trạng thái completed.
- **AC:** AC-11 đến AC-13.

### FR-09 — Retry khi lỗi mạng

- **Ưu tiên:** Must
- Lỗi submit không xóa answer.
- Retry sau kết quả mạng không chắc chắn phải dùng lại cùng `clientAttemptId`; thao tác `Làm lại` có chủ đích mới tạo ID mới.
- **AC:** AC-12, AC-18.

### FR-10 — Loading, empty và unavailable

- **Ưu tiên:** Must
- Lesson loading dùng skeleton hoặc loading state có label.
- Objective exercise rỗng ở content Lesson chuyển theo contract `COMPLETION`, không hiển thị player rỗng.
- `UNIT_TEST` rỗng/không hợp lệ hiển thị unavailable và retry load.
- **AC:** AC-15, AC-16.

### FR-11 — Conflict recovery

- **Ưu tiên:** Must
- `409 CHECKPOINT_CONFLICT`: thông báo tiến trình mới hơn tồn tại và cho phép tải bản Server.
- `409 QUESTION_SET_CHANGED`: giữ answer cục bộ, chặn submit lại cho tới khi reload question set; chỉ restore các answer còn tương thích.
- **AC:** AC-17, AC-18.

### FR-12 — Tích hợp trong Lesson Player

- **Ưu tiên:** Must
- Player nằm sau phần nội dung Lesson trong cùng main flow; không sao chép right-side Sheet của Admin.
- Khi bắt đầu làm bài, scroll/focus vào tiêu đề player. Footer Lesson không che CTA và không gây page-level overflow.
- **AC:** AC-01, AC-19.

## Non-functional requirements

### NFR-01 — Bảo mật

Pre-submit DTO không chứa answer key, correctness hoặc explanation. Server là nguồn duy nhất quyết định score, pass/fail và progress.

- **AC:** AC-14.

### NFR-02 — Accessibility

Tất cả control dùng semantic button/input/radio phù hợp, có accessible name, focus indicator, keyboard navigation và vùng thông báo submit/error dùng `aria-live`. Sau đổi câu, focus chuyển tới heading câu hỏi; sau submit chuyển tới heading kết quả.

- **AC:** AC-19.

### NFR-03 — Hiệu năng

Đổi câu phản hồi trong tối đa 100 ms trên thiết bị desktop mục tiêu. Không phát sinh request khi chỉ chuyển trước/sau; media của câu kế tiếp có thể preload nhưng không được tự phát audio.

- **AC:** AC-21.

### NFR-04 — Responsive trong phạm vi hỗ trợ

Không overflow ngang ở viewport từ 1025 px trở lên. Layout hai cột của matching phải co được trong content column; full mobile nằm ngoài phạm vi khi `MobileBlocker` còn hoạt động.

- **AC:** AC-20.

### NFR-05 — Quan sát hệ thống

Ghi log phía Server cho submit validation failure, question-set change, checkpoint conflict, duplicate attempt và pass/fail; không log learner answer text hoặc recording URL.

- **AC:** AC-22.

### NFR-06 — Kiểm thử

Business logic phase/navigation/checkpoint có unit test; player và result có component test; critical flow có integration test. Coverage của module logic mới tối thiểu 80%.

- **AC:** AC-23.
