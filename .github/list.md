# Admin Login Flow Test (Email/Password)

## Phạm vi test
- Workflow tham chiếu: `.agent/workflow/Client/Auth/Login/EmailPassword/SequenceDiagram.puml`
- UI login: `admin/src/features/auth/components/LoginForm/LoginForm.tsx`
- Luồng auth liên quan: `admin/src/features/auth/hooks/useAuth.ts`, `admin/src/lib/axios.ts`, `server/src/controllers/auth.controller.ts`

## Kết quả test

| Case | Kỳ vọng | Kết quả thực tế | Trạng thái |
|---|---|---|---|
| 1. Login admin thành công | Nhận access token + duy trì session refresh | `useLogin` lưu access token vào zustand; server set cookie refresh theo `adminRefreshToken` | ✅ Pass |
| 2. Access token hết hạn, gọi API thường | Tự refresh token và retry request | Interceptor gọi `/auth/refresh` + retry đúng | ✅ Pass |
| 3. Refresh thất bại (401/network) | Chỉ logout khi session thực sự hết hạn | Hiện tại `refreshAccessToken()` nuốt lỗi (`catch => null`), sau đó mọi 401 khi đang auth đều bị `logout()` | ❌ Fail |
| 4. API trả 401 không phải do token hết hạn | Không nên logout toàn bộ phiên ngay | Interceptor đang logout với mọi 401 còn lại (`status===401 && isAuthenticated`) | ❌ Fail |
| 5. Logout chủ động từ UI | Xóa local state + invalidate refresh cookie server | `useLogout` chỉ clear store local, không gọi `logoutApi()` để clear cookie | ⚠️ Risk |

## Kết luận nhanh
- Cảm giác “dễ bị logout” là có cơ sở: hiện tại policy xử lý 401 quá rộng, dẫn tới logout cả khi refresh lỗi tạm thời hoặc 401 không phải token-expired.

## Đề xuất sửa (ưu tiên)

1. **Thu hẹp điều kiện auto-logout trong `admin/src/lib/axios.ts`**
   - Chỉ logout khi refresh endpoint trả lỗi xác định session invalid (ví dụ 401 từ `/auth/refresh`).
   - Không logout ngay với lỗi mạng/timeout; nên cho retry/backoff ngắn hoặc giữ state đăng nhập và báo lỗi rõ ràng.

2. **Không nuốt lỗi refresh im lặng**
   - Thay `.catch(() => null)` bằng phân loại lỗi (network vs unauthorized) để quyết định retry / logout chính xác.

3. **Đồng bộ logout client/server**
   - Trong `useLogout`, gọi `logoutApi()` trước khi clear store để server clear `adminRefreshToken` cookie.

4. **Bổ sung test tự động cho auth interceptor**
   - Scenario bắt buộc: refresh success, refresh 401, refresh network error, endpoint business 401.
   - Mục tiêu: tránh regression “401 bất kỳ => logout”.

5. **UX khi phiên hết hạn**
   - Khi session thực sự hết hạn, hiển thị `notify.auth.sessionExpired()` trước khi điều hướng về `/auth/login` để user hiểu nguyên nhân.
