import { LevelIconManager } from "../../components/LevelIconManager/LevelIconManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/common/PageHeader";

export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Cấu hình hệ thống"
                description="Quản lý các cài đặt chung cho toàn bộ ứng dụng."
            />

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
