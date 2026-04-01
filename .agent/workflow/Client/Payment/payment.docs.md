---
description: HỆ THỐNG THANH TOÁN & GÓI DỊCH VỤ (FREEMIUM SUBSCRIPTION MODEL)
---

# 💳 HỆ THỐNG THANH TOÁN & GÓI DỊCH VỤ (FREEMIUM SUBSCRIPTION MODEL)

### 1. Chiến Lược Sản Phẩm (Product Strategy)

UniLish áp dụng mô hình **Freemium Subscription** đơn giản và hiệu quả:

1. **Freemium (Mồi câu):** Cho phép người dùng học miễn phí với giới hạn tính năng (Limited Access) để tạo thói quen và cảm nhận giá trị.
2. **Premium Membership (Chuyển đổi):** Đăng ký thuê bao (Tháng/Năm) để mở khóa **toàn bộ sức mạnh hệ thống** (Full AI, Full Courses A1-C2).

Hệ thống thanh toán tích hợp **PayOS (VietQR)**, xử lý giao dịch tự động 24/7.

---

### 2. Cấu Trúc Gói Dịch Vụ (Pricing Tiers)

Chỉ còn 2 trạng thái tài khoản: **FREE** và **PREMIUM**.

| **Tính năng** | **FREE (Starter)** | **PREMIUM (Membership)** |
| --- | --- | --- |
| **Giá** | **0 VNĐ** | **169.000 VNĐ / tháng**
(1.428k / năm - Tiết kiệm 30%) |
| **Đối tượng** | Người mới bắt đầu | Người học nghiêm túc, cần AI Coach |
| **Nội dung học** | ✅ 3 Unit đầu tiên của mỗi khóa
❌ Các Unit sau bị khóa (Locked) | ✅ **Mở khóa TOÀN BỘ (A1-C2)**
✅ Truy cập mọi Series (Travel, Business...) |
| **AI Speaking** | ⚡ Giới hạn **1 lượt/ngày** | ⚡ **Không giới hạn (Real-time)** |
| **AI Chatbot** | ⚡ Giới hạn **10 tin/ngày** | ⚡ **Không giới hạn** |
| **Chứng chỉ** | ❌ Không cấp | ✅ **Cấp chứng chỉ (Verifiable)** |
| **Quảng cáo** | Có thể hiển thị | Không bao giờ |

---

### 3. Kiến Trúc Kỹ Thuật (Tech Stack)

| **Thành phần** | **Công nghệ** | **Vai trò** |
| --- | --- | --- |
| **Gateway** | **PayOS** | Cổng thanh toán VietQR, Webhook xác nhận tự động. |
| **Quota Engine** | **Redis** | Bộ đếm ngược (Rate Limiting) cho User Free. Tự động reset quota vào 00:00 mỗi ngày. |
| **Backend** | **Node.js + Zod** | Xử lý Logic nâng cấp, gia hạn ngày sử dụng (`validUntil`). |
| **Realtime** | **Socket.io** | Bắn thông báo "Kích hoạt Premium thành công" xuống Client tức thì. |
| **Cron Job** | **BullMQ** | Quét các tài khoản hết hạn để hạ cấp (Downgrade) về Free. |

---

### 4. Cơ chế Quản lý Quota (AI Energy)

Để kiểm soát chi phí OpenAI/Azure khi User Free sử dụng:

1. **Tracking:** Mỗi khi User Free gọi AI, Backend kiểm tra Redis key: `user:{id}:daily_ai_usage`.
2. **Enforcement:**
    - Nếu `usage < limit`: Cho phép đi tiếp.
    - Nếu `usage >= limit`: Chặn request $\rightarrow$ Trả về mã lỗi `402 Payment Required`.
3. **UI Feedback:**
    - Hiển thị thanh năng lượng **"AI Energy"** trên giao diện.
    - Hết năng lượng $\rightarrow$ Popup: *"Bạn đã hết năng lượng AI hôm nay. Nâng cấp Premium để dùng không giới hạn!"*

---

### 5. Quy Trình Nghiệp Vụ (Payment Workflow)

### Bước 1: Trigger (Rào cản thanh toán)

User sẽ gặp **Paywall** (Màn hình chào mời Premium) khi:

- Cố gắng học bài Unit 4 trở đi.
- Hết lượt AI Chat/Speaking trong ngày.
- Muốn tải bài học Offline.
- Muốn thi lấy chứng chỉ cuối khóa.

### Bước 2: Checkout & Payment

- User chọn gói (Tháng/Năm) $\rightarrow$ Bấm "Nâng cấp".
- Hệ thống hiển thị **QR Code** (PayOS).
- User quét mã chuyển khoản trên App ngân hàng.

### Bước 3: Instant Activation (Kích hoạt tức thì)

- PayOS bắn Webhook báo thành công.
- Backend cập nhật:JavaScript
    
    `User.subscription = {
      plan: 'PREMIUM',
      validUntil: NOW + 30_DAYS (hoặc 365_DAYS),
      isAutoRenew: false // Vì dùng QR nên không tự trừ tiền, cần nhắc gia hạn.
    };`
    
- Socket báo về Client $\rightarrow$ App tự động mở khóa (Unlock) toàn bộ tính năng.

---

### 6. Gia Hạn & Giữ Chân (Retention Flow)

Vì thanh toán qua QR (không phải thẻ tín dụng tự trừ), việc nhắc gia hạn là sống còn:

1. **Nhắc nhở (Reminder):**
    - Trước khi hết hạn 3 ngày: Gửi Email/Push Noti *"Gói Premium của bạn sắp hết hạn. Gia hạn ngay để giữ chuỗi học tập!"*
2. **Ân hạn (Grace Period):**
    - Hết hạn nhưng chưa đóng tiền: Cho dùng thêm **3 ngày** (nhưng hiện cảnh báo đỏ).
3. **Hạ cấp (Downgrade):**
    - Sau 3 ngày ân hạn: Tài khoản tự động chuyển về **FREE**.
    - Dữ liệu học tập, từ vựng đã lưu **vẫn được giữ nguyên** (không bị xóa), chỉ bị khóa quyền truy cập bài học mới.

---

### 7. Hóa Đơn & Pháp Lý

- Hỗ trợ xuất hóa đơn điện tử (VAT) cho gói Doanh nghiệp hoặc gói Năm (theo yêu cầu).
- Gửi biên lai điện tử (Receipt) tự động qua email.