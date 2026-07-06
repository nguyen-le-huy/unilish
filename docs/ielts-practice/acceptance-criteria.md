# Tiêu chí nghiệm thu

## Hub và danh sách đề

### AC-01 — Số đề active

**Maps:** FR-01  
Given có 8 Listening active, 1 paused và 1 draft  
When learner mở IELTS Practice Hub  
Then card Listening hiển thị 8 và không tính paused/draft.

### AC-02 — Lọc đúng kỹ năng

**Maps:** FR-02  
Given learner mở danh sách Writing  
When API trả trang đầu  
Then mọi item có `skill=writing` và `questionType=academic_task_1_chart`.

### AC-03 — Metadata card

**Maps:** FR-02, FR-03  
Given một đề active có duration, item count và 472 attempts  
When card render  
Then title, số item/bài viết, `472`, thời lượng và availability đều khớp API; không dùng số mock.

### AC-04 — Detail theo discriminated union

**Maps:** FR-04  
Given learner mở từng skill  
When detail trả thành công  
Then FE chọn đúng một renderer từ `skill + questionType`; type không hỗ trợ hiển thị lỗi contract an toàn.

### AC-05 — Không lộ answer key

**Maps:** FR-04, NFR-04  
Given Listening/Reading có answer key trong Mongo snapshot  
When gọi list, detail, start, resume và result bằng learner token  
Then response không chứa `acceptedAnswers`, `correctAnswer`, rubric bí mật hoặc system prompt.

## Start, timer, autosave, resume

### AC-06 — Start attempt mới

**Maps:** FR-05  
Given đề active và learner chưa có attempt in-progress  
When POST start với idempotency key mới  
Then server tạo đúng một attempt, pin version/snapshot, trả `201`, `startedAt`, `deadlineAt`, revision 0.

### AC-07 — Retry/resume start

**Maps:** FR-05  
Given request start trước đã tạo attempt nhưng client timeout  
When client retry cùng idempotency key  
Then server trả cùng attempt; attempt count chỉ tăng một lần.

### AC-08 — Timer không reset

**Maps:** FR-06  
Given attempt bắt đầu 10 phút trước với duration 20 phút  
When learner reload hoặc mở trên thiết bị khác  
Then UI tính thời gian còn lại từ deadlineAt khoảng 10 phút, không về 20 phút.

### AC-09 — Autosave thành công

**Maps:** FR-07  
Given attempt revision 3 đang in-progress  
When FE gửi draft hợp lệ revision 3  
Then server lưu atomically, trả revision 4 và savedAt; UI hiện Đã lưu.

### AC-10 — Revision conflict

**Maps:** FR-07  
Given server đã ở revision 5  
When thiết bị cũ gửi revision 4  
Then API trả 409 `REVISION_CONFLICT` kèm latest draft/revision và không overwrite server draft.

### AC-11 — Offline recovery

**Maps:** FR-08  
Given learner nhập khi network mất  
When autosave fail  
Then UI giữ recovery cache, hiện Chưa đồng bộ; khi online lại, flush theo revision hoặc mở conflict flow, không mất text.

## Submit và grading

### AC-12 — Confirm submit

**Maps:** FR-09  
Given learner bấm Nộp bài  
When modal xuất hiện  
Then modal nêu answered count/word count; chọn Tiếp tục không thay đổi draft; xác nhận mới gọi submit.

### AC-13 — Submit idempotent và lock

**Maps:** FR-09  
Given attempt đã submit  
When retry cùng idempotency key hoặc reload result  
Then server trả submission cũ, không enqueue/chấm hai lần; mọi autosave sau đó trả `ATTEMPT_LOCKED`.

### AC-14 — Objective grading

**Maps:** FR-10  
Given Listening/Reading submission và answer key trong pinned snapshot  
When submit  
Then correct/total/normalizedScore được tính từ snapshot; case/trim theo config; client answer key không được tin dùng.

### AC-15 — Async grading bền vững

**Maps:** FR-11, NFR-09  
Given Writing/Speaking được bật AI grading  
When submit thành công nhưng worker tạm lỗi  
Then submission vẫn pending, job retry tối đa 3 lần, không mất dữ liệu; hết retry chuyển grading_failed với safe error code.

## Admin CRUD

### AC-16 — List/filter admin

**Maps:** FR-12  
Given admin có đề ở nhiều skill/status  
When filter `skill=reading&status=draft`  
Then chỉ trả IELTS skill-practice Reading draft và pagination đúng.

### AC-17 — Create đúng mapping

**Maps:** FR-13  
Given admin chọn Writing  
When mở content step  
Then form cố định `academic_task_1_chart`; không có chọn Task 2 hay question type khác.

### AC-18 — Reject type mismatch

**Maps:** FR-13  
Given payload `skill=reading` và `questionType=form_completion`  
When create/update  
Then API trả 400 `INVALID_QUESTION_TYPE` và không ghi DB.

### AC-19 — Preview không tạo attempt

**Maps:** FR-14  
Given admin preview một draft  
When learner renderer hiển thị  
Then giao diện đúng DTO redacted; total attempts và attempt collection không đổi.

### AC-20 — Version-safe update

**Maps:** FR-15  
Given đề active version 3 có learner đang làm  
When admin muốn sửa content  
Then hệ thống tạo draft version 4; attempt cũ tiếp tục version 3 không đổi.

### AC-21 — Publish validation

**Maps:** FR-16  
Given Listening chỉ có 9 item hoặc audio pending  
When admin validate/publish  
Then publish bị từ chối với field errors; khi đủ 10 item và asset ready, publish thành công và chỉ một version active.

### AC-22 — Pause/archive

**Maps:** FR-17  
Given đề active có attempt in-progress  
When admin pause/archive  
Then đề biến mất khỏi list/start mới; attempt cũ vẫn resume/submit từ snapshot.

### AC-23 — Rollback và audit

**Maps:** FR-18  
Given version history có v1–v4  
When admin rollback v2  
Then tạo draft v5 có content v2, không active tự động, audit ghi actor/source/target.

### AC-24 — Media validation

**Maps:** FR-19  
Given asset sai MIME, quá dung lượng hoặc chưa upload xong  
When admin save/publish  
Then API từ chối đúng boundary; URL public không được client tự nhập để bypass allowlist.

## NFR và regression

### AC-25 — API performance

**Maps:** NFR-01  
Given dataset/index ở production-like load  
When đo ít nhất 1.000 requests mỗi endpoint  
Then P95 list/detail ≤500 ms và start/save/submit ≤800 ms, loại trừ upload/grading provider latency.

### AC-26 — Autosave latency

**Maps:** NFR-02  
Given network online ổn định  
When learner dừng nhập  
Then bản nháp xuất hiện server trong tối đa 5 giây và UI có savedAt.

### AC-27 — Idempotency retention

**Maps:** NFR-03  
Given start/submit thành công  
When retry cùng key trong 24 giờ  
Then response business tương đương và không tạo side effect mới.

### AC-28 — Contract security regression

**Maps:** NFR-04  
Given test suite snapshot mọi learner endpoint cho bốn skill  
When chạy CI  
Then suite fail nếu xuất hiện key cấm hoặc system prompt/raw grading payload.

### AC-29 — Accessibility/responsive

**Maps:** NFR-05, NFR-06  
Given keyboard-only và viewport 768/1024/1440 px  
When hoàn thành flow start→answer→submit  
Then không có bước bắt buộc dùng chuột, focus không mất, label/contrast đạt WCAG AA và dữ liệu không bị che.

### AC-30 — Observability/privacy

**Maps:** NFR-07, NFR-09  
Given save/submit/grading lỗi  
When xem structured logs  
Then có requestId/userId/testId/attemptId/safe error code; không có essay, transcript, answer text, signed URL/token.

### AC-31 — Test coverage

**Maps:** NFR-08  
Given CI chạy coverage  
When thay đổi model/service/hook/renderer quan trọng  
Then line/branch threshold module đạt tối thiểu 80% và integration test cover permission/idempotency/versioning.

## Skill-specific regression matrix

| Case | Listening | Reading | Writing | Speaking |
|---|---:|---:|---:|---:|
| Đúng question type duy nhất | ✓ | ✓ | ✓ | ✓ |
| Start/resume/deadline | ✓ | ✓ | ✓ | ✓ |
| Autosave/revision conflict | ✓ | ✓ | ✓ | ✓ |
| Submit idempotent | ✓ | ✓ | ✓ | ✓ |
| Answer key redaction | ✓ | ✓ | N/A rubric | N/A prompt/rubric |
| Media unavailable | Audio | N/A | Image | Audio upload/mic |
| Grading | Sync | Sync | Async/proposed | Async/proposed |
