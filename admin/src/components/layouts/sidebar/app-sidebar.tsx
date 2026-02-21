import * as React from "react"

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
import { useAuthStore } from "@/features/auth"
import { sidebarConfig } from "@/config/sidebar.config"


/**
 * App Sidebar Component
 * 
 * @description
 * Main sidebar navigation for the Admin CMS.
 * Displays hierarchical menu structure with collapsible sections.
 * 
 * @architecture
 * - Uses centralized config from sidebar.config.ts
 * - Integrates with auth store for user information
 * - Responsive with icon-only collapsed state
 */
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  /* ==================== HOOKS ==================== */
  // Get authenticated user data from global auth store
  const user = useAuthStore((state) => state.user);

  /* ==================== DERIVED STATE ==================== */
  // Build user object for NavUser component with fallback values
  const userData = {
    name: user?.fullName || "Admin",
    email: user?.email || "admin@unilish.vn",
    avatar: user?.avatarUrl || "",
  };

  /* ==================== RENDER ==================== */
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarConfig.teams} />
      </SidebarHeader>
      
      <SidebarContent>
        <NavMain items={sidebarConfig.navMain} />
      </SidebarContent>
      
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
