import type { UseFormReturn } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { AZURE_STYLE_OPTIONS, OPENAI_VOICE_OPTIONS, TTS_PROVIDERS } from '../../constants/tts.constants';
import type { LanguageFormValues } from '../../hooks/useLanguageForm';

interface TtsConfigCardProps {
    form: UseFormReturn<LanguageFormValues>;
    className?: string;
}

export function TtsConfigCard({ form, className }: TtsConfigCardProps) {
    const provider = form.watch('ttsConfig.provider');
    const speed = form.watch('ttsConfig.speed');

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle>TTS Engine Config</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Provider */}
                <FormField
                    control={form.control}
                    name="ttsConfig.provider"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor="tts-provider">Provider</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger id="tts-provider" aria-label="Select TTS provider">
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {TTS_PROVIDERS.map((p) => (
                                        <SelectItem key={p} value={p}>
                                            {p === 'OPENAI' ? 'OpenAI' : p === 'AZURE' ? 'Azure AI Speech' : 'ElevenLabs'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Voice ID — dropdown for OpenAI, free text for others */}
                <FormField
                    control={form.control}
                    name="ttsConfig.voiceId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor="tts-voice-id">Voice ID</FormLabel>
                            {provider === 'OPENAI' ? (
                                <Select value={field.value} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger id="tts-voice-id" aria-label="Select OpenAI voice">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {OPENAI_VOICE_OPTIONS.map((v) => (
                                            <SelectItem key={v} value={v}>
                                                {v}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <FormControl>
                                    <Input
                                        id="tts-voice-id"
                                        {...field}
                                        placeholder={provider === 'AZURE' ? 'en-US-JennyNeural' : 'your-voice-id'}
                                        aria-label="Enter voice ID"
                                    />
                                </FormControl>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Style — dropdown for Azure, disabled for others */}
                <FormField
                    control={form.control}
                    name="ttsConfig.style"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor="tts-style">Voice Style (Azure only)</FormLabel>
                            {provider === 'AZURE' ? (
                                <Select
                                    value={field.value ?? 'chat'}
                                    onValueChange={field.onChange}
                                >
                                    <FormControl>
                                        <SelectTrigger id="tts-style" aria-label="Select Azure voice style">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {AZURE_STYLE_OPTIONS.map((s) => (
                                            <SelectItem key={s} value={s}>
                                                {s}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <FormControl>
                                    <Input
                                        id="tts-style"
                                        disabled
                                        value=""
                                        placeholder="Azure only"
                                        aria-label="Voice style (Azure only)"
                                    />
                                </FormControl>
                            )}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* Speed slider */}
                <FormField
                    control={form.control}
                    name="ttsConfig.speed"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel htmlFor="tts-speed">
                                Speed:{' '}
                                <span className="font-mono text-primary">
                                    {speed.toFixed(2)}x
                                </span>
                            </FormLabel>
                            <FormControl>
                                <input
                                    id="tts-speed"
                                    type="range"
                                    className="w-full accent-primary"
                                    min={0.8}
                                    max={1.2}
                                    step={0.01}
                                    value={field.value}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                    aria-label={`TTS speed: ${speed.toFixed(2)}x`}
                                    aria-valuemin={0.8}
                                    aria-valuemax={1.2}
                                    aria-valuenow={speed}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
    );
}
