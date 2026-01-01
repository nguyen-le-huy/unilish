# Theme & Dark Mode Workflow

## 1. Overview
The Unilish client uses a robust theming system built on **Tailwind CSS**, **CSS Variables**, and **next-themes**. This allows for seamless switching between Light, Dark, and System modes while maintaining a consistent design system via Shadcn UI.

---

## 2. Architecture

### A. Core Technologies
- **Tailwind CSS (`darkMode: 'class'`):** Styles are applied based on the presence of the `.dark` class on the `<html>` element.
- **next-themes:** Manages the active theme state (`light`, `dark`, `system`), handles `localStorage` persistence, and automatically syncs with system preferences.
- **CSS Variables:** All design tokens (colors, radius, spacing) are defined as CSS variables in `src/app/global.css`.

### B. Directory Structure
```text
client/src/
├── app/
│   └── global.css            # CSS Variables definition (:root & .dark)
├── components/
│   ├── theme-provider.tsx    # Context Provider wrappers next-themes
│   └── mode-toggle.tsx       # UI Component for switching themes
└── main.tsx                  # App entry point (wraps app in ThemeProvider)
```

---

## 3. Implementation Details

### A. Theme Provider (`components/theme-provider.tsx`)
Wraps the application to provide theme context.
- **Default Theme:** `dark` (Configured in `main.tsx`).
- **Storage Key:** `vite-ui-theme`.
- **Logic:** Listen to changes and apply `.dark` or remove it from `document.documentElement`.

### B. CSS Variables strategy (`app/global.css`)
We use a "semantic" naming convention mapped to functional usage rather than hardcoded colors.

**Structure:**
```css
@layer base {
  :root {
    /* Light Mode Values (HSL-like or raw values) */
    --background: 0 0% 100%;
    --foreground: 0 0% 12.5%;
    --primary: 0 0% 17%;
    /* ... */
  }

  .dark {
    /* Dark Mode Overrides */
    --background: 0 0% 13%;
    --foreground: 0 0% 98%;
    --primary: 0 0% 91%;
    /* ... */
  }
}
```

### C. Tailwind Configuration (`tailwind.config.js`)
Tailwind maps utility classes to these CSS variables.
```javascript
theme: {
  extend: {
    colors: {
      background: 'hsl(var(--background))', // Maps bg-background to var(--background)
      // If using raw values without HSL wrapper in css, remove hsl() here.
    }
  }
}
```

---

## 4. Workflows

### A. How to Add/Modify Colors
1.  **Define Variable:** Open `src/app/global.css`.
2.  **Add Light Value:** Add `--new-color` inside `:root {}`.
3.  **Add Dark Value:** Add `--new-color` inside `.dark {}`.
4.  **Register in Tailwind:** Open `tailwind.config.js` and add it to `theme.extend.colors`.
    ```javascript
    'new-color': 'hsl(var(--new-color))'
    ```
5.  **Usage:** Use `bg-new-color` or `text-new-color` in components.

### B. Usage in Components
You don't need to manually check for dark mode usually. Just use the semantic classes.

```tsx
// This automatically adapts to dark mode
<div className="bg-background text-foreground border border-border">
  <h1 className="text-primary">Hello</h1>
</div>
```

If you need a specific style **ONLY** for dark mode:
```tsx
<div className="bg-white dark:bg-slate-900">
  Manual Override
</div>
```

### C. Accessing Theme in Code
To access the current theme state programmatically:

```tsx
import { useTheme } from "@/components/theme-provider"

export function MyComponent() {
  const { theme, setTheme } = useTheme()
  
  return <button onClick={() => setTheme('dark')}>Go Dark</button>
}
```

---

## 5. Troubleshooting

**Q: Colors are not switching?**
* **Check 1:** Inspect `<html>` tag in DevTools. Does it have class="dark" when in dark mode?
* **Check 2:** Verify `tailwind.config.js` uses `darkMode: ["class"]`.

**Q: Flash of wrong theme on load?**
* **Fix:** Ensure `ThemeProvider` is the top-most provider in `main.tsx` and renders immediately. `next-themes` handles hydration mismatch usually.
