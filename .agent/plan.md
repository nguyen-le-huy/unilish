# Plan: Triển khai Module Recommend Khoá Học

> **Mục tiêu:** Khi user hoàn thành một trong hai luồng sau, hệ thống sẽ tự động truy vấn Pinecone để đề xuất các **Course Series** phù hợp rồi render lên component `RecommendCourse.tsx`.
>
> - **Trigger A:** User chọn ngôn ngữ → chọn mục tiêu → làm bài placement test → nhận kết quả (`currentLevel` được ghi vào DB).
> - **Trigger B:** User bỏ qua placement test và tự chọn level ở `LevelSelectionPage`.

---

## Tổng quan kiến trúc

```
[Client]
  RecommendCourse.tsx
    └── useRecommendationsQuery()       ← TanStack Query
          └── GET /api/v1/recommendations  (Bearer token)

[Server]
  recommendationRouter
    └── RecommendationController
          └── RecommendationService
                ├── UserMongoRepo      → MongoDB: lấy user profile (languageId, learningGoalId, currentLevel)
                ├── EmbeddingService   → OpenAI text-embedding-3-small: embed query text
                └── CourseSeriesVectorRepo → Pinecone: ANN search + metadata filter

[Data]
  Pinecone index: "unilish-course-series"
    vector id = series._id (string)
    values    = float[1536]
    metadata  = { languageId, learningGoalId, isActive, levelMinNum, levelMaxNum,
                  title, slug, description, thumbnailUrl, totalCourses }
```

---

## Phase 1 — Server: Pinecone Index & Write Flow

> **Mục tiêu:** Mỗi khi Admin tạo/cập nhật CourseSeries trên Admin Panel, vector tương ứng được upsert vào Pinecone index `unilish-course-series`.

### 1.1 Tạo Pinecone index thứ 2 (nếu chưa có)

- **Thông số:** Name `unilish-course-series`, Dimensions `1536`, Metric `cosine`, Region `us-east-1`.
- **Vấn đề:** `env.ts` hiện chỉ có 1 biến `PINECONE_INDEX_NAME`. Cần thêm biến riêng hoặc dùng namespace để tách.

> **Quyết định thiết kế:** Dùng **2 index riêng biệt** để tách biệt knowledge vectors vs series recommendation vectors. Thêm `PINECONE_COURSE_SERIES_INDEX_NAME` vào `env.ts`.

**File cần tạo/sửa:**

| File | Hành động |
|------|-----------|
| `server/.env` | Thêm `PINECONE_COURSE_SERIES_INDEX_NAME=unilish-course-series` |
| `server/src/config/env.ts` | Thêm field `PINECONE_COURSE_SERIES_INDEX_NAME` vào Zod schema |
| `server/src/config/database.pinecone.ts` | Thêm `getCourseSeriesIndex()` singleton riêng |

### 1.2 Vector Model cho CourseSeries

**Tạo file:** `server/src/models/vector/course-series-vector.ts`

```typescript
export interface CourseSeriesVectorMetadata {
  languageId:     string;       // ObjectId.toString()
  learningGoalId: string;       // ObjectId.toString()
  isActive:       boolean;
  levelMinNum:    number;       // A0=0, A1=1, A2=2, B1=3, B2=4, C1=5, C2=6
  levelMaxNum:    number;
  levelMin:       string;       // "A1"
  levelMax:       string;       // "B1"
  title:          string;
  slug:           string;
  description:    string;
  thumbnailUrl:   string;
  totalCourses:   number;
}
```

**Level number mapping:**
```
A0=0 | A1=1 | A2=2 | B1=3 | B2=4 | C1=5 | C2=6
```

### 1.3 CourseSeriesVectorRepository

**Tạo file:** `server/src/repositories/vector/course-series.vector.repository.ts`

Kế thừa `BaseVectorRepository<CourseSeriesVectorMetadata>` nhưng dùng **index riêng** (`getCourseSeriesIndex()`).

Key methods:
- `upsertSeries(series: ICourseSeries, embedding: number[]): Promise<void>`
- `deleteSeries(seriesId: string): Promise<void>`
- `findRecommendedSeries(filter, queryVector, topK): Promise<RecommendedSeriesMatch[]>`

Pinecone filter structure:
```json
{
  "languageId":     { "$eq": "<id>" },
  "learningGoalId": { "$eq": "<id>" },
  "isActive":       { "$eq": true },
  "levelMinNum":    { "$lte": "<userLevelNum>" },
  "levelMaxNum":    { "$gte": "<userLevelNum>" }
}
```

### 1.4 EmbeddingService

**Tạo file:** `server/src/services/embedding.service.ts`

Dùng OpenAI SDK với model `text-embedding-3-small` (1536d).

```typescript
class EmbeddingService {
  async embedText(text: string): Promise<number[]>
  async embedBatch(texts: string[]): Promise<number[][]>
  buildSeriesEmbedText(series: ICourseSeries): string
  // → "Hành Trang Tiếng Anh (A1-B1). Trọn bộ bí kíp giao tiếp..."
  buildUserQueryText(user: UserProfile): string
  // → "Học tiếng Anh trình độ A2. Mục tiêu: du lịch."
  parseLevelRange(title: string): { levelMin: string; levelMax: string; levelMinNum: number; levelMaxNum: number }
}
```

### 1.5 Hook vào CourseSeriesService (Write Flow)

**Sửa file:** `server/src/services/course-series.service.ts`

Inject `EmbeddingService` và `CourseSeriesVectorRepository` vào constructor.

- Sau `createSeries()`: gọi `upsertSeries()` → Pinecone (fire-and-forget, không block response)
- Sau `updateSeries()`: re-embed và upsert lại.
- Sau `deleteSeries()`: xoá vector khỏi Pinecone.
- `toggleSeriesStatus()`: upsert lại với `isActive` mới.

> **Lưu ý:** Dùng `.then().catch(logger.error)` — lỗi Pinecone không block MongoDB response thành công.

---

## Phase 2 — Server: Recommendation Endpoint (Read Flow)

### 2.1 RecommendationService

**Tạo file:** `server/src/services/recommendation.service.ts`

```typescript
class RecommendationService {
  async getRecommendedSeries(userId: string, topK = 6): Promise<RecommendedSeriesDto[]>
}
```

Workflow:
1. `UserRepo.findById(userId)` → lấy `{ learningLanguageId, learningGoalId, currentLevel }`.
2. Kiểm tra user đã setup đủ thông tin (language + goal + level ≠ A0). Nếu chưa → trả `[]`.
3. `buildUserQueryText()` → `embedText()` → queryVector.
4. `CourseSeriesVectorRepo.findRecommendedSeries({ languageId, learningGoalId, levelNum }, queryVector, 6)`.
5. Map Pinecone matches → `RecommendedSeriesDto[]` (sort by score DESC).

**Response DTO:**
```typescript
interface RecommendedSeriesDto {
  id:           string;
  title:        string;
  slug:         string;
  description:  string;
  thumbnailUrl: string;
  totalCourses: number;
  levelMin:     string;
  levelMax:     string;
  score:        number;   // cosine similarity score từ Pinecone
}
```

### 2.2 RecommendationController

**Tạo file:** `server/src/controllers/recommendation.controller.ts`

```
GET /api/v1/recommendations
  Headers: Authorization: Bearer <token>
  → 200 OK { data: RecommendedSeriesDto[] }
```

### 2.3 Route

**Tạo file:** `server/src/routes/recommendation.route.ts`

```typescript
router.get('/', protect, RecommendationController.getRecommendations);
```

**Sửa file:** `server/src/app.ts` — mount `recommendationRouter` tại `/api/v1/recommendations`.

### 2.4 Redis Cache

- Cache key: `recommendations:user:<userId>`
- TTL: 24 giờ (86400 seconds)
- Invalidate khi: `currentLevel`, `learningLanguageId`, hoặc `learningGoalId` thay đổi.

---

## Phase 3 — Server: Batch Sync Script (One-time)

**Tạo file:** `server/src/scripts/sync-course-series-vectors.ts`

Workflow:
1. Connect MongoDB + Pinecone.
2. `CourseSeries.find({ isActive: true })`.
3. `EmbeddingService.embedBatch(texts[])` → 1 OpenAI API call cho N series.
4. `CourseSeriesVectorRepo.upsertBatch(vectors[])` → batch 100 items/request.
5. Log kết quả.

**NPM script** (package.json): `"sync:vectors": "tsx src/scripts/sync-course-series-vectors.ts"`

---

## Phase 4 — Client: API & Hooks

### 4.1 Type Definitions

**Tạo file:** `client/src/features/dashboard/recommend-course/types/recommend-course.types.ts`

```typescript
export interface RecommendedSeriesDto {
  id:           string;
  title:        string;
  slug:         string;
  description:  string;
  thumbnailUrl: string;
  totalCourses: number;
  levelMin:     string;
  levelMax:     string;
  score:        number;
}
```

### 4.2 API caller

**Tạo file:** `client/src/features/dashboard/recommend-course/api/get-recommendations.ts`

```typescript
import axiosInstance from '@/lib/axios';
import type { RecommendedSeriesDto } from '../types/recommend-course.types';

export const getRecommendations = async (): Promise<RecommendedSeriesDto[]> => {
  const res = await axiosInstance.get('/recommendations');
  return res.data.data;
};
```

### 4.3 TanStack Query hook

**Tạo file:** `client/src/features/dashboard/recommend-course/hooks/use-recommendations-query.ts`

```typescript
export const useRecommendationsQuery = () => {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey:  ['recommendations', user?._id, user?.currentLevel],
    queryFn:   getRecommendations,
    enabled:   !!user && !!user.currentLevel && user.currentLevel !== 'A0',
    staleTime: 1000 * 60 * 30, // 30 phút
    retry:     1,
  });
};
```

> **Trigger Logic (quan trọng):**
> - Query tự **bật** khi `user.currentLevel` thay đổi từ `'A0'` sang giá trị khác.
> - Sau placement test: server trả về `currentLevel` mới → client gọi `setUser(updatedUser)` → `queryKey` thay đổi → TanStack Query tự fetch.
> - Sau tự chọn level: `LevelSelectionForm.handleContinue()` → `mutate()` → `onSuccess` → `setUser(mergedUser)` → tương tự trigger refetch.
> - **Không cần** `invalidateQueries` thủ công vì `queryKey` đã include `currentLevel`.

---

## Phase 5 — Client: Wiring RecommendCourse.tsx

**Sửa file:** `client/src/features/dashboard/recommend-course/RecommendCourse.tsx`

Thay thế hardcoded data bằng live data từ hook:

| State | UI |
|-------|----|
| `isLoading` | Skeleton cards |
| `data.length === 0` (khi enabled=false hoặc Pinecone trống) | Empty state ("Hoàn thành bài kiểm tra để nhận đề xuất") |
| `isError` | Error state |
| `data.length > 0` | Render `<CourseCard>` list |

**Props truyền vào `<CourseCard>`:**
| Prop | Nguồn |
|------|-------|
| `title` | `series.title` |
| `description` | `series.description` |
| `imageUrl` | `series.thumbnailUrl` |
| `badge` | `"${series.levelMin} → ${series.levelMax}"` |
| `totalCourses` | `series.totalCourses` |
| `href` | `PATHS.SERIES(series.slug)` |

---

## Phase 6 — Trigger Scenarios Chi Tiết

### Trigger A: Sau khi hoàn thành Placement Test

**Flow (code hiện tại + cần thêm):**
1. User submit bài test → `POST /placement-session/:id/result`.
2. Server tính toán → ghi `currentLevel` vào `User` model.
3. Client polling `usePlacementResultQuery` → nhận `status: 'ready'` + `result.level`.
4. *(Cần thêm)* Trong callback onSuccess của result query → gọi `setUser({ ...user, currentLevel: result.level })`.
5. Navigate về Home → `useRecommendationsQuery` enabled → fetch `/api/v1/recommendations`.
6. `RecommendCourse.tsx` render kết quả.

> **File cần xem xét:** Placement result page — nơi redirect sau khi có kết quả. Cần đảm bảo `setUser` được gọi với `currentLevel` mới trước khi navigate về Home.

### Trigger B: Sau khi User tự chọn level

**Flow (code đã có — không cần sửa `level-selection-form.tsx`):**
1. User chọn level card → click "Tiếp tục" → `handleContinue()`.
2. `mutate({ nativeLanguage, learningGoal, currentLevel })` → `PUT /api/v1/users/onboarding`.
3. `onSuccess(updatedUser)` → `setUser(mergedUser)` → `navigate(PATHS.DASHBOARD.HOME)`.
4. → `useRecommendationsQuery` tự kích hoạt vì `queryKey` thay đổi.

---

## File Checklist

### Server — Tạo mới
- [ ] `src/models/vector/course-series-vector.ts`
- [ ] `src/repositories/vector/course-series.vector.repository.ts`
- [ ] `src/services/embedding.service.ts`
- [ ] `src/services/recommendation.service.ts`
- [ ] `src/controllers/recommendation.controller.ts`
- [ ] `src/routes/recommendation.route.ts`
- [ ] `src/scripts/sync-course-series-vectors.ts`

### Server — Sửa đổi
- [ ] `src/config/env.ts` — thêm `PINECONE_COURSE_SERIES_INDEX_NAME`
- [ ] `src/config/database.pinecone.ts` — thêm `getCourseSeriesIndex()`
- [ ] `src/services/course-series.service.ts` — inject vector write flow
- [ ] `src/app.ts` — mount `/api/v1/recommendations`
- [ ] `.env` — sửa: `PINECONE_INDEX_NAME=unilish-knowledge`, thêm `PINECONE_COURSE_SERIES_INDEX_NAME=unilish-course-series`

### Client — Tạo mới
- [ ] `features/dashboard/recommend-course/types/recommend-course.types.ts`
- [ ] `features/dashboard/recommend-course/api/get-recommendations.ts`
- [ ] `features/dashboard/recommend-course/hooks/use-recommendations-query.ts`

### Client — Sửa đổi
- [ ] `features/dashboard/recommend-course/RecommendCourse.tsx` — dùng live data
- [ ] Placement result page — đảm bảo `setUser(currentLevel)` được gọi trước navigate

---

## Lưu ý quan trọng

> **Pinecone `.env` duplicate:** Hiện `.env` có 2 dòng `PINECONE_INDEX_NAME` trùng nhau (dòng 40 `unilish-knowledge` và dòng 41 `unilish-course-series`). Cần sửa: dòng 40 giữ nguyên `PINECONE_INDEX_NAME=unilish-knowledge`, dòng 41 đổi thành `PINECONE_COURSE_SERIES_INDEX_NAME=unilish-course-series`.

> **Write flow là async:** Pinecone upsert trong `createSeries/updateSeries` phải non-blocking. Dùng `.then().catch(logger.error)` thay vì `await` để không delay response cho Admin.

> **Cold start:** Chạy `npm run sync:vectors` một lần sau khi deploy Phase 1 để đồng bộ toàn bộ series hiện có lên Pinecone trước khi Read Flow hoạt động.

> **Fallback khi Pinecone trống:** Nếu trả về `[]`, client hiện empty state. Không để spinner vô tận.
