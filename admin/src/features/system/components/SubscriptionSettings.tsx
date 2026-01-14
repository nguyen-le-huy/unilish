import { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { settingsApi } from "@/features/system/api/settings.api";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";


// Schema Definitions
const PlanPriceSchema = z.object({
    monthly: z.coerce.number().min(0),
    yearly: z.coerce.number().min(0),
    discount: z.coerce.number().min(0).max(100).default(30),
});

const PlanLimitsSchema = z.object({
    ai_requests: z.coerce.number().min(-1), // -1 for Infinity
    ai_model: z.array(z.string()), // Changed to array of strings
    latency: z.string().optional(),
});

const PlanFeaturesSchema = z.object({
    content: z.object({
        limited: z.boolean().default(false),
        limit_count: z.coerce.number().optional()
    }),
    practice_tests: z.boolean().default(false),
    certificate: z.boolean().default(false),
    video_call: z.boolean().default(false),
});

const PlanSchema = z.object({
    price: PlanPriceSchema,
    limits: PlanLimitsSchema,
    features: PlanFeaturesSchema,
});

const SubscriptionSettingsSchema = z.object({
    FREE: PlanSchema,
    PLUS: PlanSchema,
    PRO: PlanSchema,
});

type SubscriptionSettingsValues = z.infer<typeof SubscriptionSettingsSchema>;

const DEFAULT_VALUES: SubscriptionSettingsValues = {
    FREE: {
        price: { monthly: 0, yearly: 0, discount: 0 },
        limits: { ai_requests: 10, ai_model: ["uni"], latency: "turn-based" },
        features: {
            content: { limited: true, limit_count: 3 },
            practice_tests: false,
            certificate: false,
            video_call: false
        }
    },
    PLUS: {
        price: { monthly: 20000, yearly: 168000, discount: 30 },
        limits: { ai_requests: 50, ai_model: ["uni"], latency: "turn-based" },
        features: {
            content: { limited: false },
            practice_tests: true,
            certificate: true,
            video_call: false
        }
    },
    PRO: {
        price: { monthly: 40000, yearly: 336000, discount: 30 },
        limits: { ai_requests: -1, ai_model: ["uni", "uni_pro"], latency: "realtime-500ms" }, // -1 = Unlimited
        features: {
            content: { limited: false },
            practice_tests: true,
            certificate: true,
            video_call: true
        }
    }
};

const AI_MODELS = [
    { id: "uni", label: "Uni" },
    { id: "uni_pro", label: "Uni Pro" }
];

export function SubscriptionSettings() {
    const queryClient = useQueryClient();

    // 1. Fetch Settings
    const { data: settingData, isLoading } = useQuery({
        queryKey: ['settings', 'SUBSCRIPTION_PLANS'],
        queryFn: () => settingsApi.getSetting('SUBSCRIPTION_PLANS'),
        staleTime: 5 * 60 * 1000,
    });

    // 2. Setup Form
    const form = useForm<SubscriptionSettingsValues>({
        resolver: zodResolver(SubscriptionSettingsSchema) as Resolver<SubscriptionSettingsValues>,
        defaultValues: DEFAULT_VALUES,
    });

    // 3. Sync Data to Form
    useEffect(() => {
        if (settingData?.value) {
            const values = settingData.value;

            // Helper to normalize price
            const normalizePrice = (price: any) => {
                if (typeof price === 'number') return { monthly: price, yearly: price, discount: 30 };
                return {
                    monthly: price?.monthly || 0,
                    yearly: price?.yearly || 0,
                    discount: price?.discount ?? 30
                };
            };

            // Helper to normalize AI Model (ensure array)
            const normalizeAiModel = (model: any) => {
                if (Array.isArray(model)) return model;
                if (typeof model === 'string') return [model];
                return [];
            };

            // Helper to normalize features (handle migration from string to object)
            const normalizeFeatures = (features: any, plan: "FREE" | "PLUS" | "PRO") => {
                if (typeof features === 'string' || Array.isArray(features)) {
                    return DEFAULT_VALUES[plan].features;
                }
                return {
                    content: {
                        limited: features?.content?.limited ?? DEFAULT_VALUES[plan].features.content.limited,
                        limit_count: features?.content?.limit_count ?? DEFAULT_VALUES[plan].features.content.limit_count
                    },
                    practice_tests: features?.practice_tests ?? DEFAULT_VALUES[plan].features.practice_tests,
                    certificate: features?.certificate ?? DEFAULT_VALUES[plan].features.certificate,
                    video_call: features?.video_call ?? DEFAULT_VALUES[plan].features.video_call
                };
            };

            const formattedValues = {
                FREE: {
                    ...values.FREE,
                    price: normalizePrice(values.FREE.price),
                    limits: { ...values.FREE.limits, ai_model: normalizeAiModel(values.FREE.limits.ai_model) },
                    features: normalizeFeatures(values.FREE.features, "FREE")
                },
                PLUS: {
                    ...values.PLUS,
                    price: normalizePrice(values.PLUS.price),
                    limits: { ...values.PLUS.limits, ai_model: normalizeAiModel(values.PLUS.limits.ai_model) },
                    features: normalizeFeatures(values.PLUS.features, "PLUS")
                },
                PRO: {
                    ...values.PRO,
                    price: normalizePrice(values.PRO.price),
                    limits: { ...values.PRO.limits, ai_model: normalizeAiModel(values.PRO.limits.ai_model) },
                    features: normalizeFeatures(values.PRO.features, "PRO")
                },
            };

            form.reset(formattedValues);
        }
    }, [settingData, form]);

    // 4. Mutation
    const mutation = useMutation({
        mutationFn: (values: SubscriptionSettingsValues) => {
            const payload = {
                FREE: {
                    ...values.FREE,
                    price: 0, // Enforce 0 for FREE
                },
                PLUS: values.PLUS,
                PRO: values.PRO,
            };

            return settingsApi.updateSetting('SUBSCRIPTION_PLANS', payload, "Cấu hình các gói dịch vụ (Free, Plus, Pro)");
        },
        onSuccess: () => {
            toast.success("Đã lưu cấu hình dịch vụ thành công.");
            queryClient.invalidateQueries({ queryKey: ['settings', 'SUBSCRIPTION_PLANS'] });
        },
        onError: (error) => {
            toast.error("Lỗi khi lưu cấu hình.");
            console.error(error);
        }
    });

    function onSubmit(data: SubscriptionSettingsValues) {
        mutation.mutate(data);
    }

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
    }

    const renderAiModelField = (plan: "FREE" | "PLUS" | "PRO") => (
        <FormField
            control={form.control}
            name={`${plan}.limits.ai_model`}
            render={() => (
                <FormItem>
                    <div className="mb-4">
                        <FormLabel className="text-base">AI Models</FormLabel>
                        <FormDescription>
                            Chọn các model AI được phép sử dụng.
                        </FormDescription>
                    </div>
                    {AI_MODELS.map((item) => (
                        <FormField
                            key={item.id}
                            control={form.control}
                            name={`${plan}.limits.ai_model`}
                            render={({ field }) => {
                                return (
                                    <FormItem
                                        key={item.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                        <FormControl>
                                            <Checkbox
                                                checked={field.value?.includes(item.id)}
                                                onCheckedChange={(checked: boolean | "indeterminate") => {
                                                    return checked
                                                        ? field.onChange([...(field.value || []), item.id])
                                                        : field.onChange(
                                                            (field.value || []).filter(
                                                                (value: string) => value !== item.id
                                                            )
                                                        )
                                                }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                            {item.label}
                                        </FormLabel>
                                    </FormItem>
                                )
                            }}
                        />
                    ))}
                    <FormMessage />
                </FormItem>
            )}
        />
    );

    const renderFeatures = (plan: "FREE" | "PLUS" | "PRO") => (
        <div className="space-y-4 rounded-lg border p-4">
            <h4 className="font-medium">Quyền lợi & Tính năng</h4>
            <Separator />

            {/* Content Limit */}
            <div className="flex flex-col gap-3">
                <FormLabel>Truy cập nội dung bài học</FormLabel>
                <div className="flex gap-4">
                    <FormField
                        control={form.control}
                        name={`${plan}.features.content.limited`}
                        render={({ field }) => (
                            <FormItem className="flex items-center space-x-2 space-y-0">
                                <FormControl>
                                    <Select
                                        onValueChange={(val) => field.onChange(val === "limited")}
                                        value={field.value ? "limited" : "unlimited"}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Chọn quyền truy cập" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="unlimited">Không giới hạn</SelectItem>
                                            <SelectItem value="limited">Có giới hạn</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormControl>
                            </FormItem>
                        )}
                    />

                    {form.watch(`${plan}.features.content.limited`) && (
                        <FormField
                            control={form.control}
                            name={`${plan}.features.content.limit_count`}
                            render={({ field }) => (
                                <FormItem className="w-[150px]">
                                    <FormControl>
                                        <Input type="number" placeholder="Số bài học" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
            </div>

            <Separator />

            {/* Boolean Features */}
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name={`${plan}.features.practice_tests`}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Luyện tập đề thi</FormLabel>
                                <FormDescription>Cho phép làm bộ đề thi (IELTS/VSTEP)</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name={`${plan}.features.certificate`}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Chứng chỉ</FormLabel>
                                <FormDescription>Cấp chứng chỉ khi hoàn thành</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name={`${plan}.features.video_call`}
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <FormLabel>Video Call 1-1</FormLabel>
                                <FormDescription>Tính năng gọi video trực tiếp</FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
            </div>
        </div>
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cấu hình Gói dịch vụ & Quyền lợi</CardTitle>
                <CardDescription>Thiết lập giá, giới hạn AI, và tính năng cho từng cấp độ thành viên.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <Tabs defaultValue="FREE" className="w-full">
                            <TabsList className="grid w-full grid-cols-3 mb-6">
                                <TabsTrigger value="FREE">FREE (Miễn phí)</TabsTrigger>
                                <TabsTrigger value="PLUS">PLUS (Tiêu chuẩn)</TabsTrigger>
                                <TabsTrigger value="PRO">PRO (Cao cấp)</TabsTrigger>
                            </TabsList>

                            {/* --- FREE PLAN --- */}
                            <TabsContent value="FREE" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="FREE.limits.ai_requests" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Số lượt AI Request (Ngày)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormDescription>-1 là không giới hạn</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    {renderAiModelField("FREE")}
                                </div>
                                {renderFeatures("FREE")}
                            </TabsContent>

                            {/* --- PLUS PLAN --- */}
                            <TabsContent value="PLUS" className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField control={form.control} name="PLUS.price.monthly" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá tháng (VNĐ)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        field.onChange(val);
                                                        const discount = form.getValues("PLUS.price.discount") || 0;
                                                        form.setValue("PLUS.price.yearly", Math.round(val * 12 * ((100 - discount) / 100)));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="PLUS.price.discount" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giảm giá năm (%)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        field.onChange(val);
                                                        const monthly = form.getValues("PLUS.price.monthly") || 0;
                                                        form.setValue("PLUS.price.yearly", Math.round(monthly * 12 * ((100 - val) / 100)));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="PLUS.price.yearly" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá năm (Tự tính)</FormLabel>
                                            <FormControl><Input type="number" readOnly className="bg-muted" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="PLUS.limits.ai_requests" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Số lượt AI Request (Ngày/Giờ)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    {renderAiModelField("PLUS")}
                                </div>
                                {renderFeatures("PLUS")}
                            </TabsContent>

                            {/* --- PRO PLAN --- */}
                            <TabsContent value="PRO" className="space-y-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <FormField control={form.control} name="PRO.price.monthly" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá tháng (VNĐ)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        field.onChange(val);
                                                        const discount = form.getValues("PRO.price.discount") || 0;
                                                        form.setValue("PRO.price.yearly", Math.round(val * 12 * ((100 - discount) / 100)));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="PRO.price.discount" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giảm giá năm (%)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    {...field}
                                                    onChange={(e) => {
                                                        const val = Number(e.target.value);
                                                        field.onChange(val);
                                                        const monthly = form.getValues("PRO.price.monthly") || 0;
                                                        form.setValue("PRO.price.yearly", Math.round(monthly * 12 * ((100 - val) / 100)));
                                                    }}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="PRO.price.yearly" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Giá năm (Tự tính)</FormLabel>
                                            <FormControl><Input type="number" readOnly className="bg-muted" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <FormField control={form.control} name="PRO.limits.ai_requests" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Số lượt AI Request</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormDescription>Nhập -1 để không giới hạn</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    {renderAiModelField("PRO")}
                                </div>
                                {renderFeatures("PRO")}
                            </TabsContent>
                        </Tabs>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Lưu cấu hình
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
