import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

const InputGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn("relative flex items-center w-full", className)}
                {...props}
            />
        )
    }
)
InputGroup.displayName = "InputGroup"

const InputGroupInput = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof Input>>(
    ({ className, ...props }, ref) => {
        return (
            <Input
                ref={ref}
                className={cn("pl-10 pr-10", className)}
                {...props}
            />
        )
    }
)
InputGroupInput.displayName = "InputGroupInput"

const InputGroupAddon = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { align?: "inline-start" | "inline-end" }>(
    ({ className, align = "inline-start", ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "absolute top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4",
                    align === "inline-start" ? "left-3" : "right-3",
                    className
                )}
                {...props}
            />
        )
    }
)
InputGroupAddon.displayName = "InputGroupAddon"

export { InputGroup, InputGroupInput, InputGroupAddon }
