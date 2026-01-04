import { LevelIconManager } from "@/features/system/components/LevelIconManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Cấu hình hệ thống</h1>
                <p className="text-muted-foreground">Quản lý các cài đặt chung cho toàn bộ ứng dụng.</p>
            </div>

            <Tabs defaultValue="levels" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="levels">Cấp độ & XP</TabsTrigger>
                    <TabsTrigger value="general">Chung</TabsTrigger>
                </TabsList>

                <TabsContent value="levels" className="space-y-4">
                    {/* Level Asset Manager */}
                    <LevelIconManager />
                </TabsContent>

                <TabsContent value="general">
                    <div className="p-4 border rounded-lg bg-slate-50 text-center text-muted-foreground">
                        Chưa có cài đặt chung.
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
