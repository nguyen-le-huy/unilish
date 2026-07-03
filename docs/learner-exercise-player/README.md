---
feature: learner-exercise-player
status: READY FOR IMPLEMENTATION
owner: BA
last_updated: 2026-07-03
related_client:
  - client/src/features/dashboard/learning/pages/LessonPlayerPage
  - client/src/features/dashboard/learning/components/renderers/practice
  - client/src/features/dashboard/learning/components/result
related_admin:
  - admin/src/features/curriculum/courses/components/VocabStudio/components/PracticeSheet
  - admin/src/features/curriculum/courses/components/ReadingStudio/components/ReadingPracticeSheet
related_server:
  - server/src/routes/learning.route.ts
  - server/src/services/learning.service.ts
  - server/src/services/learner-exercise.service.ts
---

# Learner Exercise Player kiểu Admin

## Tóm tắt

Thiết kế lại trải nghiệm làm bài tập trong Client theo nhịp tương tác đang có ở Admin Practice Sheet: màn hình bắt đầu, làm từng câu, theo dõi tiến độ, xem kết quả và làm lại. Thiết kế chỉ tái sử dụng mô hình tương tác; Client vẫn dùng hệ thống thiết kế riêng và toàn bộ việc chấm điểm diễn ra trên Server.

Khác biệt bắt buộc so với Admin: Admin có dữ liệu đáp án và chấm ngay tại trình duyệt để người biên tập thử nội dung. Learner không được nhận đáp án đúng, trạng thái đúng/sai hoặc giải thích trước khi nộp toàn bài.

## Tài liệu

- [Yêu cầu](requirements.md)
- [Đặc tả thiết kế](design-spec.md)
- [Luồng người dùng](user-flows.md)
- [Hợp đồng API](api-contract.md)
- [Tiêu chí nghiệm thu](acceptance-criteria.md)
- [Quyết định](decisions.md)
- [Kế hoạch triển khai BE/FE](plan.md)

## Phạm vi

### Trong phạm vi

- Bài tập objective dạng `MULTIPLE_CHOICE`, `FILL_IN_BLANK`, `TRUE_FALSE`, `MATCHING`, `ERROR_CORRECTION`.
- Trạng thái `READY`, `ANSWERING`, `SUBMITTING`, `RESULT`, `REVIEW` và `ERROR`.
- Hiển thị một câu tại một thời điểm, điều hướng trước/sau, autosave, khôi phục checkpoint, nộp bài, kết quả và làm lại.
- Giao diện áp dụng cho `VOCAB`, `GRAMMAR`, `READING`, `LISTENING`, `UNIT_TEST` khi Lesson trả về `exercise.kind = OBJECTIVE`.
- Giữ nguyên hợp đồng API và mô hình dữ liệu learner exercise hiện tại.

### Ngoài phạm vi

- CRUD hoặc thay đổi UX soạn bài của Admin.
- Chấm từng câu trước khi nộp toàn bài.
- Sao chép Tailwind/Shadcn hoặc component Admin sang Client.
- `SPEAKING`, `WRITING`, bài tập `DYNAMIC`, thi có đồng hồ, hint AI và offline submission.
- Thiết kế mobile đầy đủ khi `MobileBlocker` vẫn chặn viewport `<= 1024px`.

## Phụ thuộc

- Hợp đồng nền tại [course-learning/exercise-spec.md](../course-learning/exercise-spec.md) và [course-learning/api-contract.md](../course-learning/api-contract.md).
- Question đã được Admin xuất bản và liên kết vào `Lesson.practiceConfig.questionIds`.
- Server trả learner-safe DTO và chỉ trả feedback sau một submission hợp lệ.

## Truy vết

| Mục tiêu | Requirements | Acceptance criteria |
|---|---|---|
| Nhịp làm bài giống Admin | FR-01 đến FR-06 | AC-01 đến AC-08 |
| Lưu, khôi phục và retry | FR-07 đến FR-09 | AC-09 đến AC-13 |
| An toàn và khả dụng | FR-10 đến FR-12, NFR-01 đến NFR-06 | AC-14 đến AC-23 |

## Kết luận phạm vi

`READY FOR IMPLEMENTATION`. Không cần endpoint hoặc collection mới. FE thay đổi cách trình bày và quản lý phase của objective exercise; BE chỉ cần duy trì hợp đồng learner-safe, checkpoint và idempotent submission hiện có.

## Câu hỏi mở

Không có blocker trong phạm vi đã xác định.
