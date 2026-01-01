import { useId } from "react"
import { Moon, Sun } from "lucide-react"

import { Switch } from "@/components/ui/switch"
import { useTheme } from "@/app/theme-provider"

export function ModeToggle() {
    const id = useId()
    const { theme, setTheme } = useTheme()
    const isDark = theme === "dark"

    const toggleTheme = (checked: boolean) => {
        setTheme(checked ? "dark" : "light")
    }

    return (
        <div className='group inline-flex items-center gap-2' data-state={isDark ? 'checked' : 'unchecked'}>
            <div
                className='group-data-[state=checked]:text-muted-foreground/70 cursor-pointer text-left font-medium'
                onClick={() => setTheme("light")}
            >
                <Sun className='size-4' aria-hidden='true' />
            </div>
            <Switch
                id={id}
                checked={isDark}
                onCheckedChange={toggleTheme}
                aria-label='Toggle theme'
            />
            <div
                className='group-data-[state=unchecked]:text-muted-foreground/70 cursor-pointer text-right font-medium'
                onClick={() => setTheme("dark")}
            >
                <Moon className='size-4' aria-hidden='true' />
            </div>
        </div>
    )
}
