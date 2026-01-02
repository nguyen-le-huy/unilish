---
description: Authentication Implementation Workflow
---

# Authentication Implementation Workflow

## File Structure

### Client (`/client`) - Hybrid Auth (Clerk + Email)

| File | Purpose | Status |
|------|---------|--------|
| `.env` | `VITE_CLERK_PUBLISHABLE_KEY`, `VITE_API_URL` | ✅ |
| `src/app/providers.tsx` | ClerkProvider + Toaster | ✅ |
| `src/features/auth/types/auth.schema.ts` | Zod validation schemas | ✅ |
| `src/features/auth/api/auth-api.ts` | API calls (login, register, sync) | ✅ |
| `src/features/auth/hooks/useAuthSync.ts` | Auto-sync Clerk user | ✅ |
| `src/features/auth/hooks/useGoogleAuth.ts` | Google sign-in | ✅ |
| `src/features/auth/hooks/useTraditionalAuth.ts` | Email/password auth | ✅ |
| `src/features/auth/components/LoginForm.tsx` | Login UI with React Hook Form | ✅ |
| `src/features/auth/components/RegisterForm.tsx` | Register UI with React Hook Form | ✅ |
| `src/lib/axios.ts` | JWT interceptor | ✅ |
| `src/lib/notification.ts` | Toast service | ✅ |
| `src/features/auth/components/AuthGuard.tsx` | Hybrid Route Protection (Clerk + JWT) | ✅ |

### Admin (`/admin`) - Traditional Auth Only

| File | Purpose | Status |
|------|---------|--------|
| `.env` | `VITE_API_URL` | ✅ |
| `src/app/providers.tsx` | QueryClient + Toaster | ✅ |
| `src/features/auth/types/auth.schema.ts` | Zod validation | ✅ |
| `src/features/auth/hooks/useAuth.ts` | Login mutation + role check | ✅ |
| `src/features/auth/components/LoginForm.tsx` | Admin login (no OAuth) | ✅ |
| `src/stores/auth-store.ts` | Zustand persist store | ✅ |
| `src/components/common/AuthGuard.tsx` | Route protection | ✅ |
| `src/lib/axios.ts` | JWT interceptor | ✅ |
| `src/lib/notification.ts` | Toast service | ✅ |

### Server (`/server`)

| File | Purpose | Status |
|------|---------|--------|
| `src/services/auth.service.ts` | `syncWithClerk()`, `login()`, `register()` | ✅ |
| `src/controllers/auth.controller.ts` | HTTP handlers | ✅ |
| `src/routes/auth.route.ts` | `/sync-clerk`, `/login`, `/register` | ✅ |

---

## Implement Email OTP Verification (Traditional Auth)

### Backend
1. Modify `User` model (`otp`, `otpExpires`, `isVerified`).
2. Create `EmailService` to connect with n8n Webhook.
3. Update `AuthService.register`:
   - Generate OTP (6 digits).
   - Save hashed OTP to DB.
   - Send Email via `EmailService`.
   - **Do NOT** return token.
4. Add `AuthService.verifyOTP`:
   - Check `otpExpires`.
   - Compare `bcrypt.compare(otp, user.otp)`.
   - Update `isVerified = true`.
   - Return Token & User.
5. Update `AuthService.login`:
   - Check `!user.isVerified`.
   - If unverified: Resend OTP -> Throw 403.
6. Create route `POST /verify-otp`.

### Frontend
1. Create `OTPForm` component (shadcn `input-otp`).
2. Create `OTPPage` and route `/verify-otp`.
3. Update `useTraditionalAuth`:
   - `register`: Redirect to `/verify-otp?email=...`.
   - `login`: If 403 (unverified), redirect to `/verify-otp`.

### n8n Workflow
1. Webhook Node (`POST /send-email`).
2. Gmail Node (Send HTML with `{{otp}}`).

---

## Authentication Matrix

| Feature | Client User | Admin |
|---------|-------------|-------|
| Google OAuth (Clerk) | ✅ | ❌ |
| Email/Password | ✅ | ✅ |
| Role Check | Any | `admin` only |
| Auto-sync with Clerk | ✅ | ❌ |

---

## Implementation Progress

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Client: Clerk OAuth | ✅ Done |
| 2 | Client: Email/Password | ✅ Done |
| 3 | Server: Sync + JWT | ✅ Done |
| 4 | Admin: Traditional login | ✅ Done |
| 5 | OTP verification | 🔜 Pending |

---

## Admin Login Flow

```
Admin → Enter email/password → Zod validation
                                    ↓
POST /api/auth/login → Server returns { user, token }
                                    ↓
Client checks user.role === 'admin'?
    → Yes: Store in Zustand + Navigate to /dashboard
    → No: Show "Access Denied" toast
```

---

## Compliance Checklist ✅

| Rule | Client | Admin |
|------|--------|-------|
| React Hook Form + Zod | ✅ | ✅ |
| Centralized notifications | ✅ | ✅ |
| No `any` types | ✅ | ✅ |
| Zustand for UI state | ✅ | ✅ |
| Controller → Service → Model | ✅ | ✅ |

---

*Last Updated: 2026-01-02*
