---
description: Comprehensive workflow for the User Management feature in Unilish Admin
---

# Luồng hoạt động User Management

---

## 1. Analytics Dashboard Flow

```mermaid
sequenceDiagram
    participant A as 👨‍💼 Admin
    participant F as 🖥️ Frontend
    participant S as 🖥️ Server
    participant DB as 💾 MongoDB

    A->>F: Navigate to /users
    F->>S: GET /api/v1/users/stats
    S->>DB: Aggregate queries
    Note over DB: Count total, premium, new, active
    DB-->>S: Stats data
    S-->>F: { totalUsers, premiumUsers, ... }
    F->>F: Render UserStatsCards
    F-->>A: Display 4 metric cards ✅
```

### Code Reference
| Step | File | Function |
|------|------|----------|
| 2 | [useUsers.ts](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/features/users/hooks/useUsers.ts) | `useUserStats()` |
| 3-5 | [user.service.ts](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/user.service.ts#L69-91) | `getUserStats()` |
| 6-7 | [UserStatsCards.tsx](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/features/users/components/UserStatsCards.tsx) | Component |

---

## 2. Search & Filter Flow

```mermaid
sequenceDiagram
    participant A as 👨‍💼 Admin
    participant F as 🖥️ Frontend
    participant S as 🖥️ Server
    participant DB as 💾 MongoDB

    A->>F: Type "Nguyen" in search
    F->>F: Debounce 500ms
    F->>S: GET /users?search=Nguyen
    S->>DB: $regex query on email, fullName
    DB-->>S: Matching users
    S-->>F: { users, pagination }
    F->>F: Update UserTable
    F-->>A: Show filtered results ✅
```

### Code Reference
| Step | File | Function |
|------|------|----------|
| 2 | [useDebounce.ts](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/hooks/useDebounce.ts) | Debounce hook |
| 3 | [user.api.ts](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/features/users/api/user.api.ts) | `getUsers()` |
| 4-5 | [user.service.ts](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/user.service.ts#L33-68) | `getUsers()` |

---

## 3. Update Subscription Flow

```mermaid
sequenceDiagram
    participant A as 👨‍💼 Admin
    participant F as 🖥️ Frontend
    participant S as 🖥️ Server
    participant DB as 💾 MongoDB

    A->>F: Select Plan: PRO, Period: 1 Year
    F->>S: PATCH /users/:id/subscription
    S->>S: Calculate endDate = now + 365 days
    S->>DB: Update subscription fields
    DB-->>S: Updated user
    S-->>F: Success response
    F->>F: Toast "Success"
    F->>F: invalidateQueries(['users'])
    F->>S: GET /users (refetch)
    F-->>A: Table shows updated plan ✅
```

### Code Reference
| Step | File | Function |
|------|------|----------|
| 2 | [useUsers.ts](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/features/users/hooks/useUsers.ts) | `useUpdateSubscription()` |
| 3-5 | [user.service.ts](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/user.service.ts#L93-118) | `updateSubscription()` |
| 7-8 | React Query | Cache invalidation |

---

## 4. Update Role Flow

```mermaid
sequenceDiagram
    participant A as 👨‍💼 Admin
    participant F as 🖥️ Frontend
    participant S as 🖥️ Server
    participant DB as 💾 MongoDB

    A->>F: Select new role: Content Creator
    F->>S: PATCH /users/:id/role
    S->>DB: Update role field
    DB-->>S: Updated user
    S-->>F: Success response
    F->>F: invalidateQueries(['users'])
    F-->>A: Role badge updated ✅
```

### Code Reference
| Step | File | Function |
|------|------|----------|
| 2 | [useUsers.ts](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/features/users/hooks/useUsers.ts) | `useUpdateRole()` |
| 3-4 | [user.service.ts](file:///Users/nguyenlehuy/Downloads/unilish/server/src/services/user.service.ts#L120-136) | `updateRole()` |

---

## 5. View User Details Flow

```mermaid
sequenceDiagram
    participant A as 👨‍💼 Admin
    participant F as 🖥️ Frontend

    A->>F: Click "View Details" (Eye icon)
    F->>F: setSelectedUser(rowData)
    F->>F: Open UserDetailsSheet (Dialog)
    Note over F: No API call - reuse existing data!
    F-->>A: Show comprehensive profile ✅
```

### Code Reference
| Step | File | Function |
|------|------|----------|
| 2-3 | [UsersPage.tsx](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/pages/users/UsersPage.tsx#L37-40) | `handleViewDetails()` |
| 4 | [UserDetailsSheet.tsx](file:///Users/nguyenlehuy/Downloads/unilish/admin/src/features/users/components/UserDetailsSheet.tsx) | Dialog component |

---

## 6. Technical Decisions

| Quyết định | Lý do |
|------------|-------|
| **Refetch over Optimistic UI** | Đảm bảo data 100% chính xác với DB |
| **Debouncing** | Giảm 90% API calls khi typing |
| **Layered Architecture** | Business logic tách biệt, dễ test |
| **React Query Cache** | `staleTime: 60s` tránh spam requests |

---

*Cập nhật: 2026-01-06*
