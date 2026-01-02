import * as React from "react"
import { cn } from "@/lib/utils"

const Empty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("flex flex-col items-center justify-center gap-4 text-center p-8 min-h-[50vh]", className)}
                {...props}
            />
        )
    }
)
Empty.displayName = "Empty"

const EmptyHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("flex flex-col items-center gap-2", className)}
                {...props}
            />
        )
    }
)
EmptyHeader.displayName = "EmptyHeader"

const EmptyTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => {
        return (
            <h3
                ref={ref}
                className={cn("text-2xl font-bold tracking-tight", className)}
                {...props}
            />
        )
    }
)
EmptyTitle.displayName = "EmptyTitle"

const EmptyDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => {
        return (
            <p
                ref={ref}
                className={cn("text-muted-foreground max-w-prose", className)}
                {...props}
            />
        )
    }
)
EmptyDescription.displayName = "EmptyDescription"

const EmptyContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("flex flex-col items-center gap-4 w-full max-w-md", className)}
                {...props}
            />
        )
    }
)
EmptyContent.displayName = "EmptyContent"

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent }
