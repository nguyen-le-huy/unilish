import { memo } from 'react';
import { Link2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { VOCAB_PARTS_OF_SPEECH, type VocabItem } from '../../../../../types/course.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
    item: VocabItem;
    onChange: (field: keyof VocabItem, value: string) => void;
}

const PARTS_OF_SPEECH = VOCAB_PARTS_OF_SPEECH;

// ─── Component ────────────────────────────────────────────────────────────────

export const LinguisticBlock = memo(function LinguisticBlock({ item, onChange }: Props) {
    return (
        <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Thông tin ngôn ngữ
            </h4>

            {/* Word */}
            <div className="space-y-1.5">
                <Label htmlFor="word">Từ vựng</Label>
                <Input
                    id="word"
                    value={item.word}
                    onChange={(e) => onChange('word', e.target.value)}
                    placeholder="Nhập từ vựng"
                />
            </div>

            {/* IPA + Part of Speech — Row */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label htmlFor="ipa">IPA</Label>
                    <Input
                        id="ipa"
                        value={item.ipa}
                        onChange={(e) => onChange('ipa', e.target.value)}
                        placeholder="Ví dụ: /ˈæplɪd/"
                        className="font-mono text-sm"
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="partOfSpeech">Loại từ</Label>
                    <Select
                        value={item.partOfSpeech}
                        onValueChange={(v) => onChange('partOfSpeech', v)}
                    >
                        <SelectTrigger id="partOfSpeech">
                            <SelectValue placeholder="Chọn loại từ" />
                        </SelectTrigger>
                        <SelectContent>
                            {PARTS_OF_SPEECH.map((pos) => (
                                <SelectItem key={pos} value={pos}>
                                    {pos}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Definition Native */}
            <div className="space-y-1.5">
                <Label htmlFor="definitionNative">Nghĩa (ngôn ngữ bản địa)</Label>
                <Textarea
                    id="definitionNative"
                    value={item.definitionNative}
                    onChange={(e) => onChange('definitionNative', e.target.value)}
                    placeholder="Định nghĩa bằng ngôn ngữ người dùng (vi, ja…)"
                    rows={2}
                    className="resize-none text-sm"
                />
            </div>

            {/* Definition English */}
            <div className="space-y-1.5">
                <Label htmlFor="definitionEn">Nghĩa (tiếng Anh)</Label>
                <Textarea
                    id="definitionEn"
                    value={item.definitionEn}
                    onChange={(e) => onChange('definitionEn', e.target.value)}
                    placeholder="Định nghĩa bằng tiếng Anh"
                    rows={2}
                    className="resize-none text-sm"
                />
            </div>

            {/* Concept Link — auto-mapped by backend */}
            {item.conceptId && (
                <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-1.5">
                    <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="text-xs text-muted-foreground">Concept:</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                        {item.conceptId}
                    </Badge>
                </div>
            )}
        </div>
    );
});
