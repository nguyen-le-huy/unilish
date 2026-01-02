---
description: Authentication System Design
---

# Unilish Authentication System

## Overview
| Application | Auth Method | Provider |
|-------------|-------------|----------|
| **Client (User)** | Google OAuth + Email/Password | Clerk + Custom JWT |
| **Admin (CMS)** | Email/Password only | Custom JWT |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| **Client OAuth** | Clerk React SDK |
| **Forms** | React Hook Form + Zod |
| **Server Auth** | JWT + Bcrypt |
| **Database** | MongoDB (User collection) |
| **Notifications** | Sonner |
| **State** | Zustand (persist) |

---

## Authentication Flows

### Client: Google OAuth (Clerk)
```
User → "Login with Google" → Clerk OAuth → Server Sync → JWT Token
```

### Client: Email/Password (OTP Verified)
```
1. Register → POST /api/auth/register → Email OTP Sent (via n8n) → Redirect to /verify-otp
2. Verify → Input Code → POST /api/auth/verify-otp → JWT Token
3. Login (Unverified) → Error 403 → Auto Resend OTP → Redirect to /verify-otp
```

### Admin: Email/Password Only
```
Admin → Form submission → Zod validation → POST /api/auth/login → Role Check → JWT Token
```

**Admin Role Check:** Server returns user, client checks `user.role === 'admin'`. If not admin, show "Access Denied".

---

## User Linking Logic

Khi user đăng ký email/password rồi login Clerk với cùng email:
```typescript
User.findOne({ $or: [{ clerkId }, { email }] })
```
→ Accounts linked automatically based on email match.
→ `clerkId` is added to the existing user record.
→ **Crucial:** User can still login with their old password (Local) OR use Google (Clerk) interchangeably. XP/coins are preserved across both methods.

---

## Route Protection Strategy
- **Client (Hybrid):** 
    - `AuthGuard` checks `Clerk.isSignedIn` OR `localStorage(unilish_token)`.
    - If Google Login: `isSignedIn` = true.
    - If Email/Pass: `unilish_token` exists.
    - Ensures seamless experience for both auth methods.
- **Admin:** checks `useAuthStore` (persisted state).

---

## API Endpoints

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/api/auth/sync-clerk` | POST | Sync Clerk user | ✅ |
| `/api/auth/register` | POST | Register + Send OTP | ✅ |
| `/api/auth/login` | POST | Traditional login (Check Verified) | ✅ |
| `/api/auth/verify-otp` | POST | Verify Email OTP | ✅ |

---

## Security

| Aspect | Implementation |
|--------|----------------|
| Password | Bcrypt (10 rounds) |
| JWT | HS256, 7 days expiry |
| Validation | Zod (client + server) |
| Admin Access | Role-based check on client |
| OTP | Random 6 digits, Hashed in DB, 10m expiry |

---

## Environment Variables

```bash
# Client
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxx
VITE_API_URL=http://localhost:5432/api

# Admin
VITE_API_URL=http://localhost:5432/api

# Server
JWT_SECRET=your_secret_key
MONGO_URI=mongodb://...
N8N_WEBHOOK_URL=http://n8n... (For sending emails)
```

---

*Last Updated: 2026-01-02*