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
 * @structure
 * 1. Languages → Root data: mã ngôn ngữ, TTS provider, voice config
 * 2. Goals & Strategy → Learning objectives & skill weights
 * 3. Courses → Directly managed with Language + Learning Goal, Units & Lessons
 * 4. Question Bank → Reusable questions
 * 5. Resources → External content (News, YouTube)
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
          title: "Khóa học (Courses)",
          url: "/curriculum/courses",
          description: "Quản lý Course → Unit → Lesson",
        },
        {
          title: "Ngân hàng Câu hỏi",
          url: "/questions",
          description: "Question Bank tái sử dụng",
        },
        {
          title: "Bài Kiểm tra Đầu vào",
          url: "/placement-tests",
          description: "Quản lý bài kiểm tra xếp lớp theo ngôn ngữ",
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
