import * as React from "react"
import {
  LayoutDashboard,
  BookOpen,
  Users,
  CreditCard,
  Settings,
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuthStore } from "@/stores/auth-store"

// Sidebar navigation structure for Admin CMS
const sidebarData = {
  teams: [
    {
      name: "Unilish",
      logo: LayoutDashboard,
      plan: "Admin Panel",
    },
  ],
  navMain: [
    // TỔNG QUAN
    {
      title: "Tổng quan",
      url: "/dashboard",
      icon: LayoutDashboard,
      isActive: true,
    },
    // ĐÀO TẠO (Content)
    {
      title: "Đào tạo",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Khóa học (LMS)",
          url: "/courses",
          description: "Quản lý Level A1-C2 → Unit → Topic",
        },
        {
          title: "Bài học",
          url: "/lessons",
          description: "Soạn thảo Slide bài học",
        },
        {
          title: "Kho câu hỏi",
          url: "/questions",
          description: "Question Bank trắc nghiệm",
        },
        {
          title: "Video / Youtube",
          url: "/videos",
          description: "Youtube Gap-Fill",
        },
        {
          title: "Tin tức (News)",
          url: "/news",
          description: "Bài báo CNN/BBC",
        },
      ],
    },
    // NGƯỜI DÙNG
    {
      title: "Người dùng",
      url: "#",
      icon: Users,
      items: [
        {
          title: "Học viên",
          url: "/users",
          description: "Quản lý user, tiến độ học",
        },
      ],
    },
    // KINH DOANH
    {
      title: "Kinh doanh",
      url: "#",
      icon: CreditCard,
      items: [
        {
          title: "Gói cước",
          url: "/plans",
          description: "Free, Plus, Pro & Voucher",
        },
        {
          title: "Giao dịch",
          url: "/transactions",
          description: "Lịch sử thanh toán",
        },
      ],
    },
    // HỆ THỐNG
    {
      title: "Hệ thống",
      url: "#",
      icon: Settings,
      items: [
        {
          title: "AI & Prompts",
          url: "/ai-config",
          description: "Cấu hình Speaking Coach",
        },
        {
          title: "Media / Files",
          url: "/media",
          description: "Cloudinary & R2",
        },
        {
          title: "Cấu hình",
          url: "/settings",
          description: "SEO, Banner, Thông báo",
        },
      ],
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Get real user data from auth store
  const user = useAuthStore((state) => state.user);

  // Build user object for NavUser component
  const userData = {
    name: user?.fullName || "Admin",
    email: user?.email || "admin@unilish.vn",
    avatar: user?.avatarUrl || "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarData.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
