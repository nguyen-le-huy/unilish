/* ──────────────────────────────────────────────────────────────
 * IeltsPracticeEditorPage — Create/Edit IELTS Practice test
 * FR-13: General form + skill content editor
 * FR-14: Preview redacted learner DTO
 * FR-15: Version-safe update (draft vs active)
 * FR-16: Publish validation
 * ────────────────────────────────────────────────────────────── */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Eye, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/common/PageHeader';
import { useIeltsPracticeTestDetail } from '../hooks/use-ielts-practice-tests';
import {
  useCreateIeltsPractice,
  useUpdateIeltsPractice,
  useCreateIeltsPracticeVersion,
  useUpdateIeltsPracticeStatus,
  useValidateIeltsPracticePublish,
} from '../hooks/use-ielts-practice-mutations';
import {
  type IeltsSkill,
  type IeltsPracticeUpsertBody,
  type IeltsPracticeAdminContent,
  type ListeningAdminContent,
  type ReadingAdminContent,
  type WritingAdminContent,
  type SpeakingAdminContent,
  SKILL_QUESTION_TYPE_MAP,
  SKILL_LABELS,
  DEFAULT_DURATION,
} from '../types';
import { ListeningEditor } from '../components/editors/ListeningEditor';
import { ReadingEditor } from '../components/editors/ReadingEditor';
import { WritingEditor } from '../components/editors/WritingEditor';
import { SpeakingEditor } from '../components/editors/SpeakingEditor';

const SKILLS: IeltsSkill[] = ['listening', 'reading', 'writing', 'speaking'];

function createSlug(value: string, skill: IeltsSkill): string {
  const slugValue = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (slugValue.length >= 3) {
    return slugValue;
  }

  return `ielts-${skill}-${Date.now().toString(36)}`;
}

/** Create default content for a skill */
function createDefaultContent(skill: IeltsSkill): IeltsPracticeAdminContent {
  switch (skill) {
    case 'listening':
      return {
        instruction: 'Write ONE WORD AND/OR A NUMBER for each answer.',
        heading: 'Form completion',
        audioAssetId: '',
        items: Array.from({ length: 10 }, (_, i) => ({
          id: `l-${String(i + 1).padStart(2, '0')}`,
          order: i + 1,
          before: '',
          after: '',
          acceptedAnswers: [''],
        })),
      };
    case 'reading':
      return {
        title: '',
        passage: [''],
        instruction: 'Do the following statements agree with the information in the passage?',
        statements: [{ id: 'r-01', order: 1, text: '', correctAnswer: 'NOT_GIVEN' }],
      };
    case 'writing':
      return {
        prompt: '',
        instruction: 'Summarise the information by selecting and reporting the main features.',
        imageAssetId: '',
        imageAlt: '',
        minWords: 150,
      };
    case 'speaking':
      return {
        scenarioTitle: '',
        context: '',
        openingPrompt: '',
        expectedDurationMinutes: 15,
        voice: 'default',
      };
  }
}

const IeltsPracticeEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  // ── Existing data load ────────────────────────────────
  const { data: existing, isLoading: detailLoading } = useIeltsPracticeTestDetail(
    isEditing ? id : undefined,
  );

  // ── Mutations ──────────────────────────────────────────
  const createMutation = useCreateIeltsPractice();
  const updateMutation = useUpdateIeltsPractice();
  const createVersionMutation = useCreateIeltsPracticeVersion();
  const updateStatusMutation = useUpdateIeltsPracticeStatus();
  const validateMutation = useValidateIeltsPracticePublish();

  // ── Form state ─────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('general');
  const [skill, setSkill] = useState<IeltsSkill>('listening');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION['listening']);
  const [content, setContent] = useState<IeltsPracticeAdminContent>(
    createDefaultContent('listening'),
  );
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Populate from existing data ────────────────────────
  useEffect(() => {
    if (!existing) return;
    setSkill(existing.skill);
    setTitle(existing.name);
    setSlug(existing.slug);
    setDescription(existing.description ?? '');
    setDurationMinutes(existing.durationMinutes);
    setContent(existing.content);
  }, [existing]);

  const questionType = SKILL_QUESTION_TYPE_MAP[skill];
  const isActive = existing?.status === 'active';

  // ── Handle skill change ────────────────────────────────
  const handleSkillChange = useCallback(
    (newSkill: IeltsSkill) => {
      if (skill !== newSkill && !window.confirm('Đổi kỹ năng sẽ reset nội dung. Tiếp tục?')) return;
      setSkill(newSkill);
      setDurationMinutes(DEFAULT_DURATION[newSkill]);
      if (!existing || existing.skill !== newSkill) {
        setContent(createDefaultContent(newSkill));
      }
    },
    [skill, existing],
  );

  // ── Build payload ───────────────────────────────────────
  const buildPayload = useCallback((): IeltsPracticeUpsertBody => ({
    kind: 'skill_practice',
    format: 'ielts',
    slug: slug ? createSlug(slug, skill) : createSlug(title, skill),
    title,
    description: description || undefined,
    languageId: existing?.languageId ?? '000000000000000000000001',
    language: existing?.language ?? 'en',
    skill,
    questionType,
    durationMinutes,
    content,
    settings: existing?.settings ?? { allowRetake: true, retakeCooldownDays: 7 },
  }), [slug, title, description, skill, questionType, durationMinutes, content, existing]);

  // ── Save handler ───────────────────────────────────────
  const handleSave = async () => {
    setSaveError(null);
    const payload = buildPayload();

    try {
      if (isEditing && id) {
        // Active tests require creating a new version
        if (isActive) {
          await createVersionMutation.mutateAsync({ id, patch: payload });
        } else {
          await updateMutation.mutateAsync({ id, payload });
        }
      } else {
        await createMutation.mutateAsync(payload);
      }
      navigate('/ielts-practice');
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Lưu thất bại'));
    }
  };

  // ── Publish handler ────────────────────────────────────
  const handlePublish = async () => {
    if (!id) return;
    setSaveError(null);
    try {
      // First validate
      const validation = await validateMutation.mutateAsync(id);
      if (!validation.valid) {
        setSaveError(
          'Publish validation failed:\n' +
          validation.errors.map((e) => `• ${e.path}: ${e.message}`).join('\n'),
        );
        return;
      }
      await updateStatusMutation.mutateAsync({ id, payload: { status: 'active' } });
      navigate('/ielts-practice');
    } catch (err) {
      setSaveError(getApiErrorMessage(err, 'Publish thất bại'));
    }
  };

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    createVersionMutation.isPending ||
    updateStatusMutation.isPending ||
    validateMutation.isPending;

  if (detailLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/ielts-practice')}
          className="gap-1 text-muted-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Quay lại danh sách
        </Button>
      </div>
      <PageHeader
        title={isEditing ? 'Chỉnh sửa đề IELTS' : 'Tạo đề IELTS mới'}
        description={
          isEditing
            ? `Đang sửa "${existing?.name ?? id}" · v${existing?.version ?? '?'} · ${existing ? existing.status : ''}`
            : 'Điền thông tin chung và nội dung theo kỹ năng'
        }
      >
        {isActive && (
          <div className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-700 border border-amber-200">
            Đề đang active — sửa sẽ tạo version mới
          </div>
        )}
      </PageHeader>

      {/* ── Error alert ─────────────────────────────────── */}
      {saveError && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription className="whitespace-pre-line">{saveError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">Thông tin chung</TabsTrigger>
          <TabsTrigger value="content">Nội dung</TabsTrigger>
          {isEditing && <TabsTrigger value="preview">Xem trước</TabsTrigger>}
          {isEditing && <TabsTrigger value="publish">Publish</TabsTrigger>}
        </TabsList>

        {/* ══════════════════════════════════════════════════════
            TAB 1: General Info
            ══════════════════════════════════════════════════════ */}
        <TabsContent value="general" className="space-y-6">
          <section className="rounded-lg border p-6">
            <h2 className="mb-4 text-lg font-semibold">Thông tin chung</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Tiêu đề</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  minLength={3}
                  maxLength={200}
                  placeholder="Ví dụ: Cam 20 Listening · Test 1"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label>Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="cam-20-listening-1"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Để trống để tự động sinh từ tiêu đề
                </p>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label>Kỹ năng</Label>
                <Select
                  value={skill}
                  onValueChange={(v) => handleSkillChange(v as IeltsSkill)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILLS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {SKILL_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Loại câu hỏi: <span className="font-mono">{questionType}</span>
                </p>
              </div>

              <div className="col-span-2">
                <Label>Mô tả (tùy chọn)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  maxLength={2000}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <Label>Thời lượng (phút)</Label>
                <Input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Math.max(1, Number(e.target.value)))}
                  min={1}
                />
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <Button onClick={() => setActiveTab('content')}>
              Tiếp theo: Nội dung
            </Button>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            TAB 2: Content Editor (skill-specific)
            ══════════════════════════════════════════════════════ */}
        <TabsContent value="content" className="space-y-6">
          <section className="rounded-lg border p-6">
            <h2 className="mb-1 text-lg font-semibold">
              Nội dung — {SKILL_LABELS[skill]}
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Loại câu hỏi: <span className="font-mono">{questionType}</span>
            </p>

            {skill === 'listening' && (
              <ListeningEditor
                value={content as ListeningAdminContent}
                onChange={(v) => setContent(v)}
              />
            )}
            {skill === 'reading' && (
              <ReadingEditor
                value={content as ReadingAdminContent}
                onChange={(v) => setContent(v)}
              />
            )}
            {skill === 'writing' && (
              <WritingEditor
                value={content as WritingAdminContent}
                onChange={(v) => setContent(v)}
              />
            )}
            {skill === 'speaking' && (
              <SpeakingEditor
                value={content as SpeakingAdminContent}
                onChange={(v) => setContent(v)}
              />
            )}
          </section>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setActiveTab('general')}>
              Quay lại
            </Button>
            <Button onClick={handleSave} disabled={isPending || !title}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang lưu…
                </>
              ) : (
                'Lưu nháp'
              )}
            </Button>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            TAB 3: Preview (FR-14)
            ══════════════════════════════════════════════════════ */}
        {isEditing && (
          <TabsContent value="preview" className="space-y-6">
            <section className="rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Xem trước giao diện learner</h2>
              <div className="rounded-lg border border-dashed bg-muted/20 p-8 text-center">
                <Eye className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Preview renderer sẽ hiển thị content dạng DTO redacted.
                  <br />
                  Không có answer key, không tạo learner attempt.
                </p>
                <div className="mt-4 space-y-2 text-left text-sm">
                  <p><strong>Tiêu đề:</strong> {title}</p>
                  <p><strong>Kỹ năng:</strong> {SKILL_LABELS[skill]} — {questionType}</p>
                  <p><strong>Thời gian:</strong> {durationMinutes} phút</p>
                  <p><strong>Phiên bản:</strong> v{existing?.version ?? '?'}</p>
                  <p><strong>Số item:</strong> {(() => { if ('items' in content) return (content as ListeningAdminContent).items.length; if ('statements' in content) return (content as ReadingAdminContent).statements.length; return 'N/A'; })()}</p>
                  <p><strong>Slug:</strong> {slug}</p>
                </div>
              </div>
            </section>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('content')}>
                Quay lại
              </Button>
              <Button onClick={() => setActiveTab('publish')}>
                Tiếp theo: Publish
              </Button>
            </div>
          </TabsContent>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB 4: Publish (FR-16, FR-17)
            ══════════════════════════════════════════════════════ */}
        {isEditing && (
          <TabsContent value="publish" className="space-y-6">
            <section className="rounded-lg border p-6">
              <h2 className="mb-4 text-lg font-semibold">Publish &amp; quản lý trạng thái</h2>

              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <p className="text-sm font-medium">Trạng thái hiện tại</p>
                  <p className="mt-1 text-2xl font-bold capitalize">{existing?.status ?? 'draft'}</p>
                </div>

                {validateMutation.data && (
                  <div
                    className={`rounded-lg border p-4 ${
                      validateMutation.data.valid
                        ? 'border-green-200 bg-green-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        validateMutation.data.valid ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {validateMutation.data.valid
                        ? '✓ Hợp lệ, có thể publish'
                        : '✗ Còn lỗi cần sửa'}
                    </p>
                    {validateMutation.data.errors.length > 0 && (
                      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-600">
                        {validateMutation.data.errors.map((err, i) => (
                          <li key={i}>
                            <span className="font-mono text-xs">{err.path}</span>: {err.message}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (!id) return;
                      try {
                        await validateMutation.mutateAsync(id);
                      } catch {}
                    }}
                    disabled={isPending}
                  >
                    {validateMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Kiểm tra điều kiện publish
                  </Button>

                  {(existing?.status === 'draft' || existing?.status === 'paused' || existing?.status === 'archived') && (
                    <Button
                      onClick={handlePublish}
                      disabled={isPending}
                      className="gap-2"
                    >
                      {updateStatusMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Publish
                    </Button>
                  )}

                  {existing?.status === 'active' && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!id) return;
                        try {
                          await updateStatusMutation.mutateAsync({
                            id,
                            payload: { status: 'paused' },
                          });
                          navigate('/ielts-practice');
                        } catch {}
                      }}
                      disabled={isPending}
                      className="gap-2 text-yellow-700"
                    >
                      Tạm dừng
                    </Button>
                  )}

                  {(existing?.status === 'paused' || existing?.status === 'active') && (
                    <Button
                      variant="outline"
                      onClick={async () => {
                        if (!id) return;
                        if (!window.confirm('Lưu trữ đề này? Học viên đang làm vẫn có thể hoàn thành.'))
                          return;
                        try {
                          await updateStatusMutation.mutateAsync({
                            id,
                            payload: { status: 'archived' },
                          });
                          navigate('/ielts-practice');
                        } catch {}
                      }}
                      disabled={isPending}
                      className="gap-2 text-destructive"
                    >
                      Lưu trữ
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Publish: content phải hợp lệ, audio/image asset phải ready.
                  <br />
                  Pause: ẩn đề khỏi start mới. Archive: soft delete.
                  <br />
                  Sau publish, chỉ một version được active cho mỗi slug.
                </p>
              </div>
            </section>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab('preview')}>
                Quay lại Preview
              </Button>
              <Button variant="ghost" onClick={handleSave} disabled={isPending}>
                Lưu nháp
              </Button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default IeltsPracticeEditorPage;
