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
import type { User } from "../../types/users.types";
import {
    Mail,
    Phone,
    Calendar,
    Target,
    Clock,
    User as UserIcon,
    Shield,
    BarChart3,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useUser } from "../../hooks/useUsers";

interface UserDetailsSheetProps {
    user: User | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function UserDetailsSheet({ user, open, onOpenChange }: UserDetailsSheetProps) {
    const { data: detailedUser } = useUser(user?._id ?? "");
    if (!user) return null;
    const displayUser = detailedUser ?? user;

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
                                    <AvatarImage src={displayUser.avatarUrl} alt={displayUser.fullName} />
                                    <AvatarFallback className="text-4xl">{displayUser.fullName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <h2 className="text-xl font-bold">{displayUser.fullName}</h2>
                                <div className="flex flex-wrap justify-center gap-2 mt-2">
                                    <Badge variant="outline" className="capitalize">
                                        {displayUser.role}
                                    </Badge>
                                    <Badge variant={displayUser.subscription.plan === 'PREMIUM' ? 'default' : 'secondary'}>
                                        {displayUser.subscription.plan}
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
                                <InfoRow icon={Mail} label="Email" value={displayUser.email} />
                                <InfoRow icon={Phone} label="Số điện thoại" value={displayUser.phoneNumber} />
                                <InfoRow
                                    icon={UserIcon}
                                    label="Giới tính"
                                    value={displayUser.gender === 'male' ? 'Nam' : displayUser.gender === 'female' ? 'Nữ' : 'Khác'}
                                />
                                <InfoRow icon={Calendar} label="Ngày sinh" value={formatDate(displayUser.dateOfBirth)} />
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Academic, Stats, Subscription */}
                    <div className="md:col-span-2 space-y-8">
                        {/* Stats Cards */}


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
                                        <div className="text-xl font-bold text-primary">{displayUser.currentLevel || 'A0'}</div>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg">
                                        <div className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Mục tiêu</div>
                                        <div className="text-xl font-bold">{displayUser.targetLevel || 'N/A'}</div>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg col-span-2">
                                        <div className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Chương trình học</div>
                                        <div className="text-sm font-medium">
                                            {(() => {
                                                const labels: Record<string, string> = {
                                                    general_communication: 'Giao tiếp tổng quát (Communication)',
                                                    exam_thptqg: 'Luyện thi THPTQG',
                                                    exam_ielts: 'Luyện thi IELTS',
                                                    exam_toeic: 'Luyện thi TOEIC',
                                                    business_work: 'Tiếng Anh công sở (Business)',
                                                    travel_survival: 'Tiếng Anh du lịch (Travel)',
                                                };
                                                return displayUser.learningGoal ? (labels[displayUser.learningGoal] || displayUser.learningGoal) : 'Chưa chọn';
                                            })()}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg col-span-2">
                                        <div className="text-muted-foreground text-[10px] uppercase font-bold mb-1">Kỹ năng yếu</div>
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {displayUser.weakSkills?.length ? (
                                                displayUser.weakSkills.map(skill => (
                                                    <Badge key={skill} variant="secondary" className="capitalize text-[10px]">
                                                        {skill}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Chưa có dữ liệu</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-3 bg-muted/40 rounded-lg col-span-2">
                                        <div className="text-muted-foreground text-[10px] uppercase font-bold mb-2 flex items-center gap-1">
                                            <BarChart3 className="w-3 h-3" />
                                            Chi tiết Placement Test
                                        </div>
                                        {displayUser.placementTestDetails?.scoring ? (
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">CEFR tạm tính</span>
                                                    <Badge variant="default">{displayUser.placementTestDetails.scoring.provisionalCefr}</Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Listening</span>
                                                    <span className="font-medium">
                                                        {displayUser.placementTestDetails.scoring.listeningCorrect}/{displayUser.placementTestDetails.scoring.listeningTotal}
                                                        {' '}
                                                        ({Math.round(displayUser.placementTestDetails.listeningAccuracy * 100)}%)
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Reading</span>
                                                    <span className="font-medium">
                                                        {displayUser.placementTestDetails.scoring.readingCorrect}/{displayUser.placementTestDetails.scoring.readingTotal}
                                                        {' '}
                                                        ({Math.round(displayUser.placementTestDetails.readingAccuracy * 100)}%)
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-muted-foreground">Điểm chuẩn hóa</span>
                                                    <span className="font-medium">
                                                        {Math.round(displayUser.placementTestDetails.scoring.mcqScoreNormalized * 100)}%
                                                    </span>
                                                </div>
                                                <div className="text-xs text-muted-foreground pt-1">
                                                    Lần thi gần nhất: {formatDate(displayUser.placementTestDetails.submittedAt)}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Chưa có dữ liệu placement test</span>
                                        )}
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
                                        value={formatDate(displayUser.createdAt)}
                                        className="py-1"
                                    />
                                    <Separator />
                                    <InfoRow
                                        icon={Shield}
                                        label="Trạng thái gói"
                                        className="py-1"
                                        value={
                                            <div className="flex flex-col gap-1">
                                                <Badge variant={displayUser.subscription.status === 'active' ? 'default' : 'destructive'} className="w-fit uppercase text-[10px]">
                                                    {displayUser.subscription.status}
                                                </Badge>
                                                {displayUser.subscription.endDate && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Hết hạn: {formatDate(displayUser.subscription.endDate)}
                                                    </span>
                                                )}
                                            </div>
                                        }
                                    />
                                    <Separator />
                                    <InfoRow
                                        icon={Clock}
                                        label="Hoạt động gần nhất"
                                        value={displayUser.lastActiveAt ? format(new Date(displayUser.lastActiveAt), "HH:mm - dd/MM/yyyy") : "Chưa hoạt động"}
                                        className="py-1"
                                    />
                                    <Separator />
                                    <InfoRow
                                        icon={Shield}
                                        label="Auth Provider"
                                        value={<Badge variant="outline">{displayUser.authProvider}</Badge>}
                                        className="py-1"
                                    />
                                    <Separator />
                                    <InfoRow
                                        icon={Shield}
                                        label="Sync Graph"
                                        value={
                                            <Badge variant={displayUser.isSyncedToGraph ? "default" : "destructive"}>
                                                {displayUser.isSyncedToGraph ? "Yes" : "No"}
                                            </Badge>
                                        }
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
