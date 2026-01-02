
export function PlaceholderPage({ title }: { title: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border-2 border-dashed">
            <h1 className="text-2xl font-bold text-muted-foreground">{title}</h1>
            <p className="text-muted-foreground mt-2">Trang này đang được phát triển...</p>
        </div>
    )
}
