import { PageHeader } from "@/components/common/PageHeader";
import { UserFilterBar } from "@/features/users/components/UserFilter";
import { UserTable } from "@/features/users/components/UserTable";
import { UserSubscriptionModal } from "@/features/users/components/UserSubscriptionModal";
import { UserRoleModal } from "@/features/users/components/UserRoleModal";
import { UserDetailsSheet } from "@/features/users/components/UserDetailsSheet";
import { UserStatsCards } from "@/features/users/components/UserStatsCards";
import { useUsers, useUserStats } from "@/features/users/hooks/useUsers";
import type { User, UserFilter } from "@/features/users/types";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function UsersPage() {
    const [filter, setFilter] = useState<UserFilter>({
        page: 1,
        limit: 10,
    });
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    const { data: userResponse, isLoading } = useUsers(filter);
    const { data: stats } = useUserStats();

    const handleEditSubscription = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleEditRole = (user: User) => {
        setSelectedUser(user);
        setIsRoleModalOpen(true);
    };

    const handleViewDetails = (user: User) => {
        setSelectedUser(user);
        setIsDetailsOpen(true);
    };

    const handlePageChange = (newPage: number) => {
        setFilter({ ...filter, page: newPage });
    };

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Quản lý học viên"
                description="Danh sách học viên, quản lý gói cước và phân quyền."
            />

            {stats && <UserStatsCards stats={stats} />}

            <UserFilterBar filter={filter} onChange={setFilter} />

            <UserTable
                users={userResponse?.users || []}
                loading={isLoading}
                onEditSubscription={handleEditSubscription}
                onEditRole={handleEditRole}
                onViewDetails={handleViewDetails}
            />

            {/* Pagination Controls */}
            {userResponse && userResponse.pagination.pages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange((filter.page || 1) - 1)}
                        disabled={filter.page === 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Trước
                    </Button>
                    <div className="text-sm font-medium">
                        Trang {filter.page} / {userResponse.pagination.pages}
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange((filter.page || 1) + 1)}
                        disabled={filter.page === userResponse.pagination.pages}
                    >
                        Sau
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}

            <UserSubscriptionModal
                user={selectedUser}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            <UserRoleModal
                user={selectedUser}
                open={isRoleModalOpen}
                onOpenChange={setIsRoleModalOpen}
            />

            <UserDetailsSheet
                user={selectedUser}
                open={isDetailsOpen}
                onOpenChange={setIsDetailsOpen}
            />
        </div>
    );
}
