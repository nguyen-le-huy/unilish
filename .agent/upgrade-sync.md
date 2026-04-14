# Upgrade Plan: AI-Powered Course Series Vector Sync

> **Mục tiêu:** Nâng cấp script `sync-course-series-vectors.ts` từ việc chỉ dùng raw text embedding sang **dùng LLM để phân tích nội dung** course series (tiêu đề, mô tả), sinh ra metadata phong phú hơn (tags, topics, audience, difficulty, summary chuẩn hoá), rồi mới embed và sync vào Pinecone.
>
> **Model sử dụng:** `gpt-5.4-mini-2026-03-17` (từ `OPENAI_MODEL` trong `server/.env`)  
> **Embedding model:** `text-embedding-3-small` (từ `OPENAI_API_KEY` hiện có)  
> **API Key:** Dùng `OPENAI_API_KEY` đã có sẵn trong `.env` — không cần thêm key mới.

---

## 1. Vấn đề hiện tại

Script hiện tại (`sync-course-series-vectors.ts`) hoạt động theo flow đơn giản:

```
MongoDB → buildSeriesEmbedText() → OpenAI Embeddings → Pinecone upsert
```

**Hạn chế:**
- `buildSeriesEmbedText()` chỉ ghép chuỗi `title + description` thô, không có ngữ nghĩa sâu.
- Metadata trong Pinecone thiếu thông tin phong phú (topics, audience, tags) khiến ANN search kém chính xác.
- `parseLevelRange()` dùng regex đơn giản, dễ sai nếu title không có pattern `(A1-B1)`.
- Không có cơ chế detect xem series có "lõi" gì (giao tiếp? ngữ pháp? từ vựng?).

---

## 2. Giải pháp: AI Analysis Pipeline

Thêm bước **LLM Analysis** giữa bước đọc MongoDB và bước embedding:

```
MongoDB
  → LLM Analysis (gpt-5.4-mini-2026-03-17 via OPENAI_MODEL)
      → Enriched Metadata (tags, topics, audience, summary, levelRange)
          → buildEnrichedEmbedText()
              → OpenAI Embeddings
                  → Pinecone upsert (với metadata phong phú hơn)
```

---

## 3. Thiết kế Output từ LLM

### 3.1 LLM Prompt Input

```
Bạn là chuyên gia phân tích nội dung khoá học ngôn ngữ.
Phân tích thông tin course series sau và trả về JSON.

Title: {series.title}
Description: {series.description}

Trả về JSON với cấu trúc sau (không giải thích thêm):
{
  "summary": "...",        // Tóm tắt 1-2 câu, chuẩn hoá, súc tích
  "topics": [...],         // Mảng chủ đề chính: ["giao tiếp", "ngữ pháp", "từ vựng", ...]
  "audience": "...",       // Đối tượng học viên: "beginner" | "intermediate" | "advanced" | "all"
  "skills": [...],         // Kỹ năng được rèn: ["nghe", "nói", "đọc", "viết"]
  "tags": [...],           // Tags SEO phong phú tối đa 8 tags
  "levelMin": "...",       // Trình độ tối thiểu: "A0"|"A1"|"A2"|"B1"|"B2"|"C1"|"C2"
  "levelMax": "...",       // Trình độ tối đa
  "useCase": "..."         // Ứng dụng: "du lịch"|"công việc"|"học thuật"|"đời sống"|"thi cử"
}
```

### 3.2 Enriched Metadata trong Pinecone

```typescript
interface CourseSeriesVectorMetadata {
  // --- Existing fields ---
  languageId:      string;
  learningGoalId:  string;
  isActive:        boolean;
  levelMinNum:     number;
  levelMaxNum:     number;
  levelMin:        string;
  levelMax:        string;
  title:           string;
  slug:            string;
  description:     string;
  thumbnailUrl:    string;
  totalCourses:    number;

  // --- NEW: AI-generated fields ---
  aiSummary:       string;    // Tóm tắt chuẩn hoá từ LLM
  topics:          string[];  // ["giao tiếp", "phát âm"]
  skills:          string[];  // ["nghe", "nói"]
  tags:            string[];  // ["tiếng anh giao tiếp", "du lịch"]
  audience:        string;    // "beginner" | "intermediate" | ...
  useCase:         string;    // "du lịch" | "công việc" | ...
  aiAnalyzedAt:    string;    // ISO timestamp - dùng để detect stale
}
```

### 3.3 Enriched Embed Text

Thay vì chỉ ghép `title + description`, dùng `aiSummary` + `topics` + `tags` để tạo text embedding chất lượng hơn:

```
"Hành Trang Tiếng Anh (A1-B1).
Khoá học giao tiếp tiếng Anh cơ bản dành cho người mới bắt đầu.
Chủ đề: giao tiếp, đời sống, du lịch.
Kỹ năng: nghe, nói.
Tags: tiếng anh giao tiếp, tiếng anh cơ bản, luyện nói."
```

---

## 4. Architecture: New Files & Changes

### 4.1 File mới cần tạo

#### `server/src/services/ai-analysis.service.ts`

Service chịu trách nhiệm gọi LLM và parse kết quả:

```typescript
interface SeriesAIAnalysis {
  summary:    string;
  topics:     string[];
  audience:   string;
  skills:     string[];
  tags:       string[];
  levelMin:   string;
  levelMax:   string;
  useCase:    string;
}

class AIAnalysisService {
  /**
   * Phân tích 1 series bằng LLM
   */
  async analyzeCourseSeries(title: string, description: string): Promise<SeriesAIAnalysis>

  /**
   * Phân tích batch N series — dùng Promise.allSettled + rate-limit throttle
   */
  async analyzeBatch(
    series: Array<{ title: string; description: string }>,
    options?: { concurrency?: number; delayMs?: number }
  ): Promise<Array<SeriesAIAnalysis | null>>

  /**
   * Build prompt chuẩn hoá
   */
  private buildPrompt(title: string, description: string): string

  /**
   * Parse và validate JSON từ LLM response (Zod schema)
   */
  private parseAndValidate(raw: string): SeriesAIAnalysis
}

export const aiAnalysisService = new AIAnalysisService();
```

**Kỹ thuật quan trọng:**
- Dùng model từ env: `process.env.OPENAI_MODEL` → `gpt-5.4-mini-2026-03-17`.
- Response format: `{ response_format: { type: "json_object" } }` để đảm bảo output là valid JSON.
- Validate output bằng **Zod schema** để catch hallucination.
- Fallback: Nếu LLM trả về invalid JSON → dùng lại `buildSeriesEmbedText()` (legacy logic).

#### `server/src/scripts/sync-course-series-vectors-ai.ts`

Script nâng cấp, giữ nguyên interface nhưng thêm AI pipeline:

```typescript
// New flow:
const run = async () => {
  // 1. Connect DB
  await connectDB();
  await connectPinecone();

  // 2. Fetch series từ MongoDB
  const activeSeries = await CourseSeries.find({ isActive: true }).lean();

  // 3. AI Analysis batch (throttled)
  logger.info(`Analyzing ${activeSeries.length} series with LLM...`);
  const analyses = await aiAnalysisService.analyzeBatch(
    activeSeries.map(s => ({ title: s.title, description: s.description ?? '' })),
    { concurrency: 5, delayMs: 500 }
  );

  // 4. Merge AI results vào series data
  const enrichedSeries = activeSeries.map((series, i) => ({
    series,
    aiAnalysis: analyses[i] ?? null,
  }));

  // 5. Build enriched embed text
  const texts = enrichedSeries.map(({ series, aiAnalysis }) =>
    embeddingService.buildEnrichedEmbedText(series, aiAnalysis)
  );

  // 6. Batch embed
  const embeddings = await embeddingService.embedBatch(texts);

  // 7. Upsert vào Pinecone với enriched metadata
  const batches = chunkArray(enrichedSeries.map((e, i) => ({
    ...e,
    embedding: embeddings[i]!,
  })), UPSERT_BATCH_SIZE);

  for (const [i, batch] of batches.entries()) {
    await vectorRepo.upsertEnrichedBatch(batch);
    logger.info(`Batch ${i + 1}/${batches.length} done`);
  }
};
```

### 4.2 Sửa đổi files hiện có

#### `server/src/services/embedding.service.ts`

Thêm method mới:

```typescript
// Thêm vào EmbeddingService
buildEnrichedEmbedText(series: CourseSeriesSyncDoc, ai: SeriesAIAnalysis | null): string {
  if (!ai) return this.buildSeriesEmbedText(series); // fallback

  const parts = [
    `${series.title} (${ai.levelMin}-${ai.levelMax}).`,
    ai.summary,
    ai.topics.length ? `Chủ đề: ${ai.topics.join(', ')}.` : '',
    ai.skills.length  ? `Kỹ năng: ${ai.skills.join(', ')}.`  : '',
    ai.tags.length    ? `Tags: ${ai.tags.join(', ')}.`        : '',
  ];

  return parts.filter(Boolean).join('\n');
}
```

#### `server/src/repositories/vector/course-series.vector.repository.ts`

Thêm method upsert với enriched metadata:

```typescript
async upsertEnrichedBatch(
  items: Array<{
    series: CourseSeriesSyncDoc;
    aiAnalysis: SeriesAIAnalysis | null;
    embedding: number[];
  }>
): Promise<void>
```

---

## 5. Rate Limiting & Cost Control

| LLM | Model | Cost (input) | Latency |
|-----|-------|--------------|---------|
| OpenAI | `gpt-5.4-mini-2026-03-17` (**đang dùng** — `OPENAI_MODEL`) | ~$0.15/1M tokens | <2s |

**Chiến lược tiết kiệm chi phí:**

1. **Incremental Sync:** Thêm field `aiAnalyzedAt` vào Pinecone metadata. Khi chạy lại script, chỉ re-analyze series có `title` hoặc `description` thay đổi sau `aiAnalyzedAt`.

2. **Cache LLM output vào MongoDB:** Lưu `aiAnalysis` vào một field riêng trong `CourseSeries` model (optional, embedded doc). Lần sync sau không cần gọi LLM lại trừ khi nội dung thay đổi.

3. **Concurrency control:** Max 5 concurrent LLM calls, delay 500ms giữa các batch để tránh rate limit.

4. **Dry-run mode:** Flag `--dry-run` để xem kết quả AI analysis mà không upsert Pinecone.

---

## 6. Zod Validation Schema (AI Output Guard)

```typescript
import { z } from 'zod';

const LEVEL_OPTIONS = ['A0', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

export const SeriesAIAnalysisSchema = z.object({
  summary:  z.string().min(10).max(300),
  topics:   z.array(z.string()).min(1).max(6),
  audience: z.enum(['beginner', 'intermediate', 'advanced', 'all']),
  skills:   z.array(z.enum(['nghe', 'nói', 'đọc', 'viết'])),
  tags:     z.array(z.string()).max(8),
  levelMin: z.enum(LEVEL_OPTIONS),
  levelMax: z.enum(LEVEL_OPTIONS),
  useCase:  z.string().max(50),
});

export type SeriesAIAnalysis = z.infer<typeof SeriesAIAnalysisSchema>;
```

---

## 7. NPM Scripts

```json
// server/package.json
{
  "scripts": {
    "sync:vectors":        "tsx src/scripts/sync-course-series-vectors.ts",
    "sync:vectors:ai":     "tsx src/scripts/sync-course-series-vectors-ai.ts",
    "sync:vectors:ai:dry": "tsx src/scripts/sync-course-series-vectors-ai.ts --dry-run"
  }
}
```

---

## 8. Updated Sequence Diagram (Write Flow)

```
Admin → API → MongoDB.create(series)
                    ↓
             [fire-and-forget + queue]
                    ↓
             AIAnalysisService.analyzeCourseSeries(title, description)
                    ↓ (LLM call ~1-2s)
             gpt-5.4-mini-2026-03-17  ← env.OPENAI_MODEL
                    ↓
             SeriesAIAnalysis { summary, topics, tags, levelMin, levelMax, ... }
                    ↓
             EmbeddingService.buildEnrichedEmbedText()
                    ↓
             OpenAI text-embedding-3-small
                    ↓
             Pinecone.upsert({ id, values, metadata: { ...original + ...aiFields } })
```

> **Lưu ý:** Bước AI Analysis trong `createSeries` (write flow) nên được đẩy vào **BullMQ queue** (`vector-sync.queue.ts`) để không delay response Admin. Script batch sync thì chạy trực tiếp (sequential/throttled).

---

## 9. BullMQ Integration (Write Flow Enhancement)

### Queue: `vector-sync.queue.ts`

```typescript
// server/src/jobs/queues/vector-sync.queue.ts
export interface VectorSyncJobData {
  seriesId:    string;
  title:       string;
  description: string;
  action:      'upsert' | 'delete';
}

export const vectorSyncQueue = new Queue<VectorSyncJobData>('vector-sync', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  },
});
```

### Worker: `vector-sync.worker.ts`

```typescript
// server/src/jobs/workers/vector-sync.worker.ts
worker.process(async (job) => {
  const { seriesId, title, description, action } = job.data;

  if (action === 'delete') {
    await vectorRepo.deleteSeries(seriesId);
    return;
  }

  // 1. AI Analysis
  const aiAnalysis = await aiAnalysisService.analyzeCourseSeries(title, description);

  // 2. Embed enriched text
  const text = embeddingService.buildEnrichedEmbedText({ title, description }, aiAnalysis);
  const embedding = await embeddingService.embedText(text);

  // 3. Upsert to Pinecone
  await vectorRepo.upsertEnriched({ seriesId, embedding, aiAnalysis, ...coreMetadata });

  // 4. (Optional) Cache AI result back to MongoDB
  await CourseSeries.findByIdAndUpdate(seriesId, {
    $set: { 'aiCache.analysis': aiAnalysis, 'aiCache.analyzedAt': new Date() }
  });
});
```

---

## 10. Implementation Checklist

### Phase A — Core AI Service
- [ ] Tạo `server/src/services/ai-analysis.service.ts`
  - [ ] `analyzeCourseSeries()` dùng `env.OPENAI_MODEL` → `gpt-5.4-mini-2026-03-17`
  - [ ] Zod validation schema `SeriesAIAnalysisSchema`
  - [ ] Fallback khi LLM trả lỗi / invalid JSON
  - [ ] `analyzeBatch()` với concurrency throttle (p-limit hoặc manual)

### Phase B — Embedding & Repository
- [ ] Sửa `embedding.service.ts`: thêm `buildEnrichedEmbedText()`
- [ ] Sửa `course-series.vector.repository.ts`: thêm `upsertEnrichedBatch()`
- [ ] Sửa `CourseSeriesVectorMetadata` interface: thêm AI fields

### Phase C — Batch Sync Script
- [ ] Tạo `server/src/scripts/sync-course-series-vectors-ai.ts`
  - [ ] Đọc flag `--dry-run` từ `process.argv`
  - [ ] Incremental mode: filter series chưa có `aiCache` hoặc đã stale
  - [ ] Progress bar / summary log cuối script
- [ ] Thêm `"sync:vectors:ai"` vào `package.json`

### Phase D — BullMQ Queue (Write Flow)
- [ ] Tạo `server/src/jobs/queues/vector-sync.queue.ts`
- [ ] Tạo `server/src/jobs/workers/vector-sync.worker.ts`
- [ ] Sửa `course-series.service.ts`: thay `.then().catch()` bằng `vectorSyncQueue.add()`

### Phase E — MongoDB Model (Optional Cache)
- [ ] Thêm field `aiCache: { analysis: Object; analyzedAt: Date }` vào `CourseSeries` Mongoose schema
- [ ] Dùng field này trong script để skip re-analyze nếu không stale

### Phase F — Env & Config
- [ ] `OPENAI_API_KEY` — **đã có** trong `server/.env` ✅
- [ ] `OPENAI_MODEL=gpt-5.4-mini-2026-03-17` — **đã có** trong `server/.env` ✅, `ai-analysis.service.ts` đọc qua `env.OPENAI_MODEL`
- [ ] Thêm `AI_ANALYSIS_CONCURRENCY=5` vào `env.ts` (tunable, default 5)

---

## 11. Estimated Cost (100 Series)

| Bước | Model | Tokens ước tính | Chi phí |
|------|-------|-----------------|---------|
| AI Analysis (100 series) | `gpt-5.4-mini-2026-03-17` | ~150k tokens | ~$0.02 |
| Embedding (100 texts) | text-embedding-3-small | ~50k tokens | ~$0.001 |
| **Tổng** | | | **~$0.025** |

> **Rất rẻ.** Có thể chạy lại toàn bộ mỗi tuần để refresh AI analysis khi prompt được cải thiện.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| LLM trả về invalid JSON | Zod validation + fallback về `buildSeriesEmbedText()` |
| LLM rate limit (429) | Exponential backoff + max concurrency=5 |
| LLM hallucinate level sai | Zod enum validation: chỉ chấp nhận A0-C2 |
| Chi phí tăng cao khi nhiều series | Incremental sync + `aiCache` trong MongoDB |
| Pinecone upsert fail | Script ghi lại `failedIds[]`, log ra, exit code 1 |
| Script chạy lại bị overwrite AI data tốt | `--skip-if-cached` flag để preserve data tốt |

---

*Created: 2026-04-14 | Author: AI Agent | Status: Draft → Ready for Review*
