---
description: Authentication Implementation Workflow
---

# Luồng hoạt động Authentication

Tài liệu này mô tả chi tiết các luồng xác thực trong hệ thống.

---

## 1. Google Login Flow (Client)

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant C as 📱 Client
    participant CK as 🔐 Clerk
    participant S as 🖥️ Server
    participant DB as 💾 MongoDB

    U->>C: Click "Continue with Google"
    C->>CK: Open OAuth Popup
    CK->>CK: Google Authentication
    CK-->>C: Return Clerk Session
    C->>C: Extract clerkId, email, fullName
    C->>S: POST /api/auth/sync-clerk
    S->>DB: Find by email OR clerkId
    alt User exists
        S->>DB: Update clerkId, avatar
    else New user
        S->>DB: Create new User
    end
    S->>S: Generate JWT
    S-->>C: Return { token, user }
    C->>C: Store JWT in localStorage
    C-->>U: Redirect to Dashboard ✅
```

### Code Files
| Step | File | Function |
|------|------|----------|
| 1-3 | [useGoogleAuth.ts](file:///Users/nguyenlehuy/Downloads/unilish/client/src/features/auth/hooks/useGoogleAuth.ts) | Clerk integration |
| 4-5 | [auth-api.ts](file:///Users/nguyenlehuy/Downloads/unilish/client/src/features/auth/api/auth-api.ts) | `syncClerk()` |
| 6-10 | [auth.service.ts](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/auth.service.ts#L178-244) | `syncWithClerk()` |

---

## 2. Traditional Registration Flow (Client)

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant C as 📱 Client
    participant S as 🖥️ Server
    participant N as 📧 n8n
    participant DB as 💾 MongoDB

    U->>C: Fill Register Form
    C->>C: Zod Validation
    C->>S: POST /api/auth/register
    S->>DB: Check email exists?
    alt Email taken
        S-->>C: Error 400
    else Available
        S->>S: Generate 6-digit OTP
        S->>S: Hash OTP (Bcrypt)
        S->>DB: Create User (isVerified: false)
        S->>N: Webhook: Send OTP Email
        S-->>C: Success 200
        C-->>U: Redirect to /verify-otp
    end
```

### Code Files
| Step | File | Function |
|------|------|----------|
| 2 | [auth.schema.ts](file:///Users/nguyenlehuy/Downloads/unilish/client/src/features/auth/types/auth.schema.ts) | `registerSchema` |
| 3 | [useTraditionalAuth.ts](file:///Users/nguyenlehuy/Downloads/unilish/client/src/features/auth/hooks/useTraditionalAuth.ts) | `register()` |
| 4-10 | [auth.service.ts](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/auth.service.ts#L14-59) | `register()` |
| 9 | [email.service.ts](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/email.service.ts) | `sendOTP()` |

---

## 3. OTP Verification Flow (Client)

```mermaid
sequenceDiagram
    participant U as 👤 User
    participant C as 📱 Client
    participant S as 🖥️ Server
    participant DB as 💾 MongoDB

    U->>U: Check email, copy OTP
    U->>C: Enter 6-digit code
    C->>S: POST /api/auth/verify-otp
    S->>DB: Find user by email
    S->>S: Check OTP expiry (10 mins)
    S->>S: bcrypt.compare(input, hashedOTP)
    alt Match
        S->>DB: Set isVerified: true
        S->>S: Generate JWT
        S-->>C: Return { token, user }
        C-->>U: Login success ✅
    else No match
        S-->>C: Error 400
    end
```

### Code Files
| Step | File | Function |
|------|------|----------|
| 2-3 | [OTPForm.tsx](file:///Users/nguyenlehuy/Downloads/unilish/client/src/features/auth/components/OTPForm.tsx) | UI Component |
| 4-10 | [auth.service.ts](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/auth.service.ts#L61-111) | `verifyOTP()` |

---

## 4. Admin Login Flow (Admin Portal)

```mermaid
sequenceDiagram
    participant A as 👨‍💼 Admin
    participant AD as 🖥️ Admin App
    participant S as 🖥️ Server
    participant DB as 💾 MongoDB

    A->>AD: Enter Email/Password
    AD->>AD: Zod Validation
    AD->>S: POST /api/auth/login
    S->>DB: Find user + password
    S->>S: bcrypt.compare()
    alt Password correct
        S->>S: Check isVerified
        alt Verified
            S->>S: Generate JWT
            S-->>AD: Return { token, user }
            AD->>AD: Check user.role
            alt role === 'admin'
                AD->>AD: Store in Zustand
                AD-->>A: Redirect to Dashboard ✅
            else role !== 'admin'
                AD-->>A: "Access Denied" Toast ❌
            end
        else Not verified
            S->>S: Resend OTP
            S-->>AD: Error 403
        end
    else Wrong password
        S-->>AD: Error 401
    end
```

### Code Files
| Step | File | Function |
|------|------|----------|
| 1-3 | [LoginForm.tsx](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/features/auth/components/LoginForm.tsx) | UI Component |
| 3 | [useAuth.ts](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/features/auth/hooks/useAuth.ts) | Login mutation |
| 4-8 | [auth.service.ts](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/auth.service.ts#L113-168) | `login()` |

---

## 5. Key Technical Decisions

| Quyết định | Lý do |
|------------|-------|
| **Hybrid Auth** | Giảm rào cản (Google) + Duy trì accessibility (Email) |
| **JWT** | Stateless, scale tốt, hoạt động trên mobile/web |
| **Hashed OTP** | Bảo mật - DB leak không lộ OTP |
| **n8n Email** | Tách biệt email logic khỏi core server |

---

*Cập nhật: 2026-01-06*
