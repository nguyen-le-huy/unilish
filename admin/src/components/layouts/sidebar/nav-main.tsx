/**
 * Nav Main Component
 * 
 * @description
 * Renders the main navigation menu with collapsible sections.
 * Supports nested menu items and active state tracking.
 * 
 * @architecture
 * - Uses React Router for navigation and active state detection
 * - Collapsible sections with smooth animations
 * - Tooltip support for icon-only mode
 */

import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link, useLocation } from "react-router-dom"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"

/* ==================== TYPE DEFINITIONS ==================== */

interface NavSubItem {
  title: string
  url: string
  description?: string
}

interface NavMainItem {
  title: string
  url: string
  icon?: LucideIcon
  isActive?: boolean
  items?: NavSubItem[]
}

interface NavMainProps {
  items: NavMainItem[]
}

/* ==================== COMPONENT ==================== */

export function NavMain({ items }: NavMainProps) {
  /* ==================== HOOKS ==================== */
  const location = useLocation()

  /* ==================== RENDER ==================== */
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => {
          /* ==================== ACTIVE STATE CHECK ==================== */
          // Check if this item or any of its subitems match current route
          const isActive = item.url === location.pathname ||
            item.items?.some(sub => location.pathname === sub.url || location.pathname.startsWith(`${sub.url}/`))

          /* ==================== SIMPLE LINK (No Subitems) ==================== */
          // If no subitems, render as direct navigation link
          if (!item.items || item.items.length === 0) {
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  tooltip={item.title}
                  asChild
                  isActive={location.pathname === item.url}
                >
                  <Link to={item.url}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          }

          /* ==================== COLLAPSIBLE SECTION (With Subitems) ==================== */
          // If has subitems, render as expandable/collapsible section
          return (
            <Collapsible
              key={item.title}
              asChild
              defaultOpen={isActive || item.isActive}
              className="group/collapsible"
            >
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton tooltip={item.title}>
                    {item.icon && <item.icon />}
                    <span>{item.title}</span>
                    <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.items.map((subItem) => (
                      <SidebarMenuSubItem key={subItem.title}>
                        <SidebarMenuSubButton
                          asChild
                          isActive={location.pathname === subItem.url || location.pathname.startsWith(`${subItem.url}/`)}
                        >
                          <Link to={subItem.url}>
                            <span>{subItem.title}</span>
                          </Link>
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
