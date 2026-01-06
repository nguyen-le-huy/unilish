import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { UserFilter } from "../types";
import { Search } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { useEffect, useState } from "react";

interface UserFilterProps {
    filter: UserFilter;
    onChange: (filter: UserFilter) => void;
}

export function UserFilterBar({ filter, onChange }: UserFilterProps) {
    const [searchTerm, setSearchTerm] = useState(filter.search || "");
    const debouncedSearch = useDebounce(searchTerm, 500);

    // Sync debounce search with filter
    useEffect(() => {
        onChange({ ...filter, search: debouncedSearch, page: 1 });
    }, [debouncedSearch]);

    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <Select
                    value={filter.plan || "all"}
                    onValueChange={(value: string) =>
                        onChange({ ...filter, plan: value === "all" ? undefined : (value as UserFilter["plan"]), page: 1 })
                    }
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Gói cước" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả gói</SelectItem>
                        <SelectItem value="FREE">FREE</SelectItem>
                        <SelectItem value="PLUS">PLUS</SelectItem>
                        <SelectItem value="PRO">PRO</SelectItem>
                    </SelectContent>
                </Select>

                <Select
                    value={filter.level || "all"}
                    onValueChange={(value: string) =>
                        onChange({ ...filter, level: value === "all" ? undefined : (value as UserFilter["level"]), page: 1 })
                    }
                >
                    <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Trình độ" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tất cả Level</SelectItem>
                        <SelectItem value="A1">A1</SelectItem>
                        <SelectItem value="A2">A2</SelectItem>
                        <SelectItem value="B1">B1</SelectItem>
                        <SelectItem value="B2">B2</SelectItem>
                        <SelectItem value="C1">C1</SelectItem>
                        <SelectItem value="C2">C2</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
