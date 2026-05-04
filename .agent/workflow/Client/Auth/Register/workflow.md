# Tài Liệu Onboarding: Luồng Đăng Ký & Xác Thực OTP (Email/Password)

**Người viết:** Mentor  
**Đối tượng:** Intern / New Joiner  
**Mục tiêu:** Hiểu rõ toàn bộ vòng đời (lifecycle) của tính năng Đăng ký tài khoản và Xác thực OTP, từ lúc người dùng thao tác trên UI cho đến khi dữ liệu được lưu xuống DB, kèm theo các cơ chế bảo mật (Redis, JWT, Bcrypt).

---

## 1. Bức Tranh Tổng Thể (The Big Picture)

Chào em, để nắm được tính năng này, em cần hiểu hệ thống của chúng ta chia làm 2 phần rõ rệt:
- **Frontend (FE):** Xây dựng bằng React + TypeScript. Mình dùng kiến trúc Feature-based, nghĩa là mọi thứ liên quan đến Auth (components, hooks, types) đều nằm gọn trong `client/src/features/auth/`.
- **Backend (BE):** Chạy Node.js (Express), sử dụng kiến trúc Controller - Service - Repository. Data chính lưu ở **MongoDB**, nhưng với OTP (cần lưu tạm thời, đọc/ghi nhanh), mình dùng **Redis**.

Luồng đăng ký của mình bắt buộc phải qua 2 bước:
1. Đăng ký thông tin cơ bản -> Nhận mã OTP qua email.
2. Nhập mã OTP -> Xác thực thành công -> Nhận Token đăng nhập.

---

## 2. Chi Tiết Bước 1: Quá Trình Đăng Ký (Registration)

Em hãy mở các file sau ra để đối chiếu khi đọc:

### Ở phía Frontend (Client)
- **Giao diện & Form:** Mở file `client/src/features/auth/components/form/RegisterForm.tsx`.
  - Ở đây mình dùng thư viện `react-hook-form` để quản lý form không bị re-render thừa.
  - Form được validate chặt chẽ bằng `Zod` (schema định nghĩa ở `RegisterSchema`). Nếu user nhập email sai format hay pass quá ngắn, FE sẽ chặn luôn, không gọi API để tiết kiệm tài nguyên Server.
- **Gọi API:** Khi form hợp lệ, nó sẽ trigger hook `useRegister` tại `client/src/features/auth/hooks/useRegister.ts`.
  - Hook này bọc một mutation của `React Query`. Em để ý mình xử lý cả trạng thái loading và tự động bắn toast message (thư viện `sonner`) báo lỗi nếu API xịt.
  - Nếu thành công, hook này sẽ `navigate` user sang màn hình `/auth/otp` và truyền theo state là cái email user vừa nhập.

### Ở phía Backend (Server)
- **Router & Controller:** Request `POST /auth/register` sẽ đập vào router ở `server/src/routes/auth.route.ts`, sau đó được map thẳng vào hàm `register` trong `server/src/controllers/auth.controller.ts`. Nhiệm vụ của Controller chỉ là nhận request và trả response, không chứa logic nghiệp vụ.
- **Logic Nghiệp Vụ (Core):** Em mở `server/src/services/auth.service.ts`, tìm đến hàm `register`. Dòng chảy ở đây rất quan trọng:
  1. **Check trùng lặp:** Vào MongoDB tìm xem email có ai xài chưa. Nếu có, ném lỗi 409 ngay.
  2. **Bảo mật Pass:** Dùng thư viện `bcrypt` để hash mật khẩu (tuyệt đối không lưu plain-text).
  3. **Xử lý OTP:** Gọi hàm `generateOtp()` random ra 4 số. **Lưu ý:** Mã OTP này cũng phải được hash bằng `bcrypt` trước khi lưu.
  4. **Lưu DB & Cache:** Tạo user mới với trạng thái `isVerified: false`. Lưu OTP hash vào MongoDB, và lưu thêm vào **Redis** với thời gian sống (TTL) là 10 phút.
  5. **Gửi Email:** Gọi `otpService.sendVerificationCode` để gửi cái mã OTP gốc (chưa hash) về hộp thư của user.

---

## 3. Chi Tiết Bước 2: Quá Trình Xác Thực OTP (Verification)

Sau khi user nhận được email, họ sẽ nhập 4 số đó vào màn hình OTP.

### Ở phía Frontend (Client)
- **Giao diện OTP:** Mở `client/src/features/auth/components/form/OTPForm.tsx`.
  - Component `OTPInput` được thiết kế để user gõ đến đâu nhảy tab đến đó (tăng UX).
  - Ngay khi mảng OTP đủ 4 số, hook `useVerifyOTP` (`client/src/features/auth/hooks/useVerifyOTP.ts`) sẽ tự động được trigger gửi API `POST /auth/verify-otp`.

### Ở phía Backend (Server)
- **Kiểm tra OTP:** Vào lại `auth.service.ts`, tìm hàm `verifyOTP`.
  1. Backend tìm user theo email.
  2. **Tại sao lại dùng Redis?** Thay vì chọc xuống MongoDB chậm chạp, BE sẽ ưu tiên query vào **Redis** để lấy cái mã OTP hash ra. Nếu Redis sập, nó mới fallback xuống MongoDB. Tốc độ đọc từ RAM của Redis giúp API này phản hồi cực nhanh.
  3. Dùng `bcrypt.compare` để check mã user nhập với mã hash trong Redis.
- **Xác thực thành công:**
  1. Nếu khớp, update user thành `isVerified: true`, đồng thời chọc vào Redis xóa luôn cái key OTP đó đi.
  2. **Cấp phát Token (Rất quan trọng):** BE sẽ tạo ra 2 loại token:
     - **Access Token:** Sống 15 phút. Dùng để gửi kèm trong header mỗi lần gọi API.
     - **Refresh Token:** Sống 7 ngày. Em hãy mở `auth.controller.ts` hàm `verifyOTP`, chú ý hàm `setRefreshTokenCookie`. Mình gài Refresh Token này vào **HttpOnly Cookie**. Việc này ngăn chặn triệt để hacker dùng XSS đọc trộm token bằng JavaScript trên trình duyệt.

### Trở lại Frontend:
- Hook `useVerifyOTP` nhận được Access Token và thông tin User, nó sẽ gọi hàm `setAuth` của `Zustand` (mở `client/src/stores/auth.store.ts` để xem) để lưu vào bộ nhớ. Sau đó đẩy user vào màn hình Dashboard.

---

## 4. Tổng Kết & Bài Học Rút Ra (Takeaways)

Đọc xong luồng này, anh/chị muốn em nắm được 3 mindset cốt lõi khi code hệ thống của mình:
1. **Never trust the Client:** FE validate kỹ đến đâu (Zod) thì BE vẫn phải check lại.
2. **Security First:** Passwords và OTP luôn phải được hash (`bcrypt`). Token gia hạn phải dùng HttpOnly Cookie.
3. **Performance Optimization:** Những data tạm thời, cần check nhanh như OTP thì nên nghĩ ngay đến in-memory cache như Redis thay vì nhồi nhét vào Database chính.

Em hãy đọc kỹ file này, kết hợp vừa mở sơ đồ `SequenceDiagram.puml` lên, vừa click vào từng file code anh/chị đã chỉ ra ở trên để trace luồng nhé. Nếu có đoạn nào kẹt, cứ ping anh/chị.
