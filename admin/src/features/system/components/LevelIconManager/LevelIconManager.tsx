import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { LEVELS } from "../../types/system.types";
import { useLevelIcons, useUpdateLevelIcon } from "../../hooks/useSystemData";

export function LevelIconManager() {
    const { data: icons = {}, isLoading } = useLevelIcons();
    const updateIcon = useUpdateLevelIcon();

    const handleUpload = (level: string, file: File) => {
        updateIcon.mutate({ level, file });
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Biểu tượng Cấp độ (Level Icons)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Biểu tượng Cấp độ (Level Icons)</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                    {LEVELS.map((level) => (
                        <div key={level} className="flex flex-col gap-3 p-4 border rounded-lg items-center">
                            <span className="font-bold text-lg">{level}</span>

                            <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden border">
                                {icons[level] ? (
                                    <img src={icons[level]} alt={level} className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-muted-foreground text-xs">Chưa có icon</span>
                                )}
                            </div>

                            <div className="relative">
                                <Input
                                    type="file"
                                    className="hidden"
                                    id={`upload-${level}`}
                                    accept="image/*"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleUpload(level, file);
                                    }}
                                    disabled={updateIcon.isPending}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-2"
                                    onClick={() => document.getElementById(`upload-${level}`)?.click()}
                                    disabled={updateIcon.isPending}
                                >
                                    {updateIcon.isPending && updateIcon.variables?.level === level ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4" />
                                    )}
                                    {icons[level] ? 'Thay đổi' : 'Upload'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
