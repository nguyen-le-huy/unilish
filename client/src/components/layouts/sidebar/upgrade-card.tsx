import { useState } from "react"
import { Link } from "react-router-dom"
import { X, ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import FlashIcon from "@/assets/flash.svg"

export function UpgradeCard() {
    const [isVisible, setIsVisible] = useState(true)

    if (!isVisible) return null

    return (
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 backdrop-blur-xl p-4 text-white shadow-xl">
            {/* Close button */}
            <button
                onClick={() => setIsVisible(false)}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="Đóng"
            >
                <X className="h-4 w-4" />
            </button>

            {/* Lightning icon */}
            <div className="mb-3">
                <img src={FlashIcon} alt="" className="h-6 w-6" />
            </div>

            {/* Title with badge */}
            <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-base">Upgrade to PRO</h3>
                <Badge variant="secondary" className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 hover:bg-white/30">
                    30% OFF
                </Badge>
            </div>

            {/* Description */}
            <p className="text-sm text-white/90 mb-4 leading-relaxed">
                Truy cập không giới hạn tất cả khóa học và tính năng AI.
            </p>

            {/* Dotted divider */}
            <div className="border-t border-dotted border-white/30 my-3" />

            {/* Price */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold">336K</span>
                    <span className="text-sm text-white/80">/năm</span>
                </div>
                <ChevronDown className="h-5 w-5 text-white/70" />
            </div>

            {/* Upgrade button */}
            <Button
                asChild
                className="w-full bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm"
            >
                <Link to="/dashboard/subscription">
                    Nâng cấp ngay
                </Link>
            </Button>
        </div>
    )
}
