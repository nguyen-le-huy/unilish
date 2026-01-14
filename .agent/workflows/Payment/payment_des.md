---
description: PAYMENT SYSTEM SPECIFICATION (PAYOS INTEGRATION)
---

## 1. Tổng Quan Hệ Thống (System Overview)
*   **Mô hình kinh doanh:** Freemium (Miễn phí cơ bản + Trả phí nâng cao).
*   **Cổng thanh toán:** PayOS (Hỗ trợ VietQR).
*   **Cơ chế:** Thanh toán một lần (One-time payment) cho từng chu kỳ (Tháng/Năm), không tự động trừ tiền (Auto-renew).
*   **Trải nghiệm:** "Zero-friction" - Quét mã QR là kích hoạt ngay lập tức thông qua Webhook và Socket.io.

## 2. Cấu Trúc Gói Cước & Quyền Lợi (Pricing Tiers)

Hệ thống phân chia thành 3 cấp độ người dùng với các quy tắc truy cập (Access Rules) cứng sau đây:

| Hạng mục | **FREE** (Mặc định) | **PLUS** (Tiêu chuẩn) | **PRO** (Cao cấp) |
| :--- | :--- | :--- | :--- |
| **Giá (Tháng)** | 0 VNĐ | 20.000 VNĐ | 40.000 VNĐ |
| **Giá (Năm)** | N/A | 168.000 VNĐ | 336.000 VNĐ |
| **Nội dung học** | Giới hạn bài học | Mở khóa toàn bộ (A1-C2) | Full quyền truy cập |
| **Luyện thi** | Không truy cập | Không truy cập | Mở khóa IELTS/VSTEP |
| **AI Model** | Standard (Deepgram) | Standard (Deepgram) | **Pro (OpenAI Realtime API)** |
| **Độ trễ AI** | Turn-based (~1.5s) | Turn-based (~1s) | **Realtime (~500ms)**, ngắt lời tự nhiên |
| **Giới hạn AI** | 10 requests/ngày | 50 requests/giờ | **Không giới hạn** |
| **Tính năng khác** | Chấm điểm cơ bản | Chấm điểm cơ bản | Báo cáo chi tiết (Deep Analysis) |

## 3. Yêu Cầu Dữ Liệu (Data Requirements)

AI cần hiểu các thực thể dữ liệu cần quản lý (Logic Entity):

### A. Thông tin Giao Dịch (Transaction Entity)
Cần lưu trữ lịch sử thanh toán để đối soát:
*   **Mã đơn hàng (Order Code):** Số nguyên duy nhất, bắt buộc theo yêu cầu PayOS (dùng làm key đối soát).
*   **Người dùng:** Định danh người thực hiện.
*   **Số tiền & Gói:** Số tiền thực tế, Gói (Plus/Pro) và Chu kỳ (Tháng/Năm).
*   **Trạng thái:** Phải bao gồm các trạng thái: `PENDING` (Chờ quét), `PAID` (Thành công), `CANCELLED` (Hủy), `FAILED` (Lỗi).
*   **Dữ liệu cổng:** Payment Link ID, QR Code string.

### B. Trạng thái Người dùng (User Subscription State)
User model cần các trường để xác định quyền truy cập hiện tại:
*   **Plan:** Tier hiện tại (Free/Plus/Pro).
*   **Status:** Trạng thái hiệu lực (`active`, `expired`).
*   **Thời hạn:** Ngày bắt đầu và Ngày kết thúc (`endDate`). Logic kiểm tra quyền lợi phải luôn so sánh `CurrentDate` < `endDate`.

## 4. Quy Trình Nghiệp Vụ Chi Tiết (Business Workflow)

### Bước 1: Khởi tạo thanh toán (Payment Creation)
1.  Người dùng chọn Gói và Chu kỳ trên giao diện (ví dụ: PRO - 1 Năm).
2.  Hệ thống tính toán tổng tiền chính xác dựa trên bảng giá.
3.  Hệ thống tạo một "Payment Link" thông qua PayOS API.
4.  Dữ liệu trả về (QR Code, Số tài khoản, Nội dung chuyển khoản) được hiển thị cho người dùng.
5.  **Lưu ý:** Lúc này giao dịch được ghi nhận vào hệ thống với trạng thái `PENDING`.

### Bước 2: Xử lý Webhook (Webhook Processing) - *Quan trọng*
Hệ thống phải lắng nghe thông báo từ PayOS 24/7. Khi nhận được Webhook:
1.  **Xác thực bảo mật (Security Check):** Kiểm tra Chữ ký điện tử (Signature) để đảm bảo dữ liệu đến từ PayOS chính chủ, không phải giả mạo.
2.  **Đối soát dữ liệu:** Tìm đơn hàng trong hệ thống dựa trên `orderCode`.
3.  **Kích hoạt gói:**
    *   Nếu trạng thái từ PayOS là thành công -> Cập nhật trạng thái giao dịch thành `PAID`.
    *   Cập nhật thông tin User: Chuyển Plan sang gói mới, tính toán ngày hết hạn (`endDate`) bằng cách cộng thêm 30 ngày hoặc 365 ngày vào thời điểm hiện tại.
4.  **Xử lý trùng lặp (Idempotency):** Nếu Webhook gửi lại nhiều lần cho cùng 1 đơn hàng thành công, hệ thống phải nhận biết và không cộng dồn ngày sử dụng.

### Bước 3: Thông báo Realtime (User Feedback)
1.  Ngay sau khi Webhook xử lý thành công, Server phải bắn tín hiệu (Socket event) về Client của đúng User đó.
2.  Client nhận tín hiệu -> Tự động đóng Modal QR -> Hiển thị hiệu ứng chúc mừng (Confetti).
3.  **Yêu cầu đặc biệt:** Người dùng **không cần reload (F5)** lại trang mà các tính năng PRO phải được mở khóa ngay lập tức (Hot-reload state).

## 5. Xử Lý Lỗi & Ngoại Lệ (Exception Handling)

*   **Chuyển sai tiền/Nội dung:** PayOS sẽ không kích hoạt Webhook thành công. Giao dịch treo ở `PENDING`. Cần quy trình xử lý thủ công hoặc hướng dẫn user liên hệ hỗ trợ.
*   **QR Hết hạn:** Link thanh toán có hiệu lực giới hạn (thường là 15-30 phút). Nếu hết hạn, user phải tạo đơn mới.
*   **Hủy giao dịch:** Nếu user tắt modal mà chưa thanh toán, hệ thống định kỳ quét và đánh dấu các đơn `PENDING` quá lâu thành `CANCELLED`.

## 6. Stack Công Nghệ & Tích Hợp (Tech Constraints)
*   **Backend:** Node.js (Express).
*   **Database:** MongoDB (Yêu cầu Atomic Update khi xử lý Webhook).
*   **Realtime:** Socket.io (Dùng để bắn noti `payment-success`).
*   **3rd Party:** Thư viện `@payos/node` để giao tiếp API.