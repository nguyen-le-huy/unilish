import { useLocation } from "react-router-dom"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/common/mode-toggle"
import NotificationButton from "@/components/common/notification-button"
import MessageButton from "@/components/common/message-button"

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/profile": "Hồ sơ cá nhân",
  "/dashboard/courses": "Khóa học",
  "/dashboard/learning": "Học tập",
  "/dashboard/settings": "Cài đặt",
}

export function SiteHeader() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || "Dashboard"

  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear px-4 py-2 sm:px-6 lg:px-6">
      <div className="flex items-center gap-2 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0" />
        <Separator
          orientation="vertical"
          className="mx-1 sm:mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-sm sm:text-base font-medium truncate">{title}</h1>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <ModeToggle />
        <MessageButton />
        <NotificationButton />
      </div>
    </header >
  )
}
