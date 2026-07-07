/* ──────────────────────────────────────────────────────────────
 * ReadingEditor — TFNG (True/False/Not Given) content editor
 * FR-13/AC-17: Passage + statements with correctAnswer
 * ────────────────────────────────────────────────────────────── */

import { useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ReadingAdminContent } from '../../types';

interface Props {
  value: ReadingAdminContent;
  onChange: (value: ReadingAdminContent) => void;
}

const TFNG_OPTIONS = [
  { value: 'TRUE', label: 'TRUE' },
  { value: 'FALSE', label: 'FALSE' },
  { value: 'NOT_GIVEN', label: 'NOT GIVEN' },
] as const;

export function ReadingEditor({ value, onChange }: Props) {
  const update = useCallback(
    (patch: Partial<ReadingAdminContent>) => {
      onChange({ ...value, ...patch });
    },
    [value, onChange],
  );

  const updateStatement = useCallback(
    (index: number, patch: Partial<ReadingAdminContent['statements'][0]>) => {
      const statements = value.statements.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      );
      update({ statements });
    },
    [value, update],
  );

  const addStatement = useCallback(() => {
    const order = value.statements.length + 1;
    update({
      statements: [
        ...value.statements,
        {
          id: `r-${String(order).padStart(2, '0')}`,
          order,
          text: '',
          correctAnswer: 'NOT_GIVEN',
        },
      ],
    });
  }, [value, update]);

  const removeStatement = useCallback(
    (index: number) => {
      if (value.statements.length <= 1) return;
      const statements = value.statements
        .filter((_, i) => i !== index)
        .map((s, i) => ({ ...s, order: i + 1 }));
      update({ statements });
    },
    [value, update],
  );

  return (
    <div className="space-y-6">
      {/* ── Title & Instruction ──────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 sm:col-span-1">
          <Label>Tiêu đề passage</Label>
          <Input
            value={value.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Reading Passage Title"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Hướng dẫn</Label>
          <Input
            value={value.instruction}
            onChange={(e) => update({ instruction: e.target.value })}
            placeholder="Do the following statements agree with the information…?"
          />
        </div>
      </div>

      {/* ── Passage ───────────────────────────────────────── */}
      <div>
        <Label>Passage (mỗi dòng = một đoạn)</Label>
        <Textarea
          value={value.passage.join('\n')}
          onChange={(e) => update({ passage: e.target.value.split('\n') })}
          rows={8}
          placeholder="Nhập nội dung passage, mỗi đoạn cách nhau bằng dòng mới…"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {value.passage.length} đoạn
        </p>
      </div>

      {/* ── Statements ────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <Label className="text-base font-semibold">
            Statements ({value.statements.length})
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addStatement}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Thêm statement
          </Button>
        </div>

        <div className="space-y-3">
          {value.statements.map((stmt, index) => (
            <div key={stmt.id} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">
                  #{stmt.order}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  onClick={() => removeStatement(index)}
                  disabled={value.statements.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="space-y-2">
                <div>
                  <Label className="text-xs">Nội dung statement</Label>
                  <Input
                    value={stmt.text}
                    onChange={(e) => updateStatement(index, { text: e.target.value })}
                    placeholder="The kākāpō is the world's only flightless parrot..."
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs">Đáp án đúng</Label>
                    <Select
                      value={stmt.correctAnswer}
                      onValueChange={(v) =>
                        updateStatement(index, {
                          correctAnswer: v as 'TRUE' | 'FALSE' | 'NOT_GIVEN',
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TFNG_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-[2]">
                    <Label className="text-xs">Giải thích (tùy chọn)</Label>
                    <Input
                      value={stmt.explanation ?? ''}
                      onChange={(e) =>
                        updateStatement(index, { explanation: e.target.value || undefined })
                      }
                      placeholder="Learner will see this after grading"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
