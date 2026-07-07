# Quyết định thiết kế

## ADR-001 — Một dạng bài cho mỗi kỹ năng

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted theo yêu cầu người dùng
- **Bối cảnh:** UI prototype có bốn player khác nhau; Reading còn chứa hai dạng và server IELTS mặc định chứa nhiều part/task.
- **Quyết định:** MVP khóa mapping: Listening/Form Completion, Reading/True–False–Not Given, Writing/Academic Task 1 Chart, Speaking/AI Conversation.
- **Loại bỏ:** Multi-question-type engine ngay trong MVP; full exam simulation.
- **Hệ quả:** Reading Note Completion và Writing Task 2 không được đưa vào contract production. FE cần bỏ/ẩn block Note Completion khi nối API.

## ADR-002 — Mở rộng `ExamTest`, không tạo content aggregate trùng lặp

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted — Phase 0
- **Bối cảnh:** Server đã có `ExamTest` với status, version, repository, service và route CRUD, nhưng schema mặc định là full IELTS nhiều module.
- **Quyết định:** Thêm `kind: skill_practice`, `slug`, `skill`, `questionType`, `publishedAt`; với `kind=skill_practice`, `modules` phải có đúng một module/content union.
- **Lựa chọn khác:** Tạo collection `ieltspracticetests` mới. Không chọn vì trùng status/version/audit và tăng hai nguồn nội dung thi.
- **Hệ quả:** Cần migration/backfill `kind=full_exam` cho record cũ và không đổi hành vi placement/full exam.

## ADR-003 — Attempt là collection riêng

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted
- **Quyết định:** Tạo `ieltspracticeattempts`; không nhúng attempt vào `User` hay `ExamTest`.
- **Hệ quả:** Có thể index ownership/status, lưu snapshot/version và scale analytics độc lập.

## ADR-004 — Server authoritative cho thời gian và draft

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted
- **Quyết định:** `deadlineAt`, `revision` và draft server là nguồn thật. localStorage chỉ giữ cache recovery.
- **Hệ quả:** Cần endpoint autosave có optimistic concurrency và UI conflict recovery.

## ADR-005 — Delete là archive

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted
- **Quyết định:** CRUD Delete thực hiện soft delete sang `archived`; không xóa vật lý record có attempt/version/audit.
- **Hệ quả:** `DELETE` idempotent; MVP không cleanup learner media hoặc attempt đã phát sinh.

## ADR-006 — Snapshot nội dung tại start

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted
- **Quyết định:** Attempt lưu `examVersion` và server-only `contentSnapshot` tại start.
- **Hệ quả:** Admin có thể publish version mới mà attempt đang làm không thay đổi câu hỏi/đáp án/timer.

## ADR-007 — Speaking tái sử dụng AI Voice ở tầng capability, không tái sử dụng flow tự do

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted — bám theo capability FE hiện có
- **Bối cảnh:** Client hiện điều hướng mọi đề Speaking sang AI Voice chung, nơi learner chọn lại topic/level/scenario.
- **Quyết định:** IELTS attempt truyền scenario cố định từ đề vào conversation capability và ghi transcript/audio vào attempt; learner không chọn lại topic.
- **Hệ quả:** Cần entry route Speaking riêng và adapter cho ChatWindow/voice service.

## ADR-008 — Chỉ chấm tự động Listening/Reading trong MVP

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted — Phase 0
- **Quyết định:** Listening/Reading chấm đồng bộ ngay khi nộp. Writing/Speaking chỉ lưu submission với trạng thái `submitted`, chưa enqueue BullMQ và chưa sinh band/feedback.
- **Hệ quả:** UI Writing/Speaking xác nhận đã nhận bài nhưng không hiển thị “đang chấm”. Worker Writing Task 2 và Speaking grading nằm ngoài MVP.

## ADR-009 — Quyền content creator

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted — Phase 0
- **Hiện trạng:** `/api/exam-tests` cho content creator chỉ GET; admin mới được create/update/status/rollback.
- **Quyết định:** Giữ read-only. Mọi create/update/status/rollback/delete chỉ dành cho admin.

## ADR-010 — Lưu dữ liệu learner vĩnh viễn

- **Ngày:** 2026-07-06
- **Trạng thái:** Accepted — Phase 0
- **Quyết định:** Attempt, draft đã submit, essay, transcript và audio Speaking không có thời hạn xóa trong MVP.
- **Hệ quả:** Không tạo TTL index, cleanup worker hoặc storage lifecycle xóa dữ liệu. Archive đề không xóa dữ liệu learner. Chính sách này chỉ thay đổi bằng ADR mới và kế hoạch migration riêng.
