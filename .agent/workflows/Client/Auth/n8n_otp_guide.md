# Hướng Dẫn Setup N8N Workflow: Gửi Email OTP

Tài liệu này hướng dẫn cách thiết lập workflow tự động gửi email OTP trong n8n, sử dụng template JSON đã được chuẩn bị sẵn.

## 1. Import Workflow

Thay vì tạo thủ công từng bước, bạn có thể **Import** trực tiếp file template chuẩn.

1.  Mở giao diện n8n của bạn.
2.  Tạo một workflow mới (**New Workflow**).
3.  Bấm vào menu ba chấm `...` ở góc trên bên phải, chọn **Import from File**.
4.  Chọn file: `.agent/workflows/Client/Auth/n8n_otp_workflow.json` từ source code.
5.  Hoặc copy nội dung file JSON và paste (`Ctrl+V` / `Cmd+V`) thẳng vào màn hình editor n8n.

---

## 2. Cấu hình Node "Gmail"

Sau khi import, bạn sẽ thấy 2 node: **Webhook** và **Gmail**.
Node Gmail cần được xác thực với tài khoản Google của bạn.

1.  Click đúp vào node **Gmail**.
2.  Tại mục **Credential for Google Gmail OAuth2 API**:
    *   Nếu đã có credential: Chọn từ danh sách.
    *   Nếu chưa có: Chọn **Create New Credential** và làm theo hướng dẫn của n8n để kết nối tài khoản Google.
3.  Kiểm tra các trường dữ liệu (Expression đã được map sẵn từ Webhook):
    *   **To Recipient**: `{{ $json.body.email }}`
    *   **Subject**: `{{ $json.body.subject }}`
    *   **Message**: HTML Template đã được tích hợp sẵn (giao diện đẹp, chuyên nghiệp).

---

## 3. Cấu hình Node "Webhook" & Kết nối Server

1.  Click đúp vào node **Webhook**.
2.  **HTTP Method**: `POST`
3.  **Path**: `send-email` (hoặc tùy chỉnh).
4.  Copy **Webhook URL**:
    *   **Test URL**: Dùng để debug (ví dụ: `https://n8n.your-domain.com/webhook-test/...`).
    *   **Production URL**: Dùng khi chạy thật (ví dụ: `https://n8n.your-domain.com/webhook/...`).
5.  Cập nhật biến môi trường trong `server/.env`:

```env
# Thay đổi URL dưới đây bằng Production URL của bạn
N8N_WEBHOOK_URL=https://n8n.your-domain.com/webhook/send-email
```

---

## 4. Kiểm tra & Kích hoạt (Active)

1.  Bấm nút **Execute Workflow** trong n8n (chế độ chờ).
2.  Mở App Unilish, thực hiện chức năng **Đăng ký** hoặc **Quên mật khẩu**.
3.  Quan sát n8n:
    *   Node Webhook chuyển xanh lá (nhận tín hiệu).
    *   Node Gmail chuyển xanh lá (gửi thành công).
4.  Sau khi test thành công, bấm nút gạt **Active** ở góc trên bên phải màn hình n8n để workflow chạy tự động.

---

### Lưu ý quan trọng
*   Template HTML trong node Gmail đã được thiết kế sẵn với phong cách thương hiệu Unilish (Logo, Màu sắc, Bố cục).
*   Không cần chỉnh sửa HTML trừ khi muốn thay đổi nội dung text.
