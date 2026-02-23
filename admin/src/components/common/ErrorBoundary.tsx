import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    children: ReactNode;
    /** Custom fallback UI. If omitted, a generic error card is shown. */
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Isolates render-time JS errors so a crash in one panel does not take down
 * the entire page. Place this around any independently-failing subtree.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    override componentDidCatch(error: Error, info: ErrorInfo) {
        // In production this would go to Sentry / Datadog.
        // Using console.error once because the Logger (Winston) is server-only.
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    override render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <AlertTriangle className="h-10 w-10 text-destructive/60" aria-hidden="true" />
                    <div>
                        <p className="text-sm font-medium">Đã xảy ra lỗi không mong muốn</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {this.state.error?.message ?? 'Unknown error'}
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={this.handleReset}>
                        Thử lại
                    </Button>
                </div>
            );
        }

        return this.props.children;
    }
}
