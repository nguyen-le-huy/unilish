import { ProfileHeader } from "@/features/profile/components/ProfileHeader";
import { StatsCards } from "@/features/profile/components/StatsCards";
import { StatsOverview } from "@/features/dashboard/components/StatsOverview";
import { LevelProgress } from "@/features/profile/components/LevelProgress";
import { AchievementsList } from "@/features/profile/components/AchievementsList";
import { StreakCard } from "@/features/profile/components/StreakCard";

export function ProfileOverview() {
    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Top Header */}
            <div className="flex flex-col xl:flex-row gap-6 w-full">
                <div className="flex-1">
                    <ProfileHeader />
                </div>
                <StreakCard />
            </div>

            {/* Stats Row */}
            <div className="w-full">
                <StatsCards />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Activity + Progress) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="bg-white rounded-xl h-[400px]">
                        <StatsOverview />
                    </div>
                    <div className="bg-white rounded-xl">
                        <LevelProgress />
                    </div>
                </div>

                {/* Right Column (Achievements) */}
                <div className="lg:col-span-1">
                    <AchievementsList />
                </div>
            </div>
        </div>
    );
}
