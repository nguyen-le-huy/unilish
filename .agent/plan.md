# Kế Hoạch Triển Khai UI — Placement Test: Phần Nghe & Đọc TOEIC

> **Phạm vi:** UI-only.
> **Ưu tiên:** Trang thi **Nghe & Đọc TOEIC** (7 Part) — bắt đầu từ **Part 1**.
> **App:** `/client` — CSS Modules + GSAP, tuyệt đối không dùng Tailwind.
> **Chuẩn:** Feature-First, lazy-loaded routes, strict TypeScript, không `any`.

---

## 1. Tổng Quan Luồng Người Dùng

```
[LevelSelectionPage]
       │  click "Làm bài kiểm tra đầu vào"
       ▼
[PlacementTestIntroModal]       ← Modal giới thiệu (đã done ✓)
       │  click "Bắt đầu"
       ▼
[ToeicListeningReadingPage]     ← ĐÂY LÀ TRỌNG TÂM CỦA PLAN NÀY
       │                          7 Part | 120 phút | ~100 câu
       │  nộp bài / hết giờ
       ▼
[IeltsWritingPage]              ← Giai đoạn sau
       │
       ▼
[IeltsSpeakingPage]             ← Giai đoạn sau
       │
       ▼
[PlacementTestResultPage]       ← Giai đoạn sau
```

---

## 2. Thiết Kế Giao Diện — Trang Nghe & Đọc

### 2.1 Layout Tổng Thể

Trang thi là **full-screen**, **KHÔNG** dùng `DashboardLayout`. Có 3 layer:

```
┌──────────────────────────────────────────────────────────────────────┐
│ HEADER (fixed, height: 56px)                                         │
│  [Unilish Logo]  |  Bài thi đầu vào - Phần Kỹ Năng Nghe & Đọc  [Thoát]  |  [Upgrade to Pro] [🔔] [Avatar] │
├──────────────────────────────────────────────────────────────────────┤
│ PART TABS (sticky dưới header)                                       │
│  [Part 1●] [Part 2] [Part 3] [Part 4] [Part 5] [Part 6] [Part 7]   │
├────────────────────────────────────────────┬─────────────────────────┤
│                                            │ SIDEBAR (sticky)        │
│  CONTENT AREA (scrollable)                 │                         │
│                                            │  Thời gian còn lại:     │
│  ┌─────────────────────────────────────┐   │  120:00                 │
│  │ AUDIO PLAYER (sticky dưới part tabs)│   │                         │
│  └─────────────────────────────────────┘   │  [Nộp bài]  ← xanh lá │
│                                            │                         │
│  [Questions — thay đổi theo Part]          │  Part 1                 │
│                                            │  [1][2][3][4]           │
│                                            │  [5][6]                 │
│     [Tiếp tục Part X]  ← góc phải dưới   │                         │
│                                            │  Part 2                 │
│                                            │  [1][2][3]...           │
└────────────────────────────────────────────┴─────────────────────────┘
```

**Tỉ lệ cột:**
- Content area: `calc(100% - 240px)` 
- Sidebar: `240px`, `position: sticky`, `top: 56px` (dưới header), `height: calc(100vh - 56px)`, `overflow-y: auto`

---

### 2.2 Header Bar

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Logo]     Bài thi đầu vào – Phần Kỹ Năng Nghe & Đọc   [Thoát]   [Upgrade to Pro] [🔔] [👤] │
└──────────────────────────────────────────────────────────────────────┘
```

**Chi tiết:**
- Logo: nhỏ hơn marketing, 24px height
- Title: `font-weight: 500`, `font-size: 14px`, `color: #333`
- Nút **Thoát**: outline, nhỏ, navigate về `PATHS.DASHBOARD.LEVEL_SELECTION` (sau khi confirm)
- "Upgrade to Pro": ghost button, icon ⚡
- Border-bottom: `1px solid var(--grey)`
- Background: `white`

---

### 2.3 Part Tabs

```
  [Part 1●]  [Part 2]  [Part 3]  [Part 4]  [Part 5]  [Part 6]  [Part 7]
```

**Behavior quan trọng (theo annotation):**
- Khi bấm đổi Part → **audio thay đổi theo** (load audio track của part đó)
- Khi bấm đổi Part → **nội dung câu hỏi thay đổi theo**
- Part đang active: `background: #1a1a1a; color: white; border-radius: 8px`
- Part chưa chọn: `background: white; color: #333; border: 1px solid var(--grey)`
- `position: sticky`, `top: 56px` (dưới header)

**Part Information Table:**

| Part | Kỹ năng | Loại câu hỏi | Số câu | Mô tả |
|------|---------|-------------|--------|-------|
| 1 | Listening | Photo Description | 6 | Xem 1 ảnh, nghe 4 câu mô tả, chọn câu đúng |
| 2 | Listening | Question Response | 25 | Nghe câu hỏi + 3 câu trả lời, chọn 1 |
| 3 | Listening | Conversation | 39 | Nghe đoạn hội thoại, trả lời 3 câu/nhóm |
| 4 | Listening | Short Talk | 30 | Nghe bài phát biểu ngắn, trả lời 3 câu/nhóm |
| 5 | Reading | Incomplete Sentence | 30 | Điền từ vào chỗ trống trong câu |
| 6 | Reading | Text Completion | 16 | Điền từ vào đoạn văn |
| 7 | Reading | Reading Comprehension | 54 | Đọc passage, trả lời câu hỏi |

> **Lưu ý:** Đây là bài kiểm tra đầu vào, số câu có thể ít hơn TOEIC thật. Mock data dùng số câu rút gọn.

---

### 2.4 Audio Player

Nằm trong **Content Area**, sticky dưới Part Tabs khi scroll.

```
  [▶]  ─────────────────●─────────────  02:14 / 05:30  [🔊─────]
```

**Spec:**
- Nút play/pause: hình tròn 36px, `background: var(--dark-green)`
- Progress bar: không cho seek — dùng `pointer-events: none` trên thanh seek (Part 1–4 nghe 1 lần)
- Thời gian: `[elapsed] / [total]`
- Volume control: slider nhỏ bên phải
- Khi đổi Part → audio src thay đổi, auto play
- Khi audio kết thúc → badge "✓ Đã phát xong" (màu xanh lá nhạt)

---

### 2.5 Question Content — Part 1 (Photo Description)

**Đây là phần ưu tiên triển khai đầu tiên.**

**Layout 1 câu hỏi Part 1:**

```
┌─────────────────────────────────────────────────────────┐
│  Question 1  [🚩]                                       │
│                                                         │
│  ┌──────────────────────┐   ○ A.  [text mô tả A]       │
│  │                      │                              │
│  │   [Ảnh B&W]          │   ○ B.  [text mô tả B]       │
│  │   ~280×200px         │                              │
│  │                      │   ○ C.  [text mô tả C]       │
│  └──────────────────────┘                              │
│                          ● D.  [text mô tả D]  ←selected│
│                               (highlighted row)         │
├─────────────────────────────────────────────────────────┤
│  Question 2  [🚩]                                       │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Chi tiết MCQ Option:**
- Radio button native ẩn (`display: none`), thay bằng custom circle
- Unselected: circle outline `var(--grey)`, row background transparent
- Selected: circle filled `var(--dark-green)`, **toàn bộ row** có background `var(--light-grey)`, text bold
- Hover: row background `#f9f9f9`
- Label: `A.` `B.` `C.` `D.` — chữ màu `var(--dark-grey)`

**Flag Button (🚩):**
- Icon mờ khi chưa đánh dấu, icon đỏ khi đã đánh dấu
- Toggle trạng thái `flagged` trong question state

**Phần cuối content (dưới câu hỏi cuối cùng của Part):**

```
                              ┌────────────────────────────┐
                              │  Tiếp tục Part 2  →       │
                              └────────────────────────────┘
```
- Button `border-radius: 24px`, `background: #1a1a1a`, `color: white`
- Căn phải, click → chuyển sang tab Part 2

---

### 2.6 Sidebar (Sticky)

```
┌─────────────────────┐
│  Thời gian còn lại: │
│  120:00             │  ← bold, size lớn
│                     │
│  ┌───────────────┐  │
│  │   Nộp bài     │  │  ← background: var(--dark-green), white text
│  └───────────────┘  │
│                     │
│  Part 1             │  ← small label, bold
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐  │
│  │1│ │2│ │3│ │4│  │
│  └─┘ └─┘ └─┘ └─┘  │
│  ┌─┐ ┌─┐          │
│  │5│ │6│          │
│  └─┘ └─┘          │
│                     │
│  Part 2             │
│  ┌─┐ ┌─┐ ┌─┐ ┌─┐  │
│  │1│ │2│ ...       │
└─────────────────────┘
```

**Question Box States:**
| State | Style |
|-------|-------|
| `unanswered` | Border: `1px solid var(--grey)`, bg: white |
| `answered` | Bg: `var(--dark-green)`, color: white |
| `flagged` | Bg: `#F59E0B`, color: white |
| `current` | Border: `2px solid var(--brand-blue-strong)` |

**Timer:**
- Format: `MM:SS` (e.g. `120:00` → `60:00` → `00:00`)
- Khi còn < 5 phút: màu đỏ `#EF4444`, pulse animation nhẹ

---

## 3. Cấu Trúc Thư Mục

```
client/src/features/dashboard/placement-test/
│
├── index.ts
│
├── pages/
│   └── toeic-listening-reading-page/         ← MỘT page cho cả 7 Part
│       ├── toeic-listening-reading-page.tsx
│       └── toeic-listening-reading-page.module.css
│
└── components/
    │
    ├── test-header/                           ← Header fullscreen
    │   ├── test-header.tsx
    │   └── test-header.module.css
    │
    ├── part-tab-bar/                          ← 7 Part tabs
    │   ├── part-tab-bar.tsx
    │   └── part-tab-bar.module.css
    │
    ├── audio-player/                          ← Player (không seek)
    │   ├── audio-player.tsx
    │   └── audio-player.module.css
    │
    ├── question-navigator/                    ← Sidebar grid
    │   ├── question-navigator.tsx
    │   └── question-navigator.module.css
    │
    ├── countdown-timer/                       ← Timer MM:SS
    │   ├── countdown-timer.tsx
    │   └── countdown-timer.module.css
    │
    ├── question-types/
    │   │
    │   ├── photo-description/                 ← Part 1 ★ TRIỂN KHAI ĐẦU
    │   │   ├── photo-description.tsx
    │   │   └── photo-description.module.css
    │   │
    │   ├── question-response/                 ← Part 2
    │   │   ├── question-response.tsx
    │   │   └── question-response.module.css
    │   │
    │   ├── conversation-group/                ← Part 3
    │   │   ├── conversation-group.tsx
    │   │   └── conversation-group.module.css
    │   │
    │   ├── short-talk-group/                  ← Part 4
    │   │   ├── short-talk-group.tsx
    │   │   └── short-talk-group.module.css
    │   │
    │   ├── incomplete-sentence/               ← Part 5
    │   │   ├── incomplete-sentence.tsx
    │   │   └── incomplete-sentence.module.css
    │   │
    │   ├── text-completion/                   ← Part 6
    │   │   ├── text-completion.tsx
    │   │   └── text-completion.module.css
    │   │
    │   └── reading-comprehension/             ← Part 7
    │       ├── reading-comprehension.tsx
    │       └── reading-comprehension.module.css
    │
    └── mcq-option/                            ← Shared MCQ button dùng lại
        ├── mcq-option.tsx
        └── mcq-option.module.css
```

---

## 4. TypeScript Types

### `types/question.types.ts`

```typescript
export type ToeicPart = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MCQLabel = 'A' | 'B' | 'C' | 'D';
export type QuestionStatus = 'unanswered' | 'answered' | 'flagged';

export interface MCQOption {
  label: MCQLabel;
  text: string;
}

export interface BaseQuestion {
  id: string;
  part: ToeicPart;
  questionNumber: number;    // số thứ tự toàn bài, ví dụ Part 2 bắt đầu từ 7
  partQuestionNumber: number; // số thứ tự trong part (luôn bắt đầu từ 1)
  status: QuestionStatus;
  selectedAnswer: MCQLabel | null;
}

// Part 1: Mỗi câu hỏi có 1 ảnh + 4 MCQ
export interface PhotoDescriptionQuestion extends BaseQuestion {
  part: 1;
  imageUrl: string;           // URL ảnh
  options: [MCQOption, MCQOption, MCQOption, MCQOption]; // luôn 4 option
}

// Part 2: Nghe câu hỏi, chọn 1 trong 3 câu trả lời
export interface QuestionResponseQuestion extends BaseQuestion {
  part: 2;
  options: [MCQOption, MCQOption, MCQOption]; // 3 option (A/B/C)
}

// Part 3 & 4: Nhóm câu hỏi cho 1 đoạn audio
export interface QuestionGroup extends BaseQuestion {
  part: 3 | 4;
  groupId: string;            // ID nhóm (1 nhóm có 3 câu)
  transcript?: string;        // (optional) hiển thị sau khi nộp bài
  options: [MCQOption, MCQOption, MCQOption, MCQOption];
}

// Part 5: Điền từ vào câu
export interface IncompleteSentenceQuestion extends BaseQuestion {
  part: 5;
  sentenceBefore: string;     // phần câu trước chỗ trống
  sentenceAfter: string;      // phần câu sau chỗ trống
  options: [MCQOption, MCQOption, MCQOption, MCQOption];
}

// Part 6: Điền từ vào đoạn văn
export interface TextCompletionQuestion extends BaseQuestion {
  part: 6;
  passageId: string;          // nhóm theo passage
  blankIndex: number;         // vị trí blank trong passage (0-based)
  options: [MCQOption, MCQOption, MCQOption, MCQOption];
}

// Part 7: Đọc passage + trả lời
export interface ReadingComprehensionQuestion extends BaseQuestion {
  part: 7;
  passageId: string;
  options: [MCQOption, MCQOption, MCQOption, MCQOption];
}

export type AnyQuestion =
  | PhotoDescriptionQuestion
  | QuestionResponseQuestion
  | QuestionGroup
  | IncompleteSentenceQuestion
  | TextCompletionQuestion
  | ReadingComprehensionQuestion;
```

### `types/test-session.types.ts`

```typescript
import type { AnyQuestion, ToeicPart } from './question.types';

// Audio track của từng Part
export interface PartAudioTrack {
  part: ToeicPart;
  src: string;          // URL audio file
  durationSeconds: number;
}

// Trạng thái UI của trang thi (Zustand store shape)
export interface ToeicTestUIState {
  activePart: ToeicPart;
  answers: Record<string, string | null>;   // questionId → MCQLabel | null
  flaggedIds: Set<string>;
  timeRemainingSeconds: number;
  isTimerRunning: boolean;
  audioElapsed: Record<ToeicPart, number>;  // thời gian audio đã phát của từng part
  audioFinished: Record<ToeicPart, boolean>;
}

// Mock data shape cho 1 Part
export interface PartData {
  part: ToeicPart;
  audioTrack: PartAudioTrack;
  questions: AnyQuestion[];
}
```

---

## 5. CSS Variables Cần Bổ Sung

Thêm vào `client/src/assets/styles/_variables.css`:

```css
:root {
  /* === Placement Test Layout === */
  --pt-header-height: 56px;
  --pt-tabs-height: 48px;
  --pt-sidebar-width: 240px;
  --pt-content-max-width: 860px;

  /* === Question Status Colors === */
  --q-answered-bg:   var(--dark-green);
  --q-flagged-bg:    #F59E0B;
  --q-active-border: var(--brand-blue-strong);
  --q-unanswered-border: var(--grey);

  /* === Timer === */
  --timer-warning-color: #EF4444;
}
```

---

## 6. Mock Data — Part 1

Tạo file `client/src/features/dashboard/placement-test/data/mock-part1.ts` để dev UI mà không cần API:

```typescript
import type { PhotoDescriptionQuestion } from '../types/question.types';

export const MOCK_PART1_QUESTIONS: PhotoDescriptionQuestion[] = [
  {
    id: 'q-p1-1',
    part: 1,
    questionNumber: 1,
    partQuestionNumber: 1,
    status: 'unanswered',
    selectedAnswer: null,
    imageUrl: '/mock/part1-photo-1.jpg',
    options: [
      { label: 'A', text: 'A woman is trying on a dress.' },
      { label: 'B', text: 'A woman is looking at some clothes.' },
      { label: 'C', text: 'A woman is folding some shirts.' },
      { label: 'D', text: 'A woman is paying for her purchase.' },
    ],
  },
  // ... 5 câu còn lại tương tự
];

export const MOCK_PART1_AUDIO: PartAudioTrack = {
  part: 1,
  src: '/mock/part1-audio.mp3',
  durationSeconds: 330,
};
```

---

## 7. Thứ Tự Triển Khai

> Bắt đầu từ Part 1. Mỗi bước hoàn chỉnh trước khi sang bước tiếp.

### Giai đoạn 1 — Setup
1. **Types** — tạo `question.types.ts`, `test-session.types.ts`
2. **CSS Variables** — bổ sung vào `_variables.css`
3. **Mock Data** — tạo `data/mock-part1.ts`
4. **Paths** — đã done ✓ (`PATHS.DASHBOARD.PLACEMENT_TEST`)

### Giai đoạn 2 — Shared Components (không phụ thuộc nhau)
5. **`<McqOption />`** — component dùng lại trong tất cả part
   - Props: `label`, `text`, `isSelected`, `onSelect`
   - Toàn bộ row highlight khi selected
6. **`<CountdownTimer />`** — hiển thị `MM:SS`, đổi màu đỏ khi < 5 phút
7. **`<QuestionNavigator />`** — nhận mảng questions, render grid theo Part label
8. **`<TestHeader />`** — logo + title + nút Thoát + Upgrade Pro + bell + avatar
9. **`<PartTabBar />`** — 7 tab, active tab được highlight đen
10. **`<AudioPlayer />`** — progress bar không seek, play/pause, duration

### Giai đoạn 3 — Part 1 (Photo Description) ★ MILESTONE ĐẦU TIÊN
11. **`<PhotoDescription />`** — layout 2 cột: ảnh trái + MCQ phải, có flag button
12. **`<ToeicListeningReadingPage />`** — ghép toàn bộ: TestHeader + PartTabBar + AudioPlayer + content + Sidebar
    - `activePart` state điều khiển: audio src + loại câu hỏi render
    - Sidebar sticky
    - Nút "Tiếp tục Part X" cuối mỗi part

### Giai đoạn 4 — Các Part còn lại (Listening)
13. **`<QuestionResponse />`** — Part 2: 3 MCQ (A/B/C)
14. **`<ConversationGroup />`** — Part 3: badge nhóm + 3 câu hỏi
15. **`<ShortTalkGroup />`** — Part 4: tương tự Part 3

### Giai đoạn 5 — Reading Parts
16. **`<IncompleteSentence />`** — Part 5: câu + blank + 4 MCQ
17. **`<TextCompletion />`** — Part 6: passage + highlight blank
18. **`<ReadingComprehension />`** — Part 7: split panel passage | câu hỏi

### Giai đoạn 6 — Router Integration
19. Cập nhật `router.tsx` — thêm route `PATHS.DASHBOARD.PLACEMENT_TEST.LISTENING` lazy-loaded
20. Wire routing từ `PlacementTestIntroModal` → navigate khi bấm "Bắt đầu"

---

## 8. Checklist Kiến Trúc

- [ ] Không dùng Tailwind, không dùng UI library — CSS Modules only
- [ ] Mọi component có `interface Props` tường minh, không `any`
- [ ] CSS class dùng `camelCase` (`.questionCard`, `.isSelected`, `.isFlagged`)
- [ ] Màu sắc dùng CSS Variables, không hardcode hex trực tiếp trong JSX
- [ ] GSAP dùng `useGSAP` từ `@gsap/react` (scoped cleanup)
- [ ] Page lazy-loaded qua `React.lazy`
- [ ] Trang thi full-screen, bypass `DashboardLayout`
- [ ] Sidebar `position: sticky`, tự scroll độc lập
- [ ] Audio player block seek để tránh gian lận
- [ ] Tất cả interactive elements có `aria-label`
- [ ] Dùng mock data — không gọi API ở phase UI

---

