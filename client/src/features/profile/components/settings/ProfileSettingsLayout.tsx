import { SidebarNav } from "./SidebarNav";

interface ProfileSettingsLayoutProps {
    children: React.ReactNode;
}

const sidebarNavItems = [
    {
        title: "Tổng quan",
        href: "overview",
    },
    {
        title: "Hồ sơ của tôi",
        href: "my-profile",
    },
    {
        title: "Bảo mật",
        href: "security",
    },
    {
        title: "Đội nhóm",
        href: "teams",
    },
    {
        title: "Thành viên",
        href: "team-member",
    },
    {
        title: "Thông báo",
        href: "notifications",
    },
    {
        title: "Thanh toán",
        href: "billing",
    },
    {
        title: "Xuất dữ liệu",
        href: "data-export",
    },
];

export default function ProfileSettingsLayout({ children }: ProfileSettingsLayoutProps) {
    return (
        <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0 p-4 md:p-6 max-w-7xl mx-auto w-full">
            <aside className="-mx-4 lg:w-1/5 overflow-x-auto lg:overflow-visible">
                <div className="sticky top-6">
                    <h2 className="mb-4 text-xl font-semibold tracking-tight px-4 lg:px-0">Cài đặt tài khoản</h2>
                    <SidebarNav items={sidebarNavItems} />
                </div>
            </aside>
            <div className="flex-1 lg:max-w-4xl">{children}</div>
        </div>
    );
}
