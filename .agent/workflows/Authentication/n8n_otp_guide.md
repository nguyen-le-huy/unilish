# Hướng Dẫn Setup N8N Workflow: Gửi Email OTP

## Bước 1: Tạo Webhook Node (Nhận dữ liệu)
1. Bấm dấu `+` ở giữa màn hình.
2. Tìm và chọn **"Webhook"**.
3. Cấu hình như sau:
   - **HTTP Method:** `POST`
   - **Path:** (Để mặc định hoặc đặt là `send-email`)
   - **Authentication:** `None` (hoặc Header Auth nếu muốn bảo mật hơn sau này)
   - **Respond:** `Immediately` (để server NodeJS không phải chờ n8n gửi mail xong mới phản hồi).
4. Copy **Test URL** (ví dụ: `https://n8n.your-domain.com/webhook-test/...`).
5. Quay lại server code (`server/.env`), thêm dòng:
   ```env
   N8N_WEBHOOK_URL=https://n8n.your-domain.com/webhook-test/...
   ```
   *(Lưu ý: Khi chạy thật thì đổi `webhook-test` thành `webhook` và Active workflow)*

## Bước 2: Tạo Gmail Node (Gửi Email)
1. Bấm dấu `+` bên cạnh node Webhook để nối tiếp.
2. Tìm và chọn **"Gmail"**.
3. Chọn Action: **"Send"** (Gửi mail).
4. **Credential:**
   - Kết nối tài khoản Google của bạn (Sign in with Google).
5. Cấu hình nội dung gửi:
   - **To Recipient:** Bấm vào biểu tượng bánh răng (expression), chọn `{{ $json.body.email }}`.
   - **Subject:** `{{ $json.body.subject }}`
   - **Email Format:** `HTML`
   - **Note:** Nếu node Webhook chưa chạy (chưa có data mẫu), bạn có thể nhập giả định hoặc chạy thử Server Register một lần để Webhook nhận data, sau đó mới map biến được dễ dàng.

## Bước 3: HTML Template (Nội dung Email)
Copy đoạn code sau vào trường **HTML Content** của Gmail node:

```html
<div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
  <h2 style="color: #4F46E5; text-align: center;">Xác thực tài khoản Unilish</h2>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
  
  <p>Xin chào <strong>{{ $json.body.name }}</strong>,</p>
  
  <p>Cảm ơn bạn đã đăng ký tài khoản tại Unilish. Dưới đây là mã xác thực (OTP) của bạn:</p>
  
  <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #111827; border-radius: 6px; margin: 20px 0;">
    {{ $json.body.otp }}
  </div>
  
  <p>Mã có hiệu lực trong <strong>10 phút</strong>. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
  
  <p style="margin-top: 30px; font-size: 13px; color: #666;">
    Trân trọng,<br>
    <strong>Đội ngũ Unilish</strong>
  </p>
</div>
```

## Bước 4: Test & Activate
1. Bấm **"Execute Workflow"** (màn hình sẽ chờ Webhook).
2. Vào Web App Unilish, thực hiện đăng ký tài khoản mới.
3. Check n8n: Node Webhook sẽ xanh lá cây (nhận được data).
4. Check Gmail: Node Gmail sẽ xanh lá cây (đã gửi).
5. Kiểm tra hộp thư đến xem có email không.

## Quan trọng
- Sau khi test xong, nhớ chuyển Webhook URL trong `.env` từ `/webhook-test/` sang `/webhook/` (URL Production).
- Bấm nút toogle **Active** ở góc trên bên phải màn hình n8n.

---

*Last Updated: 2026-01-02*
