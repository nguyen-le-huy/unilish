import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useThemeStore } from "@/stores/theme-store"

export function ModeToggle() {
    const { theme, setTheme } = useThemeStore()
    const isDark = theme === "dark"

    return (
        <Button
            variant='outline'
            size='icon'
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label='Toggle dark mode'
            className="relative h-8 w-8 sm:h-9 sm:w-9"
        >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
        </Button>
    )
}
