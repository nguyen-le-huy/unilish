import * as React from 'react';
import { cn } from '@/lib/utils';

// ─── Context ──────────────────────────────────────────────────────────────────

interface PopoverContextValue {
    open: boolean;
    setOpen: (open: boolean) => void;
    rootRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = React.createContext<PopoverContextValue>({
    open: false,
    setOpen: () => {},
    rootRef: { current: null },
});

// ─── Root ─────────────────────────────────────────────────────────────────────

function Popover({
    children,
    open: controlledOpen,
    onOpenChange,
}: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}) {
    const [internalOpen, setInternalOpen] = React.useState(false);
    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen! : internalOpen;
    const rootRef = React.useRef<HTMLDivElement>(null);

    const setOpen = React.useCallback(
        (next: boolean) => {
            if (!isControlled) setInternalOpen(next);
            onOpenChange?.(next);
        },
        [isControlled, onOpenChange],
    );

    return (
        <PopoverContext.Provider value={{ open, setOpen, rootRef }}>
            <div ref={rootRef} className="relative inline-flex">
                {children}
            </div>
        </PopoverContext.Provider>
    );
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

function PopoverTrigger({
    asChild,
    children,
    ...props
}: React.HTMLAttributes<HTMLElement> & { asChild?: boolean; children: React.ReactNode }) {
    const { open, setOpen } = React.useContext(PopoverContext);

    const handleClick = (e: React.MouseEvent<HTMLElement>) => {
        setOpen(!open);
        (props as React.HTMLAttributes<HTMLElement>).onClick?.(e);
    };

    if (asChild && React.isValidElement(children)) {
        return React.cloneElement(
            children as React.ReactElement<React.HTMLAttributes<HTMLElement>>,
            { onClick: handleClick },
        );
    }

    return (
        <button
            type="button"
            {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
            onClick={handleClick}
        >
            {children}
        </button>
    );
}

// ─── Content ──────────────────────────────────────────────────────────────────

const PopoverContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        align?: 'start' | 'center' | 'end';
        sideOffset?: number;
    }
>(({ className, align = 'center', children, ...props }, ref) => {
    const { open, setOpen, rootRef } = React.useContext(PopoverContext);

    React.useEffect(() => {
        if (!open) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (!rootRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [open, setOpen, rootRef]);

    if (!open) return null;

    const alignClass =
        align === 'end'
            ? 'right-0'
            : align === 'start'
              ? 'left-0'
              : 'left-1/2 -translate-x-1/2';

    return (
        <div
            ref={ref}
            className={cn(
                'absolute top-full z-50 mt-1 min-w-[18rem] rounded-md border bg-popover p-4',
                'text-popover-foreground shadow-md',
                'animate-in fade-in-0 zoom-in-95',
                alignClass,
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
});
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverContent };
