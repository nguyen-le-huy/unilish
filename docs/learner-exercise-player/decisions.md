# Quyết định

## ADR-01 — Tái sử dụng interaction model, không tái sử dụng Admin component

- **Ngày:** 2026-07-03
- **Bối cảnh:** Yêu cầu là làm bài tập “giống Admin”, nhưng Admin dùng Tailwind/Shadcn, có answer key và phục vụ content preview; Client dùng CSS Modules và dữ liệu learner-safe.
- **Quyết định:** Tái sử dụng phase `idle → playing → finished`, one-question-at-a-time, progress và result hierarchy. Không import/copy component Admin sang Client.
- **Phương án khác:** Render trực tiếp Admin Practice Sheet trong Client.
- **Hệ quả:** UX có tính tương đồng nhưng vẫn đúng kiến trúc, branding và security boundary của learner app.

## ADR-02 — Không phản hồi đúng/sai ngay sau từng câu

- **Ngày:** 2026-07-03
- **Bối cảnh:** Admin chấm ngay tại Client vì payload nội bộ chứa đáp án. Learner DTO cố ý loại bỏ đáp án và contract hiện tại chấm toàn bài phía Server.
- **Quyết định:** Learner chỉ biết câu đã được trả lời. Correctness, correct answer và explanation chỉ xuất hiện sau valid submission.
- **Phương án khác:** Thêm endpoint `check-answer` cho từng câu.
- **Hệ quả:** Không cần API mới, không lộ answer key, giữ attempt/scoring nhất quán. Cảm giác tương tác khác Admin ở bước feedback tức thời.

## ADR-03 — Giữ thứ tự Server, không shuffle ở Client

- **Ngày:** 2026-07-03
- **Bối cảnh:** Admin shuffle để người biên tập thử variation. Learner có checkpoint chứa `currentQuestionIndex` và cần resume ổn định.
- **Quyết định:** Render đúng thứ tự question do Server trả về trong toàn attempt.
- **Phương án khác:** Shuffle với seed lưu trong checkpoint.
- **Hệ quả:** Resume đơn giản, deterministic và không đổi API. Randomization trong tương lai phải là quyết định Server-owned có seed/version rõ ràng.

## ADR-04 — Không tạo API hoặc data model mới

- **Ngày:** 2026-07-03
- **Bối cảnh:** `GET lesson`, `PATCH checkpoint`, `POST submit` và `POST restart` đã cung cấp đủ dữ liệu và side effect.
- **Quyết định:** Đây là thay đổi FE presentation/state orchestration trên contract hiện tại.
- **Phương án khác:** Tạo session/answer-per-question API riêng.
- **Hệ quả:** BE scope nhỏ; FE phải giữ answer local/checkpoint cho đến khi submit toàn bộ.

## ADR-05 — Player nằm trong Lesson flow, không dùng right-side Sheet

- **Ngày:** 2026-07-03
- **Bối cảnh:** Sheet phù hợp màn hình biên tập Admin có curriculum tree và editor. Learner cần tập trung đọc content rồi làm bài.
- **Quyết định:** Player nằm sau Lesson content, trong main content column; chỉ result có thể dùng overlay hiện tại.
- **Phương án khác:** Mở drawer/modal giống Admin.
- **Hệ quả:** Ít giới hạn chiều rộng, media/matching dễ dùng hơn và không tạo nested scroll container.

## ADR-06 — Câu hỏi do Course Studio tạo được publish cùng Lesson

- **Ngày:** 2026-07-03
- **Bối cảnh:** Course Studio tạo và gắn `questionIds` nhưng không có thao tác publish Question riêng. Learner API chỉ trả Question `published`, khiến bài tập đã có trong Admin bị coi là `COMPLETION`.
- **Quyết định:** Pipeline tạo câu hỏi Vocabulary, Grammar, Reading và Listening trong Course Studio gán `published`. Swap chỉ chọn Question `published`. Question legacy đã liên kết và có status missing/null/draft được backfill idempotent.
- **Phương án khác:** Bỏ filter `published` khỏi learner API; phương án này bị loại vì có thể lộ nội dung nháp/archived.
- **Hệ quả:** Bài tập tạo trong Course Studio xuất hiện ngay trên Client, trong khi learner API vẫn giữ security boundary chỉ đọc nội dung published.
