/**
 * Sidebar Navigation Configuration
 * 
 * @description
 * Centralized configuration for the Admin CMS sidebar navigation.
 * Follows Feature-Sliced Design principles and enterprise-grade structure.
 * 
 * @architecture
 * - Strictly typed with TypeScript interfaces
 * - Hierarchical menu structure for content management
 * - Icons from Lucide React for consistency
 * 
 * @author Unilish Team
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CreditCard,
  Settings,
} from "lucide-react";

/* ==================== TYPE DEFINITIONS ==================== */

/**
 * Sub-menu item structure
 */
export interface SidebarSubItem {
  /** Display title */
  title: string;
  /** Route path */
  url: string;
  /** Optional description for tooltip */
  description?: string;
}

/**
 * Main menu item structure
 */
export interface SidebarNavItem {
  /** Display title */
  title: string;
  /** Route path (use '#' for parent-only items) */
  url: string;
  /** Icon component from Lucide React */
  icon: LucideIcon;
  /** Whether this item is active by default */
  isActive?: boolean;
  /** Optional sub-menu items */
  items?: SidebarSubItem[];
}

/**
 * Team switcher data structure
 */
export interface SidebarTeam {
  /** Organization name */
  name: string;
  /** Logo icon */
  logo: LucideIcon;
  /** Plan/tier display text */
  plan: string;
}

/**
 * Complete sidebar configuration structure
 */
export interface SidebarConfig {
  /** Team/Organization info for header */
  teams: SidebarTeam[];
  /** Main navigation items */
  navMain: SidebarNavItem[];
}

/* ==================== NAVIGATION CONFIGURATION ==================== */

/**
 * Main Sidebar Configuration
 * 
 * @structure
 * - Dashboard (Overview)
 * - Đào tạo (Training/Curriculum) - Hierarchical structure
 * - Người dùng (Users)
 * - Kinh doanh (Business)
 * - Hệ thống (System)
 */
export const sidebarConfig: SidebarConfig = {
  teams: [
    {
      name: "Unilish",
      logo: LayoutDashboard,
      plan: "Admin Panel",
    },
  ],

  navMain: [
    /* ==================== DASHBOARD ==================== */
    {
      title: "Tổng quan",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },

    /* ==================== CURRICULUM (ĐÀO TẠO) ==================== */
    /**
     * Training & Content Management Module
     * 
     * @structure (Hierarchical - follows DB model)
     * 1. Goals & Strategy → Learning objectives & skill weights
     * 2. Course Series → Grouping of levels (A1-C2)
     * 3. Courses → Individual courses with Units & Lessons
     * 4. Knowledge Graph → Atomic concepts (Grammar, Vocab)
     * 5. Question Bank → Reusable questions
     * 6. Resources → External content (News, YouTube)
     */
    {
      title: "Đào tạo",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Ngôn ngữ (Languages)",
          url: "/curriculum/languages",
          description: "Root Data: mã ngôn ngữ, TTS provider, voice config",
        },
        {
          title: "Mục tiêu & Chiến lược",
          url: "/curriculum/goals",
          description: "Cấu hình Learning Goals & Skill Weights",
        },
        {
          title: "Bộ khóa học (Series)",
          url: "/curriculum/series",
          description: "Quản lý Series (gom nhóm A1-C2)",
        },
        {
          title: "Khóa học (Courses)",
          url: "/courses",
          description: "Quản lý Course → Unit → Lesson",
        },
        {
          title: "Knowledge Graph",
          url: "/curriculum/concepts",
          description: "Quản lý Concept (Grammar, Vocabulary)",
        },
        {
          title: "Ngân hàng Câu hỏi",
          url: "/questions",
          description: "Question Bank tái sử dụng",
        },
        {
          title: "Tài nguyên mở rộng",
          url: "/curriculum/resources",
          description: "News (CNN/BBC) & YouTube Gap-Fill",
        },
      ],
    },

    /* ==================== USERS ==================== */
    {
      title: "Người dùng",
      url: "#",
      icon: Users,
      items: [
        {
          title: "Học viên",
          url: "/users",
          description: "Quản lý user, tiến độ học, phân quyền",
        },
      ],
    },

    /* ==================== BUSINESS ==================== */
    {
      title: "Kinh doanh",
      url: "#",
      icon: CreditCard,
      items: [
        {
          title: "Gói cước",
          url: "/plans",
          description: "Free, Plus, Pro & Enterprise",
        },
        {
          title: "Mã giảm giá",
          url: "/coupons",
          description: "Quản lý chiến dịch Voucher/Coupon",
        },
        {
          title: "Giao dịch",
          url: "/transactions",
          description: "Lịch sử thanh toán & refund",
        },
      ],
    },

    /* ==================== SYSTEM ==================== */
    {
      title: "Hệ thống",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "AI & Prompts",
          url: "/ai-config",
          description: "Cấu hình Speaking Coach, Feedback AI",
        },
        {
          title: "Media / Files",
          url: "/media",
          description: "Quản lý Cloudinary & Cloudflare R2",
        },
        {
          title: "Cấu hình",
          url: "/settings",
          description: "SEO, Banner, Thông báo hệ thống",
        },
      ],
    },
  ],
};

/* ==================== UTILITY FUNCTIONS ==================== */

/**
 * Get all navigation items
 * @returns Array of all main navigation items
 */
export const getNavItems = (): SidebarNavItem[] => {
  return sidebarConfig.navMain;
};

/**
 * Get team/organization info
 * @returns Array of team configurations
 */
export const getTeamsInfo = (): SidebarTeam[] => {
  return sidebarConfig.teams;
};

/**
 * Find a specific navigation item by URL
 * @param url - The route URL to search for
 * @returns The matching navigation item or undefined
 */
export const findNavItemByUrl = (url: string): SidebarNavItem | undefined => {
  return sidebarConfig.navMain.find((item) => item.url === url);
};

/**
 * Check if a URL belongs to a specific section
 * @param url - Current URL path
 * @param sectionTitle - Section title to check against
 * @returns Boolean indicating if URL is in the section
 */
export const isUrlInSection = (url: string, sectionTitle: string): boolean => {
  const section = sidebarConfig.navMain.find((item) => item.title === sectionTitle);
  if (!section?.items) return false;
  
  return section.items.some((subItem) => url.startsWith(subItem.url));
};
