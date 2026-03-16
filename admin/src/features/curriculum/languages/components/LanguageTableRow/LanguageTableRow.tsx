import { memo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { TableCell, TableRow } from '@/components/ui/table';
import { useToggleLanguageStatus } from '../../hooks/useLanguageMutations';
import type { Language } from '../../types/language.types';

interface LanguageTableRowProps {
    language: Language;
}

export const LanguageTableRow = memo(function LanguageTableRow({ language }: LanguageTableRowProps) {
    const navigate = useNavigate();
    const toggleMutation = useToggleLanguageStatus();

    const isThisRowPending = toggleMutation.isPending && toggleMutation.variables === language.code;

    const handleToggle = useCallback(() => {
        toggleMutation.mutate(language.code);
    }, [language.code, toggleMutation]);

    const handleEdit = useCallback(() => {
        navigate(`/curriculum/languages/${language.code}`);
    }, [language.code, navigate]);

    return (
        <TableRow>
            <TableCell>
                {language.flagIconUrl ? (
                    <img
                        src={language.flagIconUrl}
                        alt={`Flag of ${language.name}`}
                        className="h-6 w-6 rounded-sm object-cover"
                    />
                ) : (
                    <span className="text-muted-foreground" aria-label="No flag icon">
                        —
                    </span>
                )}
            </TableCell>

            <TableCell>
                <div className="font-medium">{language.name}</div>
                <div className="text-xs text-muted-foreground">{language.nativeName}</div>
            </TableCell>

            <TableCell>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{language.code}</code>
            </TableCell>

            <TableCell>
                <Badge variant="outline">
                    {language.greetingSound ? 'Có âm thanh' : 'Chưa có'}
                </Badge>
            </TableCell>

            <TableCell>
                <div className="flex items-center gap-2">
                    {isThisRowPending ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                        <Switch
                            checked={language.isActive}
                            onCheckedChange={handleToggle}
                            disabled={toggleMutation.isPending}
                            aria-label={`Toggle active status for ${language.name}`}
                        />
                    )}
                    <span
                        className={
                            language.isActive ? 'text-emerald-600 text-sm' : 'text-red-500 text-sm'
                        }
                    >
                        {language.isActive ? 'Active' : 'Inactive'}
                    </span>
                </div>
            </TableCell>

            <TableCell className="text-right">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    aria-label={`Edit language ${language.name}`}
                >
                    Edit
                </Button>
            </TableCell>
        </TableRow>
    );
});
