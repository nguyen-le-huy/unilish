import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import type { User } from "../types";
import {
    Mail,
    Phone,
    MapPin,
    Calendar,
    Target,
    Clock,
    User as UserIcon,
    Shield,
    BookOpen,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface UserDetailsSheetProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserDetailsSheet({ user, open, onOpenChange }: UserDetailsSheetProps) {
    if (!user) return null;

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Chưa cập nhật";
        try {
            return format(new Date(dateString), "dd 'tháng' MM, yyyy", { locale: vi });
        } catch {
            return "N/A";
        }
    };

    const InfoRow = ({ icon: Icon, label, value, className }: { icon: React.ElementType, label: string, value: React.ReactNode, className?: string }) => (
        <div className={`flex items-start space-x-3 py-2 ${className}`}>
            <Icon className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <div className="text-sm text-foreground font-medium mt-1 break-words">{value || "—"}</div>
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[800px] w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader className="pb-6">
                    <DialogTitle>Hồ sơ học viên</DialogTitle>
                    <DialogDescription>Thông tin chi tiết và lịch sử hoạt động</DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Column: Avatar & Personal Info */}
                    <div className="md:col-span-1 border-r pr-6 space-y-6">
                        <div className="flex flex-col items-center text-center">
                            <Avatar className="w-32 h-32 mb-4 border-2 border-primary/10">
                                <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                                <AvatarFallback className="text-4xl">{user.fullName.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <h2 className="text-xl font-bold">{user.fullName}</h2>
                            <div className="flex flex-wrap justify-center gap-2 mt-2">
                                <Badge variant="outline" className="capitalize">
                                    {user.role}
                                </Badge>
                                <Badge variant={user.subscription.plan === 'PRO' ? 'default' : 'secondary'}>
                                    {user.subscription.plan}
                                </Badge>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-md font-semibold flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-primary" />
                                Thông tin cá nhân
                            </h3>
                            <div className="grid grid-cols-1 gap-1">
                                <InfoRow icon={Mail} label="Email" value={user.email} />
                                <InfoRow icon={Phone} label="Số điện thoại" value={user.phoneNumber} />
                                <InfoRow
                                    icon={UserIcon}
                                    label="Giới tính"
                                    value={user.gender === 'male' ? 'Nam' : user.gender === 'female' ? 'Nữ' : 'Khác'}
                                />
                                <InfoRow icon={Calendar} label="Ngày sinh" value={formatDate(user.dateOfBirth)} />
                                <InfoRow
                                    icon={MapPin}
                                    label="Địa chỉ"
                                    value={user.address ? `${user.address.city}, ${user.address.country}` : null}
                                />
                                <InfoRow icon={BookOpen} label="Giới thiệu" value={user.bio} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Academic, Stats, Subscription */}
                    <div className="md:col-span-2 space-y-8">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 border rounded-xl bg-muted/20">
                                <div className="text-3xl font-bold text-orange-500">🔥 {user.stats.streak}</div>
                                <div className="text-sm text-muted-foreground mt-1 font-medium">Chuỗi ngày</div>
                            </div>
                            <div className="text-center p-4 border rounded-xl bg-muted/20">
                                <div className="text-3xl font-bold text-blue-500">💎 {user.stats.xp}</div>
                                <div className="text-sm text-muted-foreground mt-1 font-medium">Tổng XP</div>
                            </div>
                            <div className="text-center p-4 border rounded-xl bg-muted/20">
                                <div className="text-3xl font-bold text-yellow-500">🪙 {user.stats.coins}</div>
                                <div className="text-sm text-muted-foreground mt-1 font-medium">Coins</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Academic Status */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Target className="w-5 h-5 text-primary" />
                                    Học tập
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-muted/40 rounded-lg">
                                        <div className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Level hiện tại</div>
                                        <div className="text-xl font-bold text-primary">{user.currentLevel}</div>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg">
                                        <div className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Mục tiêu</div>
                                        <div className="text-xl font-bold">{user.targetLevel}</div>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg col-span-2">
                                        <div className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Kỹ năng yếu</div>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {user.weakSkills?.length ? (
                                                user.weakSkills.map(skill => (
                                                    <Badge key={skill} variant="secondary" className="capitalize text-[10px]">
                                                        {skill}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Chưa có dữ liệu</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Subscription & Account */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-primary" />
                                    Tài khoản
                                </h3>
                                <div className="space-y-3 border rounded-lg p-4">
                                    <InfoRow
                                        icon={Clock}
                                        label="Ngày tham gia"
                                        value={formatDate(user.createdAt)}
                                        className="py-1"
                                    />
                                    <Separator />
                                    <InfoRow
                                        icon={Shield}
                                        label="Trạng thái gói"
                                        className="py-1"
                                        value={
                                            <div className="flex flex-col gap-1">
                                                <Badge variant={user.subscription.status === 'active' ? 'default' : 'destructive'} className="w-fit uppercase text-[10px]">
                                                    {user.subscription.status}
                                                </Badge>
                                                {user.subscription.endDate && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Hết hạn: {formatDate(user.subscription.endDate)}
                                                    </span>
                                                )}
                                            </div>
                                        }
                                    />
                                    <Separator />
                                    <InfoRow
                                        icon={Clock}
                                        label="Hoạt động gần nhất"
                                        value={user.lastActiveAt ? format(new Date(user.lastActiveAt), "HH:mm - dd/MM/yyyy") : "Chưa hoạt động"}
                                        className="py-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

