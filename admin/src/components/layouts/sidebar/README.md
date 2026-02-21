# Admin Sidebar Navigation - Architecture Documentation

## 📋 Overview

This document describes the **Admin Sidebar Navigation** architecture for the Unilish platform. The implementation follows enterprise-grade standards with strict TypeScript typing, clean separation of concerns, and hierarchical content structure.

---

## 🏗️ Architecture

### File Structure

```
admin/src/
├── config/
│   └── sidebar.config.ts          # Centralized navigation configuration
│
└── components/
    └── layouts/
        └── sidebar/
            ├── app-sidebar.tsx      # Main sidebar component
            ├── nav-main.tsx         # Navigation menu renderer
            ├── nav-user.tsx         # User profile section
            └── team-switcher.tsx    # Organization switcher
```

### Key Principles

1. **Separation of Concerns**: Navigation data is separated from rendering logic
2. **Type Safety**: Strict TypeScript interfaces for all data structures
3. **Maintainability**: Centralized config makes changes easier
4. **Scalability**: Hierarchical structure supports deep nesting

---

## 🎯 Menu Structure (Đào tạo Section)

The **Đào tạo (Training)** section has been refactored to follow the database hierarchy:

### Before (Flat Structure) ❌
```
- Khóa học (LMS)
- Bài học
- Kho câu hỏi
- Video / Youtube
- Tin tức (News)
```

### After (Hierarchical Structure) ✅
```
1. Mục tiêu & Chiến lược     → Learning Goals & Skill Weights
2. Bộ khóa học (Series)      → Course Series (A1-C2 grouping)
3. Khóa học (Courses)        → Course → Unit → Lesson
4. Knowledge Graph           → Atomic Concepts (Grammar, Vocab)
5. Ngân hàng Câu hỏi         → Reusable Question Bank
6. Tài nguyên mở rộng        → News & YouTube (combined)
```

---

## 💻 Configuration Usage

### Adding a New Menu Item

```typescript
// config/sidebar.config.ts

{
  title: "New Section",
  url: "#",
  icon: YourIconComponent,
  items: [
    {
      title: "Sub Item",
      url: "/your-route",
      description: "Description for tooltip"
    }
  ]
}
```

### Types Available

```typescript
interface SidebarSubItem {
  title: string
  url: string
  description?: string
}

interface SidebarNavItem {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  items?: SidebarSubItem[]
}
```

---

## 🔧 Component Details

### `app-sidebar.tsx`

**Purpose**: Main container for the sidebar
- Integrates with auth store for user info
- Uses centralized config
- Responsive collapsible behavior

### `nav-main.tsx`

**Purpose**: Renders navigation menu with active state tracking
- Auto-detects current route
- Handles collapsible sections
- Supports tooltips in icon-only mode

### `sidebar.config.ts`

**Purpose**: Single source of truth for navigation
- Strict TypeScript interfaces
- Documented structure
- Utility functions for route searching

---

## 🎨 UI/UX Features

1. **Active State Highlighting**: Current route is automatically highlighted
2. **Auto-Expand**: Parent section opens when child route is active
3. **Collapsible**: Click parent to expand/collapse subitems
4. **Icon-Only Mode**: Sidebar can collapse to icons with tooltips
5. **Smooth Animations**: Chevron rotates, content slides

---

## 🚀 Benefits of New Structure

| Benefit | Description |
|---------|-------------|
| **Maintainability** | All menu items in one config file |
| **Type Safety** | No runtime errors from typos |
| **Scalability** | Easy to add new sections |
| **Consistency** | Same pattern for all menu items |
| **Performance** | No unnecessary re-renders |

---

## 📝 Best Practices

### DO ✅

- Use descriptive menu titles
- Add descriptions for complex features
- Keep routes RESTful (`/curriculum/goals`)
- Use semantic icons from Lucide React
- Document new sections in config

### DON'T ❌

- Hardcode menu items in components
- Use generic icons (❓ for everything)
- Create deeply nested menus (max 2 levels)
- Forget to update types when changing structure

---

## 🔍 Example: Adding "Analytics" Section

```typescript
// 1. Import icon
import { BarChart } from "lucide-react"

// 2. Add to navMain array in sidebar.config.ts
{
  title: "Analytics",
  url: "#",
  icon: BarChart,
  items: [
    {
      title: "User Activity",
      url: "/analytics/users",
      description: "User engagement metrics"
    },
    {
      title: "Course Performance",
      url: "/analytics/courses",
      description: "Course completion rates"
    }
  ]
}
```

---

## 🧪 Testing

### Check Active States

1. Navigate to `/curriculum/goals`
2. Verify "Đào tạo" section is expanded
3. Verify "Mục tiêu & Chiến lược" is highlighted

### Check Collapsible Behavior

1. Click "Đào tạo" parent
2. Verify subitems collapse/expand smoothly
3. Verify chevron rotates correctly

---

## 📚 Related Files

- `admin/src/app/router.tsx` - Route definitions
- `admin/src/features/*` - Feature modules
- `admin/src/components/ui/sidebar.tsx` - Shadcn UI components

---

## 🔄 Migration Notes

If you were previously using the old structure:

1. **Route Changes**:
   - `/lessons` → Removed (access via `/courses/{id}/units`)
   - `/videos` → `/curriculum/resources`
   - `/news` → `/curriculum/resources`

2. **New Routes**:
   - `/curriculum/goals` - Learning Goals
   - `/curriculum/series` - Course Series
   - `/curriculum/concepts` - Knowledge Graph

---

## 👥 Maintainers

- **Architecture**: Senior Dev Team
- **Config**: Update `sidebar.config.ts`
- **Components**: Update files in `components/layouts/sidebar/`

---

*Last Updated: February 17, 2026*
*Version: 2.0*
