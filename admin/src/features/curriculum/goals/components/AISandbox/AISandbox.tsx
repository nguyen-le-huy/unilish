import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useTestLearningGoal } from '../../hooks/useLearningGoalMutations';
import type { SkillWeights } from '../../types/learning-goal.types';

interface AISandboxProps {
    slug: string;
    systemPrompt: string;
    skillWeights: SkillWeights;
    ignoredSkills: string[];
}

export function AISandbox({ slug, systemPrompt, skillWeights, ignoredSkills }: AISandboxProps) {
    const [input, setInput] = useState('I want eat beef. Give me water.');
    const [context, setContext] = useState('Gọi món tại nhà hàng');
    const [result, setResult] = useState<string>('');
    const [debugInfo, setDebugInfo] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');

    const testMutation = useTestLearningGoal();

    const handleRunTest = async () => {
        setErrorMessage('');
        setResult('');
        setDebugInfo('');
        try {
            const response = await testMutation.mutateAsync({
                slug,
                payload: {
                    draftConfig: {
                        systemPrompt,
                        skillWeights,
                        ignoredSkills,
                    },
                    scenario: {
                        userInput: input,
                        context,
                    },
                },
            });

            setResult(response.aiResponse);
            setDebugInfo(JSON.stringify(response.debug, null, 2));
        } catch (err: unknown) {
            const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                (err instanceof Error ? err.message : null) ??
                'Kiểm tra thất bại. Vui lòng thử lại.';
            setErrorMessage(msg);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Khu vực thử nghiệm AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="sandbox-context">Ngữ cảnh</Label>
                    <Textarea id="sandbox-context" value={context} onChange={(event) => setContext(event.target.value)} rows={2} aria-label="Ngữ cảnh kiểm tra" />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sandbox-input">Nội dung học viên nhập</Label>
                    <Textarea id="sandbox-input" value={input} onChange={(event) => setInput(event.target.value)} rows={3} aria-label="Nội dung học viên nhập" />
                </div>

                <Button type="button" onClick={handleRunTest} disabled={testMutation.isPending || !slug} className="w-full">
                    {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Kiểm tra phản hồi
                </Button>

                {errorMessage && (
                    <p className="text-sm text-destructive" role="alert">{errorMessage}</p>
                )}

                <div className="space-y-2">
                    <Label htmlFor="sandbox-result">Kết quả AI</Label>
                    <div id="sandbox-result" className="rounded-md border p-3 text-sm min-h-20 whitespace-pre-wrap">{result || 'Chưa có kết quả test'}</div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="sandbox-debug">Debug</Label>
                    <pre id="sandbox-debug" className="rounded-md border bg-muted p-3 text-xs overflow-x-auto min-h-24">{debugInfo || '{}'}</pre>
                </div>
            </CardContent>
        </Card>
    );
}
