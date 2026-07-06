# Luồng người dùng

## 1. Learner tìm và bắt đầu đề

**Actor:** Learner đã đăng nhập  
**Precondition:** Có ít nhất một đề active.  
**Trigger:** Learner mở `/dashboard/ielts-practice`.

```mermaid
flowchart TD
    A["Mở IELTS Practice Hub"] --> B["GET skill summary"]
    B -->|Có dữ liệu| C["Chọn một kỹ năng"]
    B -->|Lỗi| B1["Hiện retry, giữ khung trang"]
    C --> D["GET danh sách đề theo skill"]
    D -->|Rỗng| D1["Empty state: chưa có đề"]
    D -->|Có đề| E["Chọn Xem chi tiết"]
    E --> F["GET test detail đã redaction"]
    F --> G["POST start attempt với Idempotency-Key"]
    G -->|Attempt mới| H["Mở player từ snapshot"]
    G -->|Đang có attempt| I["Resume attempt hiện tại"]
    G -->|Đề không active| J["Thông báo đề không còn khả dụng"]
```

### Alternate/error flows

- Nếu list request lỗi, card skeleton chuyển error panel có nút Thử lại; không hiển thị 8 đề mock.
- Nếu đề bị pause giữa list và start, start trả `404 TEST_NOT_AVAILABLE`; learner quay lại list đã refresh.
- Nếu idempotent retry do timeout, server trả cùng `attemptId`.

## 2. Learner làm, autosave và resume

```mermaid
sequenceDiagram
    actor L as Learner
    participant FE as Client player
    participant API as IELTS Practice API
    participant DB as MongoDB

    L->>FE: Nhập/chọn câu trả lời
    FE->>FE: Cập nhật UI và local recovery cache
    FE->>API: PATCH draft (revision N)
    API->>DB: Conditional update revision=N
    alt revision hợp lệ
        DB-->>API: revision N+1
        API-->>FE: savedAt, revision N+1
        FE-->>L: Đã lưu
    else revision xung đột
        API-->>FE: 409 + latest draft/revision
        FE-->>L: Chọn dùng bản server hoặc ghi đè có xác nhận
    else offline/network error
        FE-->>L: Chưa đồng bộ, sẽ thử lại
        FE->>API: Retry khi online
    end
```

### Recovery

- Khi reload, FE gọi attempt detail trước; local cache chỉ được dùng nếu server unavailable và phải gắn nhãn “Bản nháp chưa đồng bộ”.
- Khi deadline qua trong lúc offline, server từ chối save/submit và chuyển attempt `expired` khi kết nối lại.
- Flag câu hỏi có thể autosave cùng draft; không ảnh hưởng scoring.

## 3. Learner nộp bài

```mermaid
flowchart TD
    A["Bấm Nộp bài"] --> B["Hiện summary đã trả lời/số từ"]
    B -->|Tiếp tục| C["Đóng modal, giữ dữ liệu"]
    B -->|Xác nhận| D["POST submit + Idempotency-Key"]
    D -->|Listening/Reading| E["Chấm đồng bộ"]
    D -->|Writing/Speaking| F["Ghi submission + enqueue grading"]
    E --> G["Result graded"]
    F --> H["Result pending_grading"]
    D -->|Đã submit| I["Trả lại submission cũ"]
    D -->|Hết hạn| J["Hiện trạng thái expired"]
```

## 4. Flow riêng từng player

### Listening — Form Completion

1. Player tải audio metadata và 10 item redacted.
2. Learner phát/tạm dừng/tua audio theo policy cấu hình.
3. Learner nhập một từ và/hoặc số cho mỗi item, có thể flag.
4. Progress là số answer trim khác rỗng trên 10.
5. Submit chấm theo accepted answers trong server snapshot.

### Reading — True/False/Not Given

1. Passage ở pane trái, statements ở pane phải.
2. Mỗi statement chỉ có một enum answer.
3. Learner có thể flag và nhảy tới statement.
4. Block Note Completion của prototype không xuất hiện trong production MVP.
5. Submit trả raw score và normalized score; band mapping nếu product dùng scoring config.

### Writing — Academic Task 1 Chart

1. Prompt, chart/image, instruction và min words ở pane trái.
2. Một textarea duy nhất ở pane phải; 20 phút mặc định; min 150 từ.
3. Word count dùng cùng một hàm chuẩn hóa FE/BE được test bằng shared fixture.
4. Dưới 150 từ: modal cảnh báo nhưng learner vẫn có thể xác nhận submit.
5. Submission chuyển pending grading nếu AI grading được bật.

### Speaking — AI Conversation

1. Từ card đề, FE start attempt rồi mở route Speaking riêng.
2. Scenario và opening prompt cố định theo content; không cho chọn lại topic/level.
3. FE xin quyền microphone ngay trước khi bắt đầu ghi âm.
4. Conversation capability tạo transcript/audio references gắn attempt.
5. Learner kết thúc → review duration/transcript availability → submit.
6. Permission denied, upload retry và disconnect đều có recovery; không tạo submission giả.

## 5. Admin CRUD

```mermaid
flowchart TD
    A["Admin mở IELTS Practice"] --> B["List/search/filter"]
    B --> C["Tạo đề"]
    B --> D["Mở đề hiện có"]
    C --> E["Chọn đúng một skill"]
    E --> F["Form cố định question type theo skill"]
    F --> G["Lưu draft"]
    D -->|Draft| H["Sửa trực tiếp draft"]
    D -->|Active| I["Tạo draft version mới"]
    G --> J["Preview learner DTO"]
    H --> J
    I --> J
    J --> K["Validate publish"]
    K -->|Hợp lệ| L["Publish active"]
    K -->|Lỗi| M["Hiện field-level validation"]
    B --> N["Pause/Archive/Rollback"]
```

### Quy tắc delete

- Delete trong UI phải ghi “Lưu trữ đề”, không dùng copy khiến admin hiểu là xóa vật lý.
- Archive cần confirm, ghi rõ attempt cũ không bị xóa.
- Gọi lại DELETE cho record archived trả thành công idempotent.

## 6. Admin publish validation

| Skill | Điều kiện bắt buộc trước publish |
|---|---|
| Listening | 10 item; audio asset ready; mỗi item có accepted answer; không trùng item id |
| Reading | Passage khác rỗng; ≥1 statement; tất cả có correct enum |
| Writing | Prompt/instruction/image; minWords=150 theo MVP; timeLimit=20 theo MVP |
| Speaking | Scenario/opening prompt/duration; cấu hình voice capability hợp lệ |

## 7. Permission-denied flows

- Learner gọi admin API: `403 FORBIDDEN`.
- Learner đọc attempt của user khác: `404 ATTEMPT_NOT_FOUND` để tránh enumeration.
- Content creator gọi mutation khi chưa được cấp quyền: `403 FORBIDDEN`.
- Admin preview không được gọi learner submit hoặc làm tăng attempt count.
