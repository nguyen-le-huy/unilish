import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguages } from '@/features/curriculum/languages';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import type { GoalFormValues } from '../../hooks/useLearningGoalForm';

export function SupportedLanguagesCard() {
    const form = useFormContext<GoalFormValues>();
    const { data: languages = [], isLoading } = useLanguages({ isActive: true });

    return (
        <Card>
            <CardHeader>
                <CardTitle>Ngôn ngữ hỗ trợ</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <Skeleton key={i} className="h-6 w-full" />
                        ))}
                    </div>
                ) : (
                    <FormField
                        control={form.control}
                        name="supportedLanguages"
                        render={({ field }) => (
                            <FormItem>
                                <div className="space-y-2">
                                    {languages.map((lang) => {
                                        const checked = field.value.includes(lang._id);
                                        return (
                                            <div key={lang._id} className="flex items-center gap-3">
                                                <Checkbox
                                                    id={`lang-${lang._id}`}
                                                    checked={checked}
                                                    onCheckedChange={(isChecked) => {
                                                        const next = isChecked
                                                            ? [...field.value, lang._id]
                                                            : field.value.filter((id) => id !== lang._id);
                                                        field.onChange(next);
                                                    }}
                                                    aria-label={`Chọn ${lang.nativeName}`}
                                                />
                                                <Label htmlFor={`lang-${lang._id}`} className="cursor-pointer flex items-center gap-2">
                                                    <span>{lang.nativeName}</span>
                                                    <span className="text-xs text-muted-foreground">({lang.code})</span>
                                                </Label>
                                            </div>
                                        );
                                    })}
                                    {languages.length === 0 && (
                                        <p className="text-sm text-muted-foreground">Chưa có ngôn ngữ nào được kích hoạt.</p>
                                    )}
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
            </CardContent>
        </Card>
    );
}
