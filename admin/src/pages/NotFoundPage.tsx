import { SearchIcon } from "lucide-react"
import NotFoundImage from "@/assets/404.svg"

import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyTitle,
} from "@/components/ui/empty"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"

export default function NotFoundPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <Empty>
                <EmptyHeader>
                    <img src={NotFoundImage} alt="404" className="w-20" />
                    <EmptyTitle>404 - Không tìm thấy trang</EmptyTitle>
                    <EmptyDescription>
                        Trang bạn đang tìm kiếm không tồn tại. Hãy thử tìm kiếm nội dung bạn cần bên dưới.
                    </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                    <div className="w-full max-w-sm">
                        <InputGroup>
                            <InputGroupInput placeholder="Tìm kiếm..." />
                            <InputGroupAddon>
                                <SearchIcon />
                            </InputGroupAddon>
                            <InputGroupAddon align="inline-end">
                                <Kbd>/</Kbd>
                            </InputGroupAddon>
                        </InputGroup>
                    </div>
                    <EmptyDescription>
                        Cần giúp đỡ? <a href="#" className="text-primary underline underline-offset-4">Liên hệ hỗ trợ</a>
                    </EmptyDescription>
                </EmptyContent>
            </Empty>
        </div>
    )
}
