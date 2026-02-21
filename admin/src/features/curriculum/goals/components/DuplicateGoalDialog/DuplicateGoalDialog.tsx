import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DuplicatePayload {
    newSlug: string;
    newTitle: string;
}

interface DuplicateGoalDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (payload: DuplicatePayload) => void;
    defaultSlug: string;
    defaultTitle: string;
    isPending?: boolean;
}

export function DuplicateGoalDialog({
    isOpen,
    onClose,
    onConfirm,
    defaultSlug,
    defaultTitle,
    isPending = false,
}: DuplicateGoalDialogProps) {
    const { register, handleSubmit, reset, formState: { errors } } = useForm<DuplicatePayload>({
        defaultValues: { newSlug: `${defaultSlug}-copy`, newTitle: `${defaultTitle} (Copy)` },
    });

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            reset();
            onClose();
        }
    };

    const onSubmit = (data: DuplicatePayload) => {
        onConfirm({ newSlug: data.newSlug.trim().toLowerCase(), newTitle: data.newTitle.trim() });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nhân bản mục tiêu</DialogTitle>
                    <DialogDescription>Nhập slug và tiêu đề mới cho bản sao.</DialogDescription>
                </DialogHeader>

                <form id="duplicate-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="dup-slug">Slug mới</Label>
                        <Input
                            id="dup-slug"
                            {...register('newSlug', {
                                required: 'Slug là bắt buộc',
                                pattern: { value: /^[a-z0-9-]+$/, message: 'Chỉ dùng chữ thường, số và dấu gạch ngang' },
                                minLength: { value: 3, message: 'Tối thiểu 3 ký tự' },
                            })}
                            aria-label="Slug mới cho bản sao"
                            aria-invalid={Boolean(errors.newSlug)}
                        />
                        {errors.newSlug && <p className="text-xs text-destructive">{errors.newSlug.message}</p>}
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="dup-title">Tiêu đề mới</Label>
                        <Input
                            id="dup-title"
                            {...register('newTitle', {
                                required: 'Tiêu đề là bắt buộc',
                                minLength: { value: 3, message: 'Tối thiểu 3 ký tự' },
                            })}
                            aria-label="Tiêu đề mới cho bản sao"
                            aria-invalid={Boolean(errors.newTitle)}
                        />
                        {errors.newTitle && <p className="text-xs text-destructive">{errors.newTitle.message}</p>}
                    </div>
                </form>

                <DialogFooter>
                    <Button variant="outline" type="button" onClick={onClose}>
                        Hủy
                    </Button>
                    <Button type="submit" form="duplicate-form" disabled={isPending}>
                        Nhân bản
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
