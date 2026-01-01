import * as React from "react"
import { Link } from "react-router-dom"
import {
  BookOpen,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  Map,
  Mic,
  MonitorPlay,
  Newspaper,
  Search,
  Settings2,
  Trophy,
} from "lucide-react"

import { NavMain } from "@/components/layouts/sidebar/nav-main"
import { NavSecondary } from "@/components/layouts/sidebar/nav-secondary"
import { NavUser } from "@/components/layouts/sidebar/nav-user"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

function PremiumBadge() {
  return (
    <Badge className="bg-gradient-to-r from-indigo-500 to-pink-500 bg-center text-xs text-white [background-size:105%] rounded-sm border-transparent">
      Premium
    </Badge>
  )
}

const data = {
  user: {
    name: "Huy Nguyen",
    email: "huy@unilish.com",
    avatar: "/avatars/shadcn.jpg",
  },
  main: [
    {
      title: "Tổng quan",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Lộ trình học",
      url: "/courses",
      icon: Map,
    },
  ],
  practice: [
    {
      title: "Luyện nói AI",
      url: "/speaking",
      icon: Mic,
      badge: <PremiumBadge />,
    },
    {
      title: "Đọc báo CNN",
      url: "/news",
      icon: Newspaper,
    },
    {
      title: "Luyện nghe Video",
      url: "/youtube",
      icon: MonitorPlay,
    },
    {
      title: "Video call",
      url: "/connect",
      icon: Handshake,
    },
  ],
  community: [
    {
      title: "Bảng xếp hạng",
      url: "/leaderboard",
      icon: Trophy,
    },
  ],
  navSecondary: [
    {
      title: "Cài đặt",
      url: "/settings",
      icon: Settings2,
    },
    {
      title: "Trợ giúp",
      url: "/help",
      icon: LifeBuoy,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link to="/dashboard">
                <BookOpen className="h-5 w-5" />
                <span className="text-base font-semibold">Unilish</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label="CHÍNH" items={data.main} />
        <NavMain label="LUYỆN TẬP" items={data.practice} />
        <NavMain label="CỘNG ĐỒNG" items={data.community} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
