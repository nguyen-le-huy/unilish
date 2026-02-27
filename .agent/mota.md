# 📘 Grammar Lesson: Blog-Style Format

## Ý Tưởng Cốt Lõi

Thay vì dạy theo Stepper 3 bước (Discovery → Rules → Practice), Grammar Lesson mới được thiết kế như một **bài blog ngữ pháp** — user cuộn đọc từ trên xuống, gặp bài tập inline, rồi làm bài kiểm tra cuối. Cảm giác đọc như British Council, không như làm đề thi.

---

## 1. Data Schema Mới

```bash
ts// Lesson { type: "GRAMMAR" } — Blog Format
{
  _id: ObjectId,
  unitId: ObjectId,
  type: "GRAMMAR",
  title: "Adjectives + Prepositions: Cách dùng đúng cảm xúc & kỹ năng",
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",

  content: {

    // ① META
    level: "A2",                   // CEFR
    readingTime: 4,                // phút, tự tính từ wordCount
    conceptName: "Adjectives with Prepositions",

    // ② HERO — phần dẫn nhập (intro)
    hero: {
      hook: "Tại sao người học hay nói 'interested about' nhưng người bản xứ lại nói 'interested IN'?",
      contextSentences: [
        // Câu ngữ cảnh từ Unit — inject từ vựng đã học
        "She was excited about her flight to Singapore.",
        "I'm really bad at finding my luggage.",
      ]
    },

    // ③ BODY — mảng block, render theo thứ tự
    blocks: [

      // Block type: EXPLANATION
      {
        type: "EXPLANATION",
        heading: "Dùng AT — nói về kỹ năng & khả năng",
        body: "Dùng **at** với các tính từ như *good / bad / amazing / terrible* khi nói về kỹ năng.",
        examples: [
          { en: "He's really good at English.",        vi: "Anh ấy giỏi tiếng Anh." },
          { en: "She's amazing at the piano.",         vi: "Cô ấy chơi đàn piano tuyệt vời." },
          { en: "I'm not very good at drawing.",       vi: "Tôi không giỏi vẽ lắm." }
        ],
        // Highlight từ cần chú ý
        highlightPattern: "good at|bad at|amazing at|terrible at"
      },

      // Block type: EXPLANATION
      {
        type: "EXPLANATION",
        heading: "Dùng ABOUT — diễn tả nguyên nhân cảm xúc",
        body: "Dùng **about** với tính từ cảm xúc: *angry / excited / happy / nervous / worried*...",
        examples: [
          { en: "I'm angry about the decision.",       vi: "Tôi tức giận về quyết định đó." },
          { en: "She's excited about the new job.",    vi: "Cô ấy hào hứng với công việc mới." },
          { en: "He was nervous about the exam.",      vi: "Anh ấy lo lắng về kỳ thi." }
        ],
        highlightPattern: "angry about|excited about|nervous about|worried about"
      },

      // Block type: INLINE_QUIZ — bài tập nhúng giữa bài đọc
      {
        type: "INLINE_QUIZ",
        instruction: "Thử ngay! Chọn giới từ đúng:",
        questions: [
          {
            stem: "She was really ___ about the delay.",
            type: "MULTIPLE_CHOICE",
            options: ["nervous", "interested", "good", "married"],
            correct: "nervous",
            explanation: "'Nervous about' = lo lắng về điều gì đó."
          }
        ]
      },

      // Block type: EXPLANATION
      {
        type: "EXPLANATION",
        heading: "Dùng OF — cảm xúc mang tính nội tâm",
        body: "Dùng **of** với: *afraid / frightened / scared / proud*...",
        examples: [
          { en: "She was afraid of telling her mum.",  vi: "Cô ấy sợ nói với mẹ." },
          { en: "He's scared of flying.",              vi: "Anh ấy sợ đi máy bay." },
          { en: "You should be proud of your progress.", vi: "Bạn nên tự hào về tiến bộ của mình." }
        ],
        highlightPattern: "afraid of|scared of|proud of|frightened of"
      },

      // Block type: EXPLANATION
      {
        type: "EXPLANATION",
        heading: "Dùng TO — mối quan hệ & hành vi",
        body: "Dùng **to** để nói về sự kết nối giữa người/vật, hoặc thái độ với ai đó.",
        examples: [
          { en: "He's married to the director.",       vi: "Anh ấy kết hôn với giám đốc." },
          { en: "They were really friendly to me.",    vi: "Họ rất thân thiện với tôi." },
          { en: "It's similar to the old one.",        vi: "Cái này tương tự cái cũ." }
        ],
        highlightPattern: "married to|similar to|friendly to|addicted to"
      },

      // Block type: CALLOUT — chú thích đặc biệt
      {
        type: "CALLOUT",
        variant: "TIP",    // TIP | WARNING | EXAMPLE | UNIT_CONTEXT
        text: "💡 Mẹo: Không có quy tắc cố định cho adjective + preposition. Hãy học theo cụm từ (chunk), ví dụ: 'interested IN', 'good AT', 'afraid OF'."
      },

      // Block type: EXPLANATION
      {
        type: "EXPLANATION",
        heading: "Dùng FOR và IN",
        body: "**For**: liên quan đến lợi ích/mục đích. **In**: liên quan đến sự quan tâm/tham gia.",
        examples: [
          { en: "Exercise is good for you.",           vi: "Tập thể dục tốt cho bạn." },
          { en: "The town is famous for its cheese.",  vi: "Thị trấn nổi tiếng với phô mai." },
          { en: "She's interested in the project.",    vi: "Cô ấy quan tâm đến dự án." },
          { en: "He's experienced in design.",         vi: "Anh ấy có kinh nghiệm trong thiết kế." }
        ],
        highlightPattern: "good for|famous for|interested in|experienced in"
      },

      // Block type: UNIT_CONTEXT_BLOCK — kết nối lại với Unit đang học
      {
        type: "UNIT_CONTEXT_BLOCK",
        heading: "✈️ Áp dụng vào chủ đề Airport",
        note: "Những câu này dùng từ vựng bạn vừa học trong Unit này:",
        examples: [
          { en: "I was excited about boarding the plane.",    vi: "Tôi hào hứng khi lên máy bay." },
          { en: "She was terrible at reading the departure board.", vi: "Cô ấy không giỏi đọc bảng khởi hành." },
          { en: "He was angry about losing his luggage.",     vi: "Anh ấy tức giận vì mất hành lý." }
        ]
      }
    ],

    // ④ SUMMARY TABLE — bảng tổng kết cuối bài
    summaryTable: {
      columns: ["Giới từ", "Dùng khi nào", "Ví dụ"],
      rows: [
        ["AT",    "Kỹ năng & khả năng",          "good at, bad at, amazing at"],
        ["ABOUT", "Nguyên nhân cảm xúc",          "excited about, nervous about"],
        ["OF",    "Cảm xúc nội tâm / nỗi sợ",    "afraid of, scared of, proud of"],
        ["TO",    "Kết nối & thái độ với người khác", "married to, friendly to, similar to"],
        ["FOR",   "Lợi ích / Nổi tiếng về",       "good for, famous for, responsible for"],
        ["IN",    "Quan tâm / Tham gia",           "interested in, experienced in"]
      ]
    }
  },

  // ⑤ BÀI TẬP CUỐI (Final Practice)
  practiceConfig: {
    mode: "FIXED",
    passingScore: 80,
    questionIds: [ObjectId("q1"), ..., ObjectId("q10")]
  },

  taughtConcepts: [ObjectId("concept_adj_preposition_id")]
}
```

---

## 2. Các Block Types – Bảng Tham Chiếu

| `type` | Mô tả | Render |
| --- | --- | --- |
| `EXPLANATION` | Khối lý thuyết có ví dụ | Heading + body text + example cards có highlight |
| `INLINE_QUIZ` | Bài tập nhỏ nhúng giữa bài đọc | 1–3 câu trắc nghiệm / điền từ, có feedback ngay |
| `CALLOUT` | Hộp chú thích màu sắc | Box viền màu (TIP=xanh, WARNING=vàng) |
| `UNIT_CONTEXT_BLOCK` | Ví dụ bám sát chủ đề Unit | Card riêng biệt có icon của Unit topic |
| `SUMMARY_TABLE` | Bảng tổng kết cuối bài | Table dạng sticky trên màn hình khi làm bài tập |

---

---

## 3. Bài Tập Cuối (Final Practice – 3 Loại)

Sau khi đọc xong bài blog, user nhấn **Bắt đầu luyện tập** → màn hình chuyển sang quiz mode.

## Loại 1 – Multiple Choice (Chọn giới từ đúng)

`json{
  "type": "MULTIPLE_CHOICE",
  "stem": "I'm really good ___ playing chess.",
  "options": ["at", "about", "of", "to"],
  "correct": "at",
  "explanation": "Dùng 'at' khi nói về kỹ năng. 'Good at playing chess' = giỏi chơi cờ."
}`

## Loại 2 – Fill in the Blank (Điền giới từ)

`json{
  "type": "FILL_IN_BLANK",
  "stem": "She was afraid ___ losing her passport at the airport.",
  "correct": "of",
  "acceptedAnswers": ["of"],
  "explanation": "'Afraid of' = sợ điều gì đó. Đây là cảm xúc nội tâm, dùng 'of'."
}`

## Loại 3 – Error Correction (Sửa lỗi)

`json{
  "type": "ERROR_CORRECTION",
  "stem": "He was really excited about his new job.",
  "errorWord": null,        // null = câu đúng, user chọn "No error"
  "isCorrect": true,
  "explanation": "Câu này hoàn toàn đúng! 'Excited about' là cụm chuẩn."
}
// ---
{
  "type": "ERROR_CORRECTION",
  "stem": "I'm interested about learning grammar.",
  "errorWord": "about",
  "correction": "in",
  "explanation": "'Interested in' — không phải 'interested about'. Dùng 'in' để nói về chủ đề quan tâm."
}`

---

## 5. AI Generation Workflow (Admin)

Quy trình tạo bài tự động từ một Concept ngữ pháp:[[docs.google](https://docs.google.com/document/d/1e-b2wyRUTX4HgJ445d1ksjFnlo5HYYvihEZoC655Lmk/edit?usp=drivesdk)]

`textAdmin chọn: Unit "Airport" + Concept "Adjectives + Prepositions"
                    │
                    ▼
        [Context Extraction]
         Unit vocab: luggage, delay, boarding pass, check-in
         Grammar target: Adjectives + Prepositions
                    │
                    ▼
        [AI Prompt → GPT-4o]
        ┌─────────────────────────────────────────────────────┐
        │ "Viết bài blog ngữ pháp A2 về Adjectives with      │
        │  Prepositions. Cấu trúc: [EXPLANATION blocks] +    │
        │  [INLINE_QUIZ] + [CALLOUT] + [SUMMARY_TABLE].      │
        │  BẮT BUỘC: dùng ít nhất 3 từ trong vocab list      │
        │  [luggage, delay, boarding pass] trong ví dụ.      │
        │  Thêm UNIT_CONTEXT_BLOCK riêng về Airport.         │
        │  Sinh 10 câu hỏi luyện tập (mix 3 loại).           │
        │  Trả về JSON theo GrammarBlogLessonSchema."         │
        └─────────────────────────────────────────────────────┘
                    │
                    ▼
        [Validation]
         ✓ blocks[] đủ ít nhất 4 EXPLANATION
         ✓ ít nhất 1 INLINE_QUIZ
         ✓ ít nhất 1 UNIT_CONTEXT_BLOCK
         ✓ Vocab Unit xuất hiện trong examples
         ✓ 10 questions hợp lệ
                    │
                    ▼
        [Save Lesson + Questions → MongoDB]
        taughtConcepts → [concept_adj_prep_id]`

---

## 6. So Sánh Format Cũ vs Mới

| Tiêu chí | Format cũ (Stepper) | Format mới (Blog) |
| --- | --- | --- |
| **Cảm giác** | Làm bài kiểm tra | Đọc bài học thú vị |
| **Cấu trúc** | 3 bước tuyến tính cứng | Cuộn tự do, blocks linh hoạt |
| **Bài tập** | Tách riêng cuối bài | Inline quiz xen giữa + final practice |
| **Tóm tắt** | Không có | Summary table sticky sidebar |
| **Liên kết Unit** | Inject vào story duy nhất | Block riêng `UNIT_CONTEXT_BLOCK` |
| **Khả năng mở rộng** | Cứng với 3 loại bước | Thêm block type mới dễ dàng |
| **Tham chiếu** | Nội bộ | British Council style |

---

## 7. Admin Editor – Giao Diện Quản Lý

Admin quản lý Grammar Blog Lesson qua **Block Editor** (tương tự Notion):[[docs.google](https://docs.google.com/document/d/1e-b2wyRUTX4HgJ445d1ksjFnlo5HYYvihEZoC655Lmk/edit?usp=drivesdk)]

`text┌─────────────────────────────────────────────────────────────────┐
│  [← Back]  Grammar: Adj + Prepositions  [Draft] [Publish]      │
├──────────────────────┬──────────────────────────────────────────┤
│  BLOCK LIST (Left)   │  BLOCK EDITOR (Center)                  │
│                      │                                          │
│  ① Hero              │  Đang chỉnh: Block #3 – EXPLANATION     │
│  ② Explanation (AT)  │  ─────────────────────────────────────  │
│  ③ Explanation (ABOUT│  Heading: [Dùng ABOUT — cảm xúc     ]   │
│  ④ Inline Quiz  🎯   │                                          │
│  ⑤ Explanation (OF)  │  Body (Markdown):                       │
│  ⑥ Explanation (TO)  │  ┌──────────────────────────────────┐  │
│  ⑦ Callout 💡        │  │ Dùng **about** với tính từ cảm    │  │
│  ⑧ Explanation (FOR) │  │ xúc: angry / excited / happy...   │  │
│  ⑨ Unit Context ✈️   │  └──────────────────────────────────┘  │
│  ⑩ Summary Table     │                                          │
│                      │  Examples: [+ Add Example]              │
│  ─────────────────   │  ┌────────────────────────┬──────────┐  │
│  [+ Add Block ▾]     │  │ I'm angry about the... │ Tôi tức..│  │
│   EXPLANATION        │  │ She's excited about... │ Cô ấy... │  │
│   INLINE_QUIZ        │  └────────────────────────┴──────────┘  │
│   CALLOUT            │                                          │
│   UNIT_CONTEXT       │  Highlight pattern:                     │
│   SUMMARY_TABLE      │  [angry about|excited about|nervous ab] │
└──────────────────────┴──────────────────────────────────────────┘`

Block list hỗ trợ **kéo-thả reorder** (drag handle ⠿ bên trái mỗi block). Mỗi block có nút **Duplicate** và **Delete**. Admin có thể nhấn **▶ Preview** để xem bài blog đúng như học viên thấy.[[docs.google](https://docs.google.com/document/d/1e-b2wyRUTX4HgJ445d1ksjFnlo5HYYvihEZoC655Lmk/edit?usp=drivesdk)]