import { useState, useEffect } from "react";
import { settingsApi } from "../api/settings.api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

interface LevelIcons {
    [key: string]: string;
}

export function LevelIconManager() {
    const [icons, setIcons] = useState<LevelIcons>({});
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);

    useEffect(() => {
        loadIcons();
    }, []);

    const loadIcons = async () => {
        try {
            setLoading(true);
            const data = await settingsApi.getSetting('level_icons');
            if (data && data.value) {
                setIcons(data.value);
            }
        } catch (error) {
            console.error("Failed to load icons", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (level: string, file: File) => {
        try {
            setUploading(level);
            // 1. Upload to Cloudinary
            const uploadRes = await settingsApi.uploadImage(file);
            const newUrl = uploadRes.url;

            // 2. Update Local State
            const newIcons = { ...icons, [level]: newUrl };
            setIcons(newIcons);

            // 3. Save to SystemSettings
            await settingsApi.updateSetting('level_icons', newIcons, 'Icons for Level Progress');
            toast.success(`Cập nhật icon cho level ${level} thành công`);
        } catch (error) {
            console.error(error);
            toast.error("Upload thất bại");
        } finally {
            setUploading(null);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

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
                                    disabled={!!uploading}
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full gap-2"
                                    onClick={() => document.getElementById(`upload-${level}`)?.click()}
                                    disabled={uploading === level}
                                >
                                    {uploading === level ? (
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
