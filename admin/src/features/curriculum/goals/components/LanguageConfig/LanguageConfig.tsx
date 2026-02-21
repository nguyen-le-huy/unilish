import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useLanguages, useUpdateLanguage, type TTSProvider } from '@/features/curriculum/languages';

export function LanguageConfig() {
    const { data: languages = [], isLoading } = useLanguages({ isActive: true });
    const updateMutation = useUpdateLanguage();

    const [selectedCode, setSelectedCode] = useState<string>('');
    const [provider, setProvider] = useState<TTSProvider>('OPENAI');
    const [voiceId, setVoiceId] = useState<string>('');

    const selectedLanguage = useMemo(() => {
        return languages.find((language) => language.code === selectedCode) ?? null;
    }, [languages, selectedCode]);

    const handleLanguageChange = (code: string) => {
        setSelectedCode(code);
        const language = languages.find((item) => item.code === code);
        if (!language) {
            return;
        }

        setProvider(language.ttsConfig.provider);
        setVoiceId(language.ttsConfig.voiceId ?? '');
    };

    const handleSave = async () => {
        if (!selectedLanguage) {
            return;
        }

        await updateMutation.mutateAsync({
            code: selectedLanguage.code,
            payload: {
                ttsConfig: {
                    provider,
                    voiceId: voiceId.trim() || undefined,
                },
            },
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Cấu hình TTS ngôn ngữ</CardTitle>
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
                    <Label htmlFor="lc-provider">Nhà cung cấp TTS</Label>
                    <Select value={provider} onValueChange={(value) => setProvider(value as TTSProvider)}>
                        <SelectTrigger id="lc-provider" aria-label="Chọn nhà cung cấp TTS">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="OPENAI">OpenAI</SelectItem>
                            <SelectItem value="AZURE">Azure</SelectItem>
                            <SelectItem value="ELEVENLABS">ElevenLabs</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="lc-voice-id">Mã giọng đọc</Label>
                    <Input id="lc-voice-id" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} placeholder="alloy / en-US-JennyNeural" aria-label="Mã giọng đọc" />
                </div>

                <Button type="button" className="w-full" disabled={!selectedLanguage || updateMutation.isPending} onClick={handleSave}>
                    Lưu cấu hình ngôn ngữ
                </Button>
            </CardContent>
        </Card>
    );
}
