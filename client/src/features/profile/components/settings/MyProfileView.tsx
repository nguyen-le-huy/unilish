import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Edit } from "lucide-react";
import { useUser } from "@clerk/clerk-react";
import { getStoredUser, UnilishUser } from "@/features/auth/hooks/useAuthSync";
import { AvatarUploader } from "../AvatarUploader";
import { EditProfileDialog } from "./EditProfileDialog";
import { useState } from "react";
import { format } from "date-fns";

export function MyProfileView() {
    const { user } = useUser();
    const [localUser, setLocalUser] = useState<UnilishUser | null>(getStoredUser());

    // Helper to get names when falling back to stored user data which only has fullName
    const firstName = user?.firstName || (localUser?.fullName ? localUser.fullName.split(' ')[0] : "Guest");
    const lastName = user?.lastName || (localUser?.fullName ? localUser.fullName.split(' ').slice(1).join(' ') : "");

    const userData = {
        firstName,
        lastName,
        fullName: user?.fullName || localUser?.fullName || "Guest",
        email: user?.primaryEmailAddress?.emailAddress || localUser?.email || "guest@unilish.com",
        avatar: user?.imageUrl || localUser?.avatarUrl || "",
        phone: user?.phoneNumbers?.[0]?.phoneNumber || localUser?.phoneNumber || "",
        dob: localUser?.dateOfBirth ? format(new Date(localUser.dateOfBirth), "dd/MM/yyyy") : "",
        bio: localUser?.bio || "",
        role: localUser?.role === 'student' ? 'Học viên' : (localUser?.role || ""),
        country: localUser?.address?.country || "Việt Nam",
        city: localUser?.address?.city || "Hà Nội",
    };

    const handleSuccess = (updated: UnilishUser) => {
        setLocalUser(updated);
    };

    return (
        <Card className="flex flex-col">
            {/* Header / Avatar Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6">
                <div className="relative">
                    <AvatarUploader
                        currentAvatar={userData.avatar}
                        userName={userData.fullName}
                        onUpload={async (file: Blob) => {
                            if (user) {
                                await user.setProfileImage({ file });
                            }
                        }}
                    />
                </div>

                <div className="flex flex-1 flex-col items-center sm:items-start text-center sm:text-left space-y-1">
                    <h2 className="text-xl font-semibold">{userData.fullName}</h2>
                    <p className="text-sm font-medium text-muted-foreground">{userData.role}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span className="inline-block">
                            {[userData.city, userData.country].filter(Boolean).join(", ")}
                        </span>
                    </p>
                </div>

                <EditProfileDialog
                    user={localUser || {}}
                    onSuccess={handleSuccess}
                    trigger={
                        <Button variant="outline" className="gap-2 rounded-full px-4 border-slate-200">
                            Chỉnh sửa <Edit className="w-3 h-3" />
                        </Button>
                    }
                />
            </div>

            <Separator />

            {/* Personal Information */}
            <div className="p-6">
                <div className="pb-4">
                    <h3 className="text-base font-semibold">Thông tin cá nhân</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <Label className="text-muted-foreground font-normal text-xs uppercase tracking-wide">Tên</Label>
                        <p className="font-medium text-sm">{userData.firstName}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-muted-foreground font-normal text-xs uppercase tracking-wide">Họ</Label>
                        <p className="font-medium text-sm">{userData.lastName}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-muted-foreground font-normal text-xs uppercase tracking-wide">Địa chỉ Email</Label>
                        <p className="font-medium text-sm">{userData.email}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-muted-foreground font-normal text-xs uppercase tracking-wide">Số điện thoại</Label>
                        <p className="font-medium text-sm">{userData.phone}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-muted-foreground font-normal text-xs uppercase tracking-wide">Ngày sinh</Label>
                        <p className="font-medium text-sm">{userData.dob}</p>
                    </div>
                    <div className="md:col-span-2 space-y-1">
                        <Label className="text-muted-foreground font-normal text-xs uppercase tracking-wide">Giới thiệu</Label>
                        <p className="font-medium text-sm">{userData.bio}</p>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="p-6">
                <div className="pb-4">
                    <h3 className="text-base font-semibold">Địa chỉ</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <Label className="text-muted-foreground font-normal text-xs uppercase tracking-wide">Quốc gia</Label>
                        <p className="font-medium text-sm">{userData.country}</p>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-muted-foreground font-normal text-xs uppercase tracking-wide">Thành phố/Tỉnh</Label>
                        <p className="font-medium text-sm">{userData.city}</p>
                    </div>
                </div>
            </div>
        </Card>
    );
}


