import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/common/mode-toggle"
import NotificationButton from "@/components/common/notification-button"

export function SiteHeader() {
  return (
    <header className="group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 flex h-12 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear p-8 lg:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Unilish</h1>
      </div>
      <div className="flex items-center gap-10">
        <ModeToggle />
        <NotificationButton />
      </div>
    </header>
  )
}
