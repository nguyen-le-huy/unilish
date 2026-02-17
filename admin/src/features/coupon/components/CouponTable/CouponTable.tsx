import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash, Copy } from "lucide-react";
import type { ICoupon } from "../../types/coupon.types";
import { EDiscountType } from "../../types/coupon.types";
import { format } from "date-fns";
import { toast } from "sonner";

interface Props {
    coupons: ICoupon[];
    onEdit: (coupon: ICoupon) => void;
    onDelete: (id: string) => void;
    isLoading?: boolean;
}

export function CouponTable({ coupons, onEdit, onDelete, isLoading }: Props) {
    const handleCopy = (code: string) => {
        navigator.clipboard.writeText(code);
        toast.success("Copied coupon code!");
    };

    if (isLoading) {
        return (
            <div className="rounded-md border">
                <div className="p-8 space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Usage</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expiry</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {coupons.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                                No coupons found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        coupons.map((coupon) => (
                            <TableRow key={coupon._id}>
                                <TableCell className="font-medium font-mono text-base">
                                    {coupon.code}
                                    {coupon.description && (
                                        <div className="text-xs text-muted-foreground font-sans font-normal truncate max-w-[150px]">
                                            {coupon.description}
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline">
                                        {coupon.discountType === EDiscountType.PERCENTAGE ? '%' : 'FIXED'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {coupon.discountType === EDiscountType.PERCENTAGE
                                        ? `-${coupon.value}%`
                                        : `-${new Intl.NumberFormat('vi-VN').format(coupon.value)}`}
                                </TableCell>
                                <TableCell>
                                    {coupon.usedCount} / {coupon.usageLimit ? coupon.usageLimit : '∞'}
                                </TableCell>
                                <TableCell>
                                    {coupon.isActive ? (
                                        <Badge className="bg-green-600 hover:bg-green-700">Active</Badge>
                                    ) : (
                                        <Badge variant="secondary">Inactive</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    {coupon.expiryDate
                                        ? format(new Date(coupon.expiryDate), 'dd/MM/yyyy')
                                        : <span className="text-muted-foreground">Permanent</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                            <DropdownMenuItem onClick={() => handleCopy(coupon.code)}>
                                                <Copy className="mr-2 h-4 w-4" /> Copy Code
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onClick={() => onEdit(coupon)}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => onDelete(coupon._id)}
                                            >
                                                <Trash className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
