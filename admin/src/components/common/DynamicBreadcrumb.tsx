import { Link, useLocation } from "react-router-dom"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import React from "react"

const routeNameMap: Record<string, string> = {
    dashboard: "Tổng quan",
    curriculum: "Đào tạo",
    goals: "Mục tiêu & Chiến lược",
    languages: "Ngôn ngữ",
    courses: "Khóa học (LMS)",
    lessons: "Bài học",
    questions: "Kho câu hỏi",
    "placement-tests": "Bài Kiểm tra Đầu vào",
    "ielts-practice": "Bài thi IELTS",
    new: "Tạo mới",
    edit: "Chỉnh sửa",
    videos: "Video / Youtube",
    news: "Tin tức (News)",
    users: "Học viên",
    staffs: "Phân quyền",
}

export function DynamicBreadcrumb() {
    const location = useLocation()
    const pathnames = location.pathname.split("/").filter((x) => x)

    return (
        <Breadcrumb>
            <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink asChild>
                        <Link to="/dashboard">Admin</Link>
                    </BreadcrumbLink>
                </BreadcrumbItem>
                {pathnames.map((value, index) => {
                    const to = `/${pathnames.slice(0, index + 1).join("/")}`
                    const isLast = index === pathnames.length - 1
                    const label = routeNameMap[value] || value

                    return (
                        <React.Fragment key={to}>
                            <BreadcrumbSeparator className={index === 0 ? "hidden md:block" : ""} />
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link to={to}>{label}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                        </React.Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
