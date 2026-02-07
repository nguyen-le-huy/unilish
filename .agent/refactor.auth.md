# REFACTOR PLAN: Migrate from Clerk to Google OAuth 2.0

This plan outlines the steps to replace Clerk with a self-hosted Google OAuth solution using Passport.js.

## Phase 1: Backend Infrastructure Setup

- [ ] **Dependencies**: Install required packages.
  ```bash
  npm install passport passport-google-oauth20 cookie-session
  npm install -D @types/passport @types/passport-google-oauth20 @types/cookie-session
  ```
- [ ] **Environment Variables**: Add Google credentials to `server/src/config/env.ts` (validate with Zod).
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `SESSION_SECRET` (for cookie encryption)
- [ ] **Passport Configuration**:
  - Create `server/src/config/passport.ts`.
  - Implement `GoogleStrategy`.
  - Configure `passport.serializeUser` and `passport.deserializeUser`.
- [ ] **Middleware Setup**:
  - Initialize `passport` and `cookie-session` in `server/src/app.ts`.

## Phase 2: Database & Service Logic

- [ ] **User Model Update** (`models/mongo/user.model.ts`):
  - Ensure `authProvider` enum supports `'google'`.
  - Add optional fields for Google-specific data if needed (e.g., `googleId` - though strictly we use email).
- [ ] **AuthService Refactor** (`services/auth.service.ts`):
  - **Remove**: `syncWithClerk` method.
  - **Add**: `findOrCreateFromGoogle(profile: GoogleProfile)` method.
    - Logic: Find by email. If exists -> link/update. If new -> create.
    - Return: User & Access Token.

## Phase 3: API Implementation

- [ ] **Auth Controller** (`controllers/auth.controller.ts`):
  - Create `googleAuth` (starts passport flow).
  - Create `googleCallback` (handles return from Google).
    - On success: Redirect to Client Dashboard with `token` in **HttpOnly Cookie**.
- [ ] **Auth Routes** (`routes/auth.route.ts`):
  - `GET /auth/google` -> `passport.authenticate('google', { scope: ['profile', 'email'] })`
  - `GET /auth/google/callback` -> `passport.authenticate`, then controller callback.

## Phase 4: Frontend Migration (Client)

- [ ] **Remove Clerk**:
  - Uninstall `@clerk/clerk-react`.
  - Remove `<ClerkProvider>` from `client/src/app/providers.tsx`.
  - Delete `client/src/features/auth/hooks/useGoogleAuth.ts`.
- [ ] **Update Login UI**:
  - Edit `client/src/pages/auth/Login.tsx`.
  - Change "Continue with Google" button to a simple link:
    ```tsx
    <a href={`${API_URL}/auth/google`}>Continue with Google</a>
    ```
- [ ] **Handle OAuth Redirect**:
  - Create route `/auth/success`.
  - Implement logic to read user info/token (if passed via URL query as fallback) or strictly rely on checking the HttpOnly cookie status via a `/me` endpoint.
- [ ] **Auth Context**:
  - Ensure `useAuth` relies solely on your internal API, not Clerk.

## Phase 5: Verification & Cleanup

- [ ] **Test Flow**:
  1. Click "Continue with Google".
  2. Approve on Google.
  3. Verify User created in MongoDB.
  4. Verify redirect to Dashboard.
  5. Verify JWT validity.
- [ ] **Security Check**:
  - Ensure no sensitive tokens are exposed in URL.
  - Verify verify `state` parameter in OAuth (Passport handles this) to prevent CSRF.
- [ ] **Cleanup**: Delete unused Clerk keys from `.env`.
