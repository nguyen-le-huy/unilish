import { useCallback, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useTestLanguageVoice } from '../../hooks/useLanguageMutations';
import type { LanguageFormValues } from '../../hooks/useLanguageForm';
import { playAudioBase64 } from '../../utils/language.utils';

interface TestVoiceCardProps {
    /** Language code used as the test endpoint key. Pass the route `code` param or the form value in create mode. */
    resolvedCode: string;
    form: UseFormReturn<LanguageFormValues>;
    className?: string;
}

const DEFAULT_TEST_TEXT = 'Hello, welcome to UniLish.';

export function TestVoiceCard({ resolvedCode, form, className }: TestVoiceCardProps) {
    const [testText, setTestText] = useState<string>(DEFAULT_TEST_TEXT);
    const testVoiceMutation = useTestLanguageVoice();

    const ttsConfig = form.watch('ttsConfig');

    const handleTest = useCallback(async () => {
        if (!resolvedCode || !ttsConfig.voiceId) return;

        const result = await testVoiceMutation.mutateAsync({
            code: resolvedCode,
            payload: {
                text: testText,
                provider: ttsConfig.provider,
                voiceId: ttsConfig.voiceId.trim(),
                style: ttsConfig.style?.trim() || undefined,
                speed: ttsConfig.speed,
            },
        });

        await playAudioBase64(result.mimeType, result.audioBase64);
    }, [resolvedCode, ttsConfig, testText, testVoiceMutation]);

    const canTest = Boolean(resolvedCode && ttsConfig.voiceId);

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>Test Voice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <Textarea
                    rows={5}
                    value={testText}
                    onChange={(e) => setTestText(e.target.value)}
                    placeholder={DEFAULT_TEST_TEXT}
                    aria-label="Text to synthesize for voice testing"
                />
                <Button
                    type="button"
                    className="w-full"
                    onClick={handleTest}
                    disabled={!canTest || testVoiceMutation.isPending}
                    aria-label="Play test voice synthesis"
                >
                    <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                    {testVoiceMutation.isPending ? 'Đang test...' : 'Test Voice'}
                </Button>
            </CardContent>
        </Card>
    );
}
