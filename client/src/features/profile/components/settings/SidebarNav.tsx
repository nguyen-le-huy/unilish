import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";

export interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
    items: {
        href: string;
        title: string;
        icon?: React.ReactNode;
        isDestructive?: boolean;
    }[];
}

export function SidebarNav({ className, items, ...props }: SidebarNavProps) {
    const { search } = useLocation();

    // Determine active item based on search params (query) since we might use query params for tabs in ProfilePage
    // Or we stick to strict routing. The prompt implies tabs on the profile page.
    // Let's assume we use ?tab=key for simplicity in a single page, or sub-routes.
    // Given existing router.tsx has /dashboard/profile, let's use query params for now to avoid route complexity 
    // unless I see sub-routes are better.
    // Actually, sub-routes are cleaner: /dashboard/profile/overview, /dashboard/profile/settings, etc.
    // But modification of router.tsx again might be risky if not requested.
    // I'll use query params: ?tab=my-profile

    const currentTab = new URLSearchParams(search).get("tab") || "overview";

    return (
        <nav
            className={cn(
                "flex lg:flex-col lg:space-x-0 lg:space-y-1 overflow-x-auto",
                className
            )}
            {...props}
        >
            {items.map((item) => {
                const isActive = currentTab === item.href;
                return (
                    <Link
                        key={item.href}
                        to={`?tab=${item.href}`}
                        className={cn(
                            "justify-start hover:bg-transparent hover:underline px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-colors",
                            isActive
                                ? "bg-blue-50 text-blue-600 hover:no-underline"
                                : "text-muted-foreground hover:bg-muted",
                            item.isDestructive && "text-red-500 hover:text-red-600 mt-auto pt-4"
                        )}
                    >
                        {item.title}
                    </Link>
                );
            })}
        </nav>
    );
}
