/* ──────────────────────────────────────────────────────────────
 * SpeakingEditor — AI Conversation content editor
 * FR-13/AC-17: Scenario title, context, opening prompt, voice
 * ────────────────────────────────────────────────────────────── */

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { SpeakingAdminContent } from '../../types';

interface Props {
  value: SpeakingAdminContent;
  onChange: (value: SpeakingAdminContent) => void;
}

export function SpeakingEditor({ value, onChange }: Props) {
  const update = (patch: Partial<SpeakingAdminContent>) => {
    onChange({ ...value, ...patch });
  };

  return (
    <div className="space-y-6">
      {/* ── Scenario Title ────────────────────────────────── */}
      <div className="max-w-lg">
        <Label>Tiêu đề scenario</Label>
        <Input
          value={value.scenarioTitle}
          onChange={(e) => update({ scenarioTitle: e.target.value })}
          placeholder="Shopping at a supermarket"
        />
      </div>

      {/* ── Context ────────────────────────────────────────── */}
      <div>
        <Label>Bối cảnh (context)</Label>
        <Textarea
          value={value.context}
          onChange={(e) => update({ context: e.target.value })}
          rows={3}
          placeholder="You are at a supermarket in an English-speaking country. You need to find specific items and ask the shop assistant for help."
        />
      </div>

      {/* ── Opening Prompt ─────────────────────────────────── */}
      <div>
        <Label>Câu mở đầu (opening prompt)</Label>
        <Textarea
          value={value.openingPrompt}
          onChange={(e) => update({ openingPrompt: e.target.value })}
          rows={2}
          placeholder="Welcome! How can I help you today?"
        />
      </div>

      {/* ── Duration ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <div className="max-w-xs">
          <Label>Thời lượng dự kiến (phút)</Label>
          <Input
            type="number"
            value={value.expectedDurationMinutes}
            onChange={(e) =>
              update({ expectedDurationMinutes: Math.max(1, Number(e.target.value)) })
            }
            min={1}
          />
        </div>
        <div className="max-w-xs">
          <Label>Giọng đọc (voice)</Label>
          <Input
            value={value.voice}
            onChange={(e) => update({ voice: e.target.value })}
            placeholder="default"
          />
        </div>
      </div>

      {/* ── Grading rubric version ─────────────────────────── */}
      <div className="max-w-xs">
        <Label>Phiên bản rubric chấm (tùy chọn)</Label>
        <Input
          value={value.gradingRubricVersion ?? ''}
          onChange={(e) => update({ gradingRubricVersion: e.target.value || undefined })}
          placeholder="v1"
        />
      </div>
    </div>
  );
}
