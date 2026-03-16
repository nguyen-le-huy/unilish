import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useDebounce } from '@/hooks/useDebounce';
import { LanguageTableRow } from '../../components/LanguageTableRow/LanguageTableRow';
import { useLanguages } from '../../hooks/useLanguages';

const SKELETON_ROWS = Array.from({ length: 5 }, (_, i) => i);

export default function LanguageListPage() {
    const navigate = useNavigate();
    const [search, setSearch] = useState<string>('');
    const debouncedSearch = useDebounce(search, 300);

    const { data: languages = [], isLoading } = useLanguages({ search: debouncedSearch });

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <PageHeader
                    title="Ngôn ngữ"
                    description="Root Data cho Đào tạo: quản lý mã ngôn ngữ, greeting và trạng thái hoạt động"
                />
                <Button onClick={() => navigate('/curriculum/languages/new')} aria-label="Add new language">
                    Thêm ngôn ngữ
                </Button>
            </div>

            <div className="max-w-md">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên hoặc mã (en-US)..."
                    aria-label="Search languages"
                />
            </div>

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Cờ</TableHead>
                            <TableHead>Tên</TableHead>
                            <TableHead>Mã</TableHead>
                            <TableHead>Greeting Sound</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            SKELETON_ROWS.map((i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 6 }, (_, j) => (
                                        <TableCell key={j}>
                                            <Skeleton className="h-5 w-full rounded" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : languages.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="text-center py-10 text-muted-foreground"
                                >
                                    Chưa có ngôn ngữ nào
                                </TableCell>
                            </TableRow>
                        ) : (
                            languages.map((language) => (
                                <LanguageTableRow key={language._id} language={language} />
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
