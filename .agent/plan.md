# Plan: Fix Google OAuth — Align với SequenceDiagram.puml

> Phân tích gap giữa code hiện tại và SequenceDiagram, sau đó lên kế hoạch fix.

---

## 1. Kết quả phân tích GAP (Code vs Diagram)

### ✅ Đã đúng

| Bước trong Diagram | Code hiện tại |
|---|---|
| Bước 1: `Client → GET /auth/google` | `window.location.href = env.API_URL/auth/google` → Passport redirect Google |
| Bước 3: Passport đổi code → Google profile | `passport-google-oauth20` GoogleStrategy handle |
| Bước 5: `findOne({ $or: [googleId, email] })` | `userService.findByGoogleIdOrEmail(googleId, email)` |
| Bước 5a: Tạo user mới với `isVerified: true`, `authProvider: google` | `userService.createUser({ isVerified: true, authProvider: GOOGLE })` |
| Bước 6: `generateAccessToken` (15m) + `generateRefreshToken` (7d) | `signAccessToken()` + `signRefreshToken()` |
| Bước 7: Redirect về `/auth/success` | `res.redirect(CLIENT_URL/auth/success)` |
| Bước 8: Client điều hướng theo user state | `navigate(getPostAuthRedirectPath(data))` |

---

### ❌ Lỗi / Gap cần fix

#### GAP 1 — `googleCallback` đọc `token` thay vì `accessToken` + `refreshToken`

**File:** `server/src/controllers/auth.controller.ts` — line 26

```ts
// ❌ Hiện tại — dùng { token } (cũ, không tồn tại)
const { user, token } = req.user as any;
req.session.token = token;       // → token = undefined
```

`findOrCreateFromGoogle()` trả về `{ user, accessToken, refreshToken }` nhưng controller đang destructure `token` → **accessToken không bao giờ được gửi về client**.

---

#### GAP 2 — Diagram yêu cầu `refreshToken` trong `HttpOnly Cookie` + `accessToken` trong URL/session

**Diagram (Bước 7):**
```
PassportCB → Client: HTTP 302 Redirect → /auth/success
  + Set-Cookie: refreshToken=...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
  + accessToken trong URL fragment (MVP) hoặc session
```

**Code hiện tại:**
- Không set `HttpOnly Cookie` cho `refreshToken`
- Không truyền `accessToken` về client theo bất kỳ cách nào
- Client dùng `getCurrentUser()` call `/users/me` bằng session cookie → lấy được user, nhưng **không có `accessToken`**
- `setAuth(data, null)` → `accessToken = null` trong store

---

#### GAP 3 — `useGoogleCallback` không nhận `accessToken` → store thiếu token

**File:** `client/src/features/auth/hooks/useGoogleCallback.ts` — line 32

```ts
// ❌ accessToken luôn là null
setAuth(data, null);
```

Diagram yêu cầu client đọc `accessToken` và lưu vào Zustand. Hiện tại client chỉ lấy được `user` từ `/users/me`, không có token.

---

#### GAP 4 — Diagram yêu cầu `isNewUser` flag để phân nhánh routing

**Diagram (Bước 8):**
```
alt isNewUser = true → /onboarding
else isNewUser = false → /dashboard
```

**Code hiện tại:** `getPostAuthRedirectPath(user)` dùng logic kiểm tra onboarding từ profile user (learningGoalId null → onboarding). Điều này **gần đúng** về kết quả nhưng không có `isNewUser` flag tường minh từ backend.

---

#### GAP 5 — Diagram yêu cầu `Redis whitelist` cho refreshToken

**Diagram (Bước 6):**
```
AuthService → Redis: SET refreshToken:{userId} = refreshToken (TTL: 7d)
```

**Code hiện tại:** `findOrCreateFromGoogle()` không lưu refreshToken vào Redis.

---

#### GAP 6 — Diagram yêu cầu check `email_verified` từ Google profile

**Diagram (Bước 4):**
```
alt email_verified = false → 400 Bad Request
```

**Code hiện tại:** `passport.ts` không kiểm tra `profile._json.email_verified` trước khi gọi `findOrCreateFromGoogle()`.

---

#### GAP 7 — Diagram yêu cầu Scenario 3: Cancel → redirect `/login?error=cancelled`

**Diagram (Bước 2):**
```
Google → /auth/google/callback?error=access_denied
PassportCB → Client: Redirect → /login?error=cancelled
Client → User: "Đăng nhập bị hủy"
```

**Code hiện tại:** Route callback dùng `failureRedirect: '/login'` — không có `?error=cancelled` param, client không hiển thị thông báo cụ thể.

---

#### GAP 8 — Diagram yêu cầu phân biệt Scenario 2 (google user cũ) vs Scenario 3 (local → link)

**Diagram:**
- Scenario 2 (existing google user): update `googleId, avatarUrl, fullName, lastActiveAt`
- Scenario 3 (local user): chỉ update `googleId, avatarUrl, lastActiveAt` (KHÔNG update `fullName`)

**Code hiện tại:** Cả hai case đều đi vào cùng 1 `if (user)` block, không phân biệt — update logic giống nhau.

---

## 2. Kế hoạch Fix (Theo thứ tự ưu tiên)

### 🔴 Priority 1 — Critical (Làm ngay, luồng đang broken)

#### Fix 1.1 — `auth.controller.ts`: Destructure đúng `accessToken` + `refreshToken`

**File:** `server/src/controllers/auth.controller.ts`

```ts
// Thay:
const { user, token } = req.user as any;
req.session.token = token;

// Thành:
const { user, accessToken, refreshToken } = req.user as any;

// Set refreshToken vào HttpOnly Cookie (TTL 7 ngày)
res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,  // 7 ngày
});

// Lưu accessToken vào session để /auth/success page đọc
if (req.session) {
    req.session.accessToken = accessToken;
}

res.redirect(`${env.CLIENT_URL}/auth/success`);
```

---

#### Fix 1.2 — `useGoogleCallback.ts`: Đọc `accessToken` từ session + lưu vào store

**File:** `client/src/features/auth/hooks/useGoogleCallback.ts`

Thêm API call để lấy `accessToken` từ session sau redirect. Cách MVP: server đặt `accessToken` vào session, client gọi `GET /auth/session-token` để lấy về.

Hoặc đơn giản hơn: **server truyền accessToken qua URL fragment** (ít secure hơn nhưng MVP):
```
res.redirect(`${CLIENT_URL}/auth/success#token=${accessToken}`)
```
Client đọc `window.location.hash` tại `/auth/success`.

**Chọn giải pháp:** Set `accessToken` vào **session** trên server + thêm endpoint `GET /auth/token` để client fetch sau redirect — bảo mật hơn.

---

### 🟡 Priority 2 — Important (Diagram yêu cầu, nhưng không block luồng chính)

#### Fix 2.1 — `passport.ts`: Kiểm tra `email_verified`

```ts
// Thêm vào GoogleStrategy callback:
if (!profile._json.email_verified) {
    return done(new AppError('Email Google chưa được xác minh', 400), undefined);
}
```

#### Fix 2.2 — `auth.route.ts`: Truyền `?error=cancelled` khi user cancel

```ts
// Thay:
failureRedirect: '/login'
// Thành:
failureRedirect: `${env.CLIENT_URL}/login?error=cancelled`
```

**Client `LoginForm.tsx`:** Đọc `?error=cancelled` từ URL và hiển thị toast.

#### Fix 2.3 — `auth.service.ts`: Phân biệt update logic Scenario 2 vs Scenario 3

```ts
if (user) {
    const isGoogleUser = user.authProvider === EAuthProvider.GOOGLE;
    const updateObj: any = { googleId, lastActiveAt: new Date() };

    // Chỉ update avatar nếu chưa có hoặc là default
    if (!user.avatarUrl || user.avatarUrl.includes('default_avatar')) {
        updateObj.avatarUrl = avatarUrl;
    }

    // Chỉ update fullName nếu là Google user (không overwrite local fullName)
    if (isGoogleUser) {
        updateObj.fullName = fullName;
    }

    // isNewUser flag
    const isNewUser = false;
    // ...
}
```

#### Fix 2.4 — `auth.service.ts`: Thêm `isNewUser` flag vào response

```ts
return {
    user: { ... },
    accessToken,
    refreshToken,
    isNewUser,  // ← thêm field này
};
```

---

### 🟢 Priority 3 — Enhancement (Diagram đề cập, nên implement sau)

#### Fix 3.1 — Redis whitelist cho refreshToken

```ts
// Trong findOrCreateFromGoogle(), sau khi generate tokens:
await redisClient.setEx(
    `auth:refresh:${userId}`,
    7 * 24 * 60 * 60,  // 7 ngày
    refreshToken
);
```

---

## 3. Files cần sửa (tổng hợp)

| File | Thay đổi |
|---|---|
| `server/src/controllers/auth.controller.ts` | Fix destructure, set Cookie + session |
| `server/src/routes/auth.route.ts` | `failureRedirect` với `?error=cancelled` |
| `server/src/config/passport.ts` | Check `email_verified` |
| `server/src/services/auth.service.ts` | Phân biệt Scenario 2/3, thêm `isNewUser`, Redis whitelist |
| `client/src/features/auth/hooks/useGoogleCallback.ts` | Đọc accessToken, `setAuth(data, accessToken, refreshToken)` |
| `client/src/features/auth/components/form/LoginForm.tsx` | Hiển thị toast khi `?error=cancelled` trong URL |

---

## 4. Thứ tự thực hiện

```
Fix 1.1 → Fix 1.2 → Fix 2.1 → Fix 2.2 → Fix 2.3 → Fix 2.4 → Fix 3.1
```

*Priority 1 phải xong trước vì luồng hiện tại bị broken (accessToken không bao giờ về client).*
