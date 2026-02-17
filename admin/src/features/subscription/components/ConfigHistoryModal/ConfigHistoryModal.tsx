import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { useConfigHistory } from "../../hooks/useSubscriptionData";
import { format } from "date-fns";
import { EAuditAction } from "../../types/config.types";

interface Props {
    open: boolean;
    onClose: () => void;
}

export function ConfigHistoryModal({ open, onClose }: Props) {
    // Use the hook - data is automatically fetched when component mounts
    // However, since it's a modal, we might want to rely on the hook's caching
    // or invalidate/refetch when opening. 
    // The hook in useSubscriptionData.ts has staleTime: 30 * 1000.
    const { data: history = [], isLoading } = useConfigHistory();

    const formatAction = (action: string) => {
        switch (action) {
            case EAuditAction.UPDATE_DRAFT: return <span className="text-yellow-600">Draft Update</span>;
            case EAuditAction.PUBLISH_CONFIG: return <span className="text-green-600 font-bold">Publish Live</span>;
            case EAuditAction.REVERT_CONFIG: return <span className="text-red-600">Revert Config</span>;
            default: return action;
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Lịch sử thay đổi (Audit Log)</DialogTitle>
                    <DialogDescription>
                        Theo dõi ai đã thay đổi cấu hình vào thời gian nào.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="space-y-4 p-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                        ))}
                    </div>
                ) : (
                    <div className="relative overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs uppercase bg-muted">
                                <tr>
                                    <th className="px-4 py-3">Thời gian</th>
                                    <th className="px-4 py-3">Người thực hiện</th>
                                    <th className="px-4 py-3">Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.map((log) => (
                                    <tr key={log._id} className="border-b">
                                        <td className="px-4 py-3">
                                            {log.createdAt ? format(new Date(log.createdAt), "dd/MM/yyyy HH:mm") : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{log.actorId?.fullName || "Unknown"}</div>
                                            <div className="text-xs text-muted-foreground">{log.actorId?.email}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            {formatAction(log.action)}
                                        </td>
                                    </tr>
                                ))}
                                {history.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-center p-4 text-muted-foreground">
                                            Chưa có lịch sử thay đổi.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
