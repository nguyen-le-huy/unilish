---
description: Authentication Implementation Workflow
---

# Luồng hoạt động Authentication (Chi tiết)

Tài liệu này mô tả chi tiết từng bước, từ tương tác UI cho đến xử lý Database, của hệ thống xác thực.

---

## 1. Google Login Flow (Client)

### A. Client Side Interaction
1. **UI Trigger:**
   * **Page:** `client/src/pages/auth/Login.tsx` (hoặc Register).
   * **Action:** User bấm nút **"Tiếp tục với Google"** (được render bởi `<SignIn />` hoặc nút custom gọi Clerk).
   * **Code:** `useGoogleAuth.ts` -> `signInWithGoogle()`.
   * **Clerk Process:** Redirect user sang Google -> Auth -> Redirect về URL app.

2. **Sync Process (Client):**
   * **Hook:** `client/src/features/auth/hooks/useGoogleAuth.ts`.
   * **Logic:** `useEffect` lắng nghe `user` từ Clerk. Nếu `isSignedIn` (Clerk) nhưng `!isAuthenticated` (Hệ thống):
     * Trigger API Sync.
   * **API Call:** `client/src/features/auth/api/sync-clerk.ts` -> `api.post('/auth/sync-clerk')`.
   * **Payload:** `{ clerkId, email, fullName, avatarUrl }`.

### B. Server Side Processing
1. **Route:** `POST /api/auth/sync-clerk`.
2. **Controller:** `server/src/controllers/auth.controller.ts` -> `syncClerkUser`.
   * Validate input (clerkId, email).
   * Call `AuthService.syncWithClerk()`.
3. **Service Logic:** `server/src/services/auth.service.ts`.
   * **Check:** Tìm User theo `clerkId` HOẶC `email`.
   * **Update (Nếu tồn tại):** Cập nhật `clerkId`, `avatarUrl`, set `authProvider = 'google'`, `isVerified = true`.
   * **Create (Nếu mới):** Tạo User mới với `role: 'student'`, `stats` mặc định.
   * **Generate Token:** Tạo JWT (7 ngày).
4. **Response:** JSON `{ status: 'success', data: { user, token } }`.

### C. Client Completion
* **Hook onSuccess:**
  * Update Zustand: `authStore.setAuth(user, token)`.
  * Toast: "Signed in with Google successfully".
  * Navigate: `/dashboard`.

---

## 2. Traditional Registration Flow (Client)

### A. Client Side Interaction
1. **UI Trigger:**
   * **Page:** `client/src/pages/auth/Register.tsx`.
   * **Component:** `client/src/features/auth/components/form/RegisterForm.tsx`.
   * **Fields:** Email, Full Name, Password, Confirm Password.
   * **Action:** Submit Form (`onSubmit`).
2. **Hook Execution:**
   * **Hook:** `client/src/features/auth/hooks/useRegister.ts`.
   * **API Call:** `client/src/features/auth/api/register.ts` -> `api.post('/auth/register')`.
   * **Payload:** `{ email, password, fullName }`.

### B. Server Side Processing
1. **Route:** `POST /api/auth/register`.
2. **Controller:** `server/src/controllers/auth.controller.ts` -> `register`.
3. **Service Logic:** `server/src/services/auth.service.ts`.
   * **Check Duplicate:** `User.findOne({ email })`. Nếu có -> Throw error 400.
   * **Process:**
     * Hash Password (`bcrypt`).
     * Generate OTP (4 số ngẫu nhiên).
     * Hash OTP.
     * Create User: `isVerified: false`, `otpExpires`: +10 phút.
   * **Side Effect:** Gọi `EmailService.sendOTP(email, otp)` (Trigger n8n/webhook).
4. **Response:** JSON `{ status: 'success', message: '...', email: '...' }`.

### C. Client Completion
* **Hook onSuccess:**
  * Toast: "Check your email".
  * Navigate: `/auth/verify-otp` (mang theo `state: { email }`).

---

## 3. OTP Verification Flow (Client)

### A. Client Side Interaction
1. **UI Trigger:**
   * **Page:** `client/src/pages/auth/OTP.tsx`.
   * **Component:** `client/src/features/auth/components/form/OTPForm.tsx`.
   * **Inputs:** 6 ô nhập liệu (Input OTP).
   * **Action:** Auto-submit khi đủ 6 ký tự hoặc bấm Verify.
2. **Hook Execution:**
   * **Hook:** `client/src/features/auth/hooks/useVerifyOTP.ts`.
   * **API Call:** `client/src/features/auth/api/verify-otp.ts` -> `api.post('/auth/verify-otp')`.
   * **Payload:** `{ email, otp }`.

### B. Server Side Processing
1. **Route:** `POST /api/auth/verify-otp`.
2. **Controller:** `server/src/controllers/auth.controller.ts` -> `verifyOTP`.
3. **Service Logic:** `server/src/services/auth.service.ts`.
   * Find User by Email.
   * **Checks:**
     * User có tồn tại?
     * `otpExpires` còn hạn?
     * `bcrypt.compare(otpInput, user.otpHash)`?
   * **Action:**
     * Set `isVerified = true`.
     * Clear `otp`, `otpExpires`.
     * Generate JWT.
4. **Response:** JSON `{ status: 'success', data: { user, token } }`.

### C. Client Completion
* **Hook onSuccess:**
  * Update Zustand: `authStore.setAuth(user, token)`.
  * Navigate: `/dashboard`.

---

## 4. Login Flow (Client & Admin)

### A. Client Side Interaction
1. **UI Trigger:**
   * **Client:** `client/src/features/auth/components/form/LoginForm.tsx`.
   * **Admin:** `admin/src/features/auth/components/LoginForm.tsx`.
   * **Fields:** Email, Password.
2. **Hook Execution:**
   * **Client Hook:** `client/src/features/auth/hooks/useLogin.ts`.
   * **Admin Hook:** `admin/src/features/auth/hooks/useAuth.ts` (useLogin).
   * **API Call:** `api.post('/auth/login')`.
   * **Payload:** `{ email, password }`.

### B. Server Side Processing
1. **Route:** `POST /api/auth/login`.
2. **Controller:** `server/src/controllers/auth.controller.ts` -> `login`.
3. **Service Logic:** `server/src/services/auth.service.ts`.
   * Find User (`+password`).
   * Compare Password (`bcrypt`).
   * **Check Verified:**
     * Nếu `isVerified === false`: Tạo OTP mới -> Gửi Email -> Throw 403 "Unverified".
   * **Action:** Update `lastActiveAt`, Generate JWT.
4. **Response:** JSON `{ status: 'success', data: { user, token } }`.

### C. Client Completion
* **Client App:**
  * Check Role (Optional but handles permission).
  * Update Zustand, Navigate `/dashboard`.
* **Admin Portal:**
  * **Role Check:** `if (user.role !== 'admin')` -> Toast Error "Access Denied" -> Không lưu Token.
  * Nếu OK -> Update Zustand -> Navigate `/dashboard`.

---

## 5. Technical Stack References

| Component | Library/Tech | File Location |
|-----------|--------------|---------------|
| **Form Handling** | React Hook Form + Zod | `components/form/*` |
| **API Client** | Axios + Interceptors | `lib/axios.ts` |
| **State Sync** | TanStack Query (v5) | `features/auth/hooks/*` |
| **Global State** | Zustand | `stores/auth.store.ts` |
| **Email Service** | n8n Webhook | `server/src/services/email.service.ts` |
| **Auth Provider** | Clerk (Google Only) | `features/auth/hooks/useGoogleAuth.ts` |

---

*Last Updated: 2026-01-20*
