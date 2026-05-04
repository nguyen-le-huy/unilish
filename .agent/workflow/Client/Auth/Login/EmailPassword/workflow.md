# Tài Liệu Onboarding: Luồng Đăng Nhập (Email/Password)

**Người viết:** Mentor  
**Đối tượng:** Intern / New Joiner  
**Mục tiêu:** Nắm vững toàn bộ luồng hoạt động của tính năng Đăng nhập (Login) bằng Email và Mật khẩu. Hiểu được cách hệ thống xác thực người dùng, xử lý các edge-case (trường hợp ngoại lệ) như tài khoản chưa kích hoạt, và cách quản lý bảo mật qua token (JWT & HttpOnly Cookie).

---

## 1. Bức Tranh Tổng Thể (The Big Picture)

Chào em, tiếp nối luồng Đăng ký, hôm nay chúng ta sẽ tìm hiểu luồng Đăng nhập (Login). 
Mục tiêu cốt lõi của tính năng này là kiểm tra danh tính người dùng (Authentication) và nếu hợp lệ, hệ thống sẽ cấp phát một "chìa khóa" (Token) để họ có quyền truy cập vào các API bảo mật của ứng dụng.

Luồng đăng nhập tưởng chừng đơn giản nhưng thực tế lại có những rẽ nhánh rất thú vị, đặc biệt là cách chúng ta bắt lỗi **"User đã đăng ký nhưng quên chưa nhập mã OTP"**.

---

## 2. Chi Tiết Bước 1: Giao Diện & Bắt Đầu Gửi Request

Em hãy mở các file sau ra để đối chiếu khi đọc:

### Ở phía Frontend (Client)
- **Giao diện & Form:** Mở file `client/src/features/auth/components/form/LoginForm.tsx`.
  - Tương tự như luồng đăng ký, form ở đây cũng được quản lý bởi `react-hook-form` và validate chặt chẽ bằng `Zod` (schema `LoginSchema`). Nếu user nhập email sai format hoặc bỏ trống password, hệ thống sẽ chặn ngay từ phía Client.
  - Ngoài ra, em để ý trong component này có thêm một đoạn `useEffect` dùng để bắt các thông báo lỗi nếu user đăng nhập bằng Google (OAuth) thất bại. Mình sẽ bàn sâu về Google Login ở một luồng khác.
- **Gọi API:** Khi user bấm "Đăng nhập", form sẽ kích hoạt hook `useLogin` nằm tại `client/src/features/auth/hooks/useLogin.ts`.
  - Hãy mở file này ra, em sẽ thấy nó gọi mutation `login(data)`.
  - **Chú ý đoạn xử lý lỗi (onError):** Đây là điểm cực kỳ quan trọng. Nếu API trả về lỗi `403 Forbidden` (nghĩa là tài khoản đúng nhưng *chưa được xác thực OTP*), hook này sẽ tự động `navigate` user sang màn hình nhập OTP (`/auth/otp`) và mang theo email đi cùng. Đây là cách mình làm mượt mà trải nghiệm người dùng (UX).

---

## 3. Chi Tiết Bước 2: Xử Lý Logic Tại Backend

Khi request `POST /auth/login` được gửi đi, nó sẽ chạy vào `server/src/controllers/auth.controller.ts` (hàm `login`). Từ đây, Controller đẩy dữ liệu xuống Service.

Em hãy mở file `server/src/services/auth.service.ts` và tìm hàm `login`. Cùng phân tích từng bước anh/chị code trong đó:

1. **Tìm kiếm User:**
   - Hệ thống dùng `userService.findByEmailWithPassword(email)` để tìm user trong MongoDB.
   - **Tại sao lại gọi là `WithPassword`?** Bình thường, trong Schema của Mongoose, field `password` được set là `select: false` để tránh việc lỡ tay query và trả về luôn mật khẩu cho Client. Nhưng lúc login, mình BẮT BUỘC phải lấy được cái password đã băm trong DB ra để so sánh, nên phải dùng hàm có query `.select("+password")`.

2. **Xác thực Mật khẩu (Authentication):**
   - Nếu không tìm thấy user hoặc user không có password, mình ném lỗi 401: *'Email hoặc mật khẩu không đúng'*. Cố tình ném chung một câu báo lỗi để hacker không đoán được là lỗi do sai email hay sai password.
   - Kế tiếp, dùng `bcrypt.compare` để so khớp mật khẩu người dùng nhập vào với mật khẩu đã băm (hash) lưu trong Database. Nếu không khớp cũng trả về 401.

3. **Xử lý Edge Case: Tài khoản chưa được verify (Xác thực OTP):**
   - Nếu password ĐÚNG, nhưng trạng thái `user.isVerified` lại bằng `false` thì sao? (Ví dụ: User đăng ký xong rồi tắt app, nay quay lại login).
   - Thay vì bắt user tự bấm nút "Gửi lại OTP", hệ thống mình **tự động làm luôn**:
     - Random mã OTP mới.
     - Hash mã OTP và lưu vào MongoDB + update luôn vào **Redis Cache** để phản hồi nhanh.
     - Gọi `otpService.sendVerificationCode` để gửi email chứa mã OTP gốc.
   - Cuối cùng, ném lỗi **403 Forbidden** (*'Tài khoản chưa xác thực. Mã OTP mới đã được gửi...'*). Lỗi này chính là cái để hook `useLogin` ở FE bắt được và đẩy user sang màn hình nhập OTP anh/chị có nhắc ở trên.

4. **Đăng nhập thành công & Cấp phát Tokens:**
   - Nếu mọi thứ đều ổn (`isVerified: true`), hệ thống cập nhật thời gian hoạt động cuối cùng của user (`lastActiveAt: new Date()`).
   - Tiến hành sinh ra cặp khóa:
     - **Access Token:** Ký (sign) bằng JWT, tuổi thọ ngắn (15 phút), chứa role và id của user.
     - **Refresh Token:** Ký (sign) bằng JWT, tuổi thọ dài (7 ngày).
   - Hệ thống cũng dùng Redis để lưu một "whitelist" chứa Refresh Token, giúp sau này mình có thể dễ dàng force-logout (đá văng) user ra khỏi hệ thống nếu cần.
   - **Trả về cho Controller:** Service ném toàn bộ dữ liệu này ra cho Controller. Tại Controller, Refresh Token sẽ được đóng gói vào **HttpOnly Cookie** (bảo mật tuyệt đối chống XSS), còn Access Token và Data User sẽ được trả về Frontend dạng JSON bình thường.

---

## 4. Chi Tiết Bước 3: Cập Nhật Trạng Thái Tại Client

Quay trở lại hook `useLogin` (`client/src/features/auth/hooks/useLogin.ts`), trong block `onSuccess`:
1. Hook nhận được Access Token và User data.
2. Gọi hàm `setAuth` từ `useAuthStore` (thư viện Zustand - `client/src/stores/auth.store.ts`) để nạp thông tin này vào bộ nhớ (Memory). Các component khác trong app sẽ "lắng nghe" cái store này để biết user đã đăng nhập hay chưa (ví dụ như đổi nút "Đăng nhập" thành "Avatar").
3. Bắn toast message "Đăng nhập thành công" và tự động điều hướng người dùng (`navigate`) vào màn hình ứng dụng (Dashboard hoặc màn hình Onboarding cho người mới).

---

## 5. Tổng Kết & Bài Học Rút Ra (Takeaways)

Qua luồng này, có 3 điểm anh/chị muốn em ghi nhớ:
1. **Bảo mật thông báo lỗi:** Không bao giờ nói cho người dùng biết là "Email không tồn tại" hay "Mật khẩu sai", hãy gộp chung lại thành *"Email hoặc mật khẩu không đúng"*. Điều này chống lại hành vi dò tìm email (enumeration attack) của kẻ xấu.
2. **Luôn xử lý Edge Cases:** Trong luồng Auth, không phải cứ đăng nhập là thành công hay thất bại. Còn có trường hợp "đăng nhập đúng nhưng chưa verify". Việc dự đoán trước và thiết kế logic bắt lỗi tự động gửi lại OTP chính là điểm khác biệt của một UX tốt.
3. **Quản lý Token thông minh:** Trách nhiệm của Access Token (sống ngắn) và Refresh Token (sống dài + bảo vệ bằng HttpOnly Cookie) được tách biệt rõ ràng, kết hợp Redis whitelist giúp mình kiểm soát phiên đăng nhập chặt chẽ nhất.

Em hãy xem sơ đồ `SequenceDiagram.puml` đi kèm và trace qua từng file code nhé. Chúc em nắm bắt luồng này thật nhanh!
