import { useUser } from "@clerk/clerk-react";
import { getStoredUser } from "@/features/auth/hooks/useAuthSync";
import { Share2, Edit } from "lucide-react";
import { Link } from "react-router-dom";
import { AvatarUploader } from "./AvatarUploader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

import { GameLevelUtils } from "@/lib/game-level";
import { useSystemSetting } from "@/features/system/hooks/useSystemSetting";

export function ProfileHeader() {
    const { user } = useUser();
    const localUser = getStoredUser();

    // Fetch Level config
    const currentLevel = localUser?.currentLevel || 'A1';
    const { data: levelIcons } = useSystemSetting<Record<string, string>>('level_icons');
    const levelIconUrl = levelIcons?.[currentLevel];

    const roleMap: Record<string, string> = {
        student: "Học viên",
        teacher: "Giáo viên",
        admin: "Admin",
        user: "Người dùng"
    };

    const rawRole = localUser?.role || 'student';
    const displayRole = roleMap[rawRole] || "Học viên";

    const xp = localUser?.stats?.xp || 0;
    // Use Enterprise Game Level Utils
    const { level, currentLevelXp, nextLevelThreshold } = GameLevelUtils.calculateLevelFromXp(xp);

    const userData = {
        name: user?.fullName || user?.firstName || localUser?.fullName || "Guest",
        email: user?.primaryEmailAddress?.emailAddress || localUser?.email || "guest@unilish.com",
        avatar: user?.imageUrl || localUser?.avatarUrl || "",
        joinDate: user?.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' }) : "10/2023",
        role: displayRole,
        level: level,
        xp: xp,
        levelXp: currentLevelXp, // XP gained in this level
        nextXpThreshold: nextLevelThreshold // XP needed to define progress bar
    };

    return (
        <Card className="w-full h-full border-none shadow-none">
            <CardContent className="p-6 sm:p-8 h-full flex items-center">
                <div className="flex flex-col sm:flex-row gap-6 w-full items-center sm:items-start">
                    {/* Avatar & Level Section */}
                    <div className="flex flex-col items-center gap-3 shrink-0 mx-auto sm:mx-0">
                        <div className="relative">
                            <AvatarUploader
                                currentAvatar={userData.avatar}
                                userName={userData.name}
                                onUpload={async (file: Blob) => {
                                    if (user) {
                                        await user.setProfileImage({ file });
                                    }
                                }}
                            />
                        </div>

                        {/* Level Progress */}
                        <div className="flex flex-col items-center gap-1 w-[200px]">
                            <span className="font-bold text-sm text-foreground">Level {userData.level}</span>
                            <div className="flex flex-col gap-1 w-full">
                                <Progress value={(userData.levelXp / userData.nextXpThreshold) * 100} className="h-2 w-full" />
                                <span className="text-[12px] text-muted-foreground font-medium text-right">
                                    {userData.level >= 99 ? "Max Level" : `${userData.levelXp}/${userData.nextXpThreshold} XP`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Info Section */}
                    <div className="flex flex-col gap-3 text-center sm:text-left flex-1">
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-xl font-semibold text-foreground">{userData.name}</h1>
                                {levelIconUrl && (
                                    <img src={levelIconUrl} alt={`Rank ${currentLevel}`} className="w-8 h-8 object-contain" title={`Rank ${currentLevel}`} />
                                )}
                            </div>

                            {rawRole === 'admin' ? (
                                <Badge className="rounded-sm border-transparent bg-[linear-gradient(90deg,#3F2B96_0%,#A8C0FF_100%)] [background-size:105%] bg-center text-white px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                    Admin
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                    {userData.role}
                                </Badge>
                            )}
                        </div>

                        <p className="text-muted-foreground text-base font-medium">
                            {userData.email}
                        </p>

                        <p className="text-foreground/80 leading-relaxed max-w-2xl text-base">
                            {localUser?.bio || "Chưa có giới thiệu"}
                        </p>

                        <div className="flex items-center justify-center sm:justify-start gap-3 mt-2">
                            <Link to="?tab=my-profile">
                                <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 px-6">
                                    <Edit className="w-4 h-4" />
                                    Chỉnh sửa hồ sơ
                                </Button>
                            </Link>
                            <Button variant="outline" className="gap-2 bg-muted/50 hover:bg-muted">
                                <Share2 className="w-4 h-4" />
                                Chia sẻ
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
