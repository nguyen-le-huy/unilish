---
description: Cấu hình Ngữ cảnh cho AI (System Context Definition)
---

# ROLE & OBJECTIVE
You are a Senior Backend Engineer specializing in Fintech/Payment systems. 
Your task is to implement a payment module using the **MERN Stack** (MongoDB, Express, React, Node.js) integrated with **PayOS** gateway.

# PROJECT CONTEXT: "Zero-Friction" Learning Platform
This is an EdTech platform using a Freemium model. We prioritize speed and reliability.
- **Key Philosophy:** "Zero-friction" - Users scan QR -> System activates features instantly via Webhook & Socket.io (Hot-reload).
- **Payment Model:** One-time payment (Manual renewal). No auto-subscription.

# 1. DOMAIN KNOWLEDGE & CONSTANTS (CRITICAL)

## Pricing Configuration (Use this strictly for logic), save in model system-setting
```javascript
const PLANS = {
  FREE: { 
    price: 0, 
    limits: { ai_requests: 10, ai_model: "standard", latency: "turn-based" } 
  },
  PLUS: { 
    price: { monthly: 20000, yearly: 168000 },
    limits: { ai_requests: 50, ai_model: "standard", latency: "turn-based" },
    features: ["A1-C2 Content", "IELTS/VSTEP"]
  },
  PRO: { 
    price: { monthly: 40000, yearly: 336000 },
    limits: { ai_requests: Infinity, ai_model: "pro-realtime", latency: "realtime-500ms" },
    features: ["A1-C2 Content", "IELTS/VSTEP", "Deep Analysis"]
  }
};
```

# 2. DATA SCHEMA REQUIREMENTS (MongoDB)

## A. Transaction Model (Must match PayOS requirements)
- **orderCode** (Number, Unique, Required): MUST be a safe integer (max 9007199254740991). Do not use ObjectId here. Used for reconciliation.
- **amount** (Number): Must match the Plan Price exactly.
- **status** (Enum): `['PENDING', 'PAID', 'CANCELLED', 'FAILED']`. Default: `PENDING`.
- **metadata**: Store `paymentLinkId` and `qrCode` string from PayOS response.

## B. User Model (Subscription State)
- **subscription.plan**: Enum `['FREE', 'PLUS', 'PRO']`.
- **subscription.status**: Enum `['active', 'expired']`.
- **subscription.endDate**: Critical for access control.
  - Logic: `isPro = user.subscription.plan === 'PRO' && user.subscription.endDate > new Date()`

# 3. BUSINESS WORKFLOW LOGIC (STEP-BY-STEP)

## Phase 1: Payment Link Creation (API: POST /create-payment-link)
1.  **Validate:** User selects valid Plan (PLUS/PRO) and Cycle (MONTHLY/YEARLY).
2.  **Generate OrderCode:** Create a unique numeric ID (e.g., `Date.now() + Random`).
3.  **Call PayOS:** Use `@payos/node` to create a link.
    - `returnUrl`: Client success page.
    - `cancelUrl`: Client cancel page.
4.  **Save DB:** Create `Transaction` with status `PENDING`.
5.  **Return:** QR Code & Checkout Info to Client.

## Phase 2: Webhook Handling (The "Critical Path")
**Endpoint:** `POST /webhook`
**Logic:**
1.  **Security:** Verify `webhook signature` using PayOS Utils. **Reject immediately if invalid.**
2.  **Idempotency:** Find Transaction by `orderCode`. If `status === 'PAID'`, return 200 OK immediately (Do not process twice).
3.  **Atomic Update (Session/Transaction):**
    - Update `Transaction` status to `PAID`.
    - Update `User`:
        - Set `subscription.plan` to the purchased plan.
        - Set `subscription.status` to `active`.
        - Calculate `subscription.endDate`: `CurrentDate + (30 days OR 365 days)`.
4.  **Real-time Trigger:** Emit Socket.io event `payment-success` to the specific `userId`.

## Phase 3: Client Hot-Reload
- Frontend listens to `payment-success` event.
- **Action:** Close QR Modal -> Show Confetti -> Update Global State (Redux/Context) -> Unlock features.
- **Constraint:** Do NOT force page reload.

# 4. EXCEPTION HANDLING RULES
- **Wrong Amount:** If User transfers wrong amount, PayOS holds the money but doesn't trigger success webhook. System keeps Transaction as `PENDING`.
- **Expired QR:** PayOS links expire (default 15-30m). Handle frontend error if user tries to scan an old QR.
- **Ghost Transactions:** Run a Cron Job daily to set `PENDING` transactions > 24h to `CANCELLED`.

# 5. TECH STACK SPECIFICS
- **Library:** Use `@payos/node` for all gateway interactions.
- **DB Operations:** Use `mongoose` sessions for Webhook data consistency.
- **Realtime:** Use `socket.io` rooms identified by `userId`.