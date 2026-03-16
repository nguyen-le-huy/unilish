import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLanguages, useUpdateLanguage } from '@/features/curriculum/languages';

export function LanguageConfig() {
    const { data: languages = [], isLoading } = useLanguages({ isActive: true });
    const updateMutation = useUpdateLanguage();

    const [selectedCode, setSelectedCode] = useState<string>('');
    const [greeting, setGreeting] = useState<string>('');
    const [greetingSound, setGreetingSound] = useState<string>('');

    const selectedLanguage = useMemo(() => {
        return languages.find((language) => language.code === selectedCode) ?? null;
    }, [languages, selectedCode]);

    const handleLanguageChange = (code: string) => {
        setSelectedCode(code);
        const language = languages.find((item) => item.code === code);
        if (!language) {
            return;
        }

        setGreeting(language.greeting ?? '');
        setGreetingSound(language.greetingSound ?? '');
    };

    const handleSave = async () => {
        if (!selectedLanguage) {
            return;
        }

        await updateMutation.mutateAsync({
            code: selectedLanguage.code,
            payload: {
                greeting: greeting.trim() || null,
                greetingSound: greetingSound.trim() || null,
            },
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cấu hình Greeting ngôn ngữ</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="lc-language">Ngôn ngữ</Label>
                    <Select value={selectedCode} onValueChange={handleLanguageChange}>
                        <SelectTrigger id="lc-language" aria-label="Chọn ngôn ngữ">
                            <SelectValue placeholder={isLoading ? 'Đang tải...' : 'Chọn ngôn ngữ'} />
                        </SelectTrigger>
                        <SelectContent>
                            {languages.map((language) => (
                                <SelectItem key={language._id} value={language.code}>
                                    {language.nativeName} ({language.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lc-greeting">Greeting</Label>
                    <Textarea
                        id="lc-greeting"
                        value={greeting}
                        onChange={(event) => setGreeting(event.target.value)}
                        placeholder="Hello, welcome to UniLish."
                        aria-label="Greeting"
                        rows={3}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lc-greeting-sound">Greeting sound URL</Label>
                    <Textarea
                        id="lc-greeting-sound"
                        value={greetingSound}
                        onChange={(event) => setGreetingSound(event.target.value)}
                        placeholder="https://... hoặc /audio/..."
                        aria-label="Greeting sound URL"
                        rows={2}
                    />
                </div>

                <Button type="button" className="w-full" disabled={!selectedLanguage || updateMutation.isPending} onClick={handleSave}>
                    Lưu cấu hình ngôn ngữ
                </Button>
            </CardContent>
        </Card>
    );
}
