## UNILISH – NỀN TẢNG HỌC TẬP NGOẠI NGỮ THÍCH ỨNG BẰNG AI

## 1. TẦM NHÌN & GIÁ TRỊ CỐT LÕI

UniLish là **Hệ sinh thái học tập thích ứng thông minh (AI-Powered Adaptive Learning Ecosystem)** giải quyết bài toán "học một cách cho tất cả" trong giáo dục ngoại ngữ. Nền tảng kết hợp AI, Vector Embeddings và Spaced Repetition để xây dựng lộ trình học tập được "may đo" cho từng cá nhân dựa trên mục tiêu (Business, Academic, Travel,…) và năng lực thực tế.

**Giá trị cốt lõi:** Hệ thống phát hiện "điểm mù" kiến thức của người học và tự động tái cấu trúc lộ trình để lấp đầy knowledge gaps, đảm bảo 6 kỹ năng (Vocabulary → Reading → Grammar → Listening → Speaking → Writing) được phát triển đồng bộ và liên kết chặt chẽ.

---

## 2. CÔNG NGHỆ NỀN TẢNG: AI ADAPTIVE ENGINE

## Dynamic Learning Path (Lộ trình động)

Thay vì danh sách bài học cố định, UniLish sử dụng **MongoDB + Pinecone Vector Database** để xây dựng "bản đồ kiến thức" (Knowledge Map). Khi AI phát hiện người học yếu kỹ năng "Past Tense”, hệ thống tự động ưu tiên đẩy cảnh báo cần ôn tập các bài học liên quan lên đầu roadmap, hoãn các bài mới cho đến khi nền tảng vững chắc.

**Cơ chế hoạt động:**

- **Real-time Assessment:** Mỗi quiz/bài tập được AI phân tích để phát hiện weak concepts
- **Automated Remediation:** Hệ thống tự tạo "hàng đợi ôn tập" (Remedial Queue) với priority scoring
- **Adaptive Pacing:** Tốc độ học tự động điều chỉnh theo mastery level của từng người

## Contextual Personalization (Cá nhân hóa ngữ cảnh)

AI phân tích hồ sơ người học (nghề nghiệp, sở thích, mục tiêu) để gợi ý nội dung có ngữ cảnh phù hợp. **Ví dụ thực tế:**

- **Software Engineer:** Học vocabulary qua tin tức công nghệ (TechCrunch, Wired), case studies về Agile/DevOps
- **Tour Guide:** Học qua hội thoại thực tế tại sân bay, khách sạn, nhà hàng
- **Business Professional:** Học qua email templates, meeting scripts, negotiation scenarios

---

## 3. TÍNH NĂNG CHÍNH

## A. Personalized Learning Experience

**Placement Test 2.0 – Phân tích năng lực toàn diện**

Kết hợp hai phương pháp đánh giá bổ trợ:

1. **TOEIC-Standard Test (Input Skills):** Đo khả năng Listening + Reading theo chuẩn quốc tế
2. **AI Interview (Output Skills):** OpenAI Realtime API đánh giá Speaking + Writing qua cuộc trò chuyện thực với độ trễ <500ms

**Output:** Profile năng lực 4D (Listening/Reading/Speaking/Writing) + Recommended starting level + Priority weak

**Adaptive Learning Roadmap**

- **Knowledge Gap Detection:** AI tự động phát hiện "lỗ hổng" sau mỗi Unit Quiz, mapping từng câu sai về bài học cụ thể
- **Spaced Repetition Engine:** Lên lịch ôn tập tối ưu dựa trên Ebbinghaus forgetting curve
- **Progress Visualization:** Dashboard realtime hiển thị mastered concepts vs weak areas với heatmap.

---

## B. Smart Content & Interaction

**Learn with News – Nội dung sống, cập nhật liên tục**

Hệ thống n8n workflow tự động:

1. **Scrape:** Thu thập tin tức từ CNN, BBC, Reuters mỗi 4 giờ
2. **Filter:** AI chọn bài phù hợp với từng CEFR level (A1-C2)
3. **Transform:** GPT-5.2 chuyển đổi thành bài học tương tác (vocab highlights, comprehension quiz, discussion prompts)
4. **Personalize:** Gợi ý bài theo user interests (tech, sports, culture...)

**Lợi ích:** Học ngôn ngữ qua nội dung thời sự thực tế, tăng 40% engagement so với textbook truyền thống.

**Real-time AI Speaking Coach**

Trợ lý ảo 1:1 với khả năng:

- **Context Memory:** Nhớ lịch sử lỗi phát âm, ngữ pháp của từng user
- **Adaptive Correction:** Ưu tiên sửa lỗi quan trọng nhất (pronunciation > grammar > vocabulary)
- **Azure AI Speech Integration:** Chấm điểm phát âm từng phoneme, đánh giá prosody (ngữ điệu, stress, intonation)
- **Scenario-based Practice:** Mô phỏng tình huống thực tế (job interview, restaurant ordering, doctor appointment)

---

## C. Gamification & Community

**Youtube Gap-Fill Challenge**

Cá nhân hóa bài tập nghe dựa trên video Youtube user yêu thích:

1. User chọn topic (gaming, cooking, tech reviews...)
2. AI auto-generate transcript với blanks ở từ vựng/grammar focus
3. Adaptive difficulty: Blank rate tăng dần theo progress (10% → 30%)

**Live Connect P2P – Ghép cặp học tập thông minh**

Thuật toán matching dựa trên:

- CEFR level tương đồng (±1 level)
- Shared interests (3+ overlapping topics)
- Complementary weak areas (A yếu Speaking, B yếu Listening → match để practice conversation)

**Competitive Exams – Kỳ thi xếp hạng định kỳ**

Weekly challenge với leaderboard realtime, tặng badges/certificates cho top performers để kích thích động lực cạnh tranh lành mạnh.

---

## D. Intelligent Utilities

**Uni-Assistant – RAG Chatbot**

Trợ lý học tập 24/7 với khả năng:

- **Contextual Q&A:** Trả lời thắc mắc dựa trên bài học user đang học (powered by Pinecone vector search)
- **Data Export:** Xuất vocabulary đã học, mẫu câu đã lưu ra Excel/CSV/Anki deck
- **Learning Tips:** Gợi ý phương pháp học tập cá nhân hóa dựa trên learning style

---

## 4. KIẾN TRÚC KỸ THUẬT

## Core Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **AI Engine** | OpenAI Realtime Mini, GPT-5.2 | Speaking evaluation, content generation |
| **Speech AI** | Azure AI Speech | Pronunciation scoring, prosody analysis |
| **Vector Database** | Pinecone Serverless | Semantic search, knowledge mapping |
| **Primary Database** | MongoDB Atlas | User data, course content, progress tracking |
| **Automation** | n8n Workflow | Content pipeline, scheduled tasks |
| **Analytics** | Custom + Mixpanel | Learning analytics, user behavior |

**Architecture Highlights:**

- **Hybrid Data Model:** MongoDB (structured data) + Pinecone (semantic search)
- **Event-driven:** Kafka/RabbitMQ cho real-time progress updates
- **Microservices:** Independent services (Assessment, Recommendation, Content Generation) cho scalability

---

## 5. HỆ THỐNG VẬN HÀNH THÔNG MINH

## Resource Intelligence & Monitoring

**Real-time Cost Tracking:**

- Dashboard theo dõi token usage của OpenAI, Azure, ElevenLabs realtime
- Predictive alerts khi consumption vượt 80% quota

**Telegram Alert Bot:**

Tự động thông báo:

- ⚠️ API quota warning (còn 10% limit)
- 🔴 Service downtime (>2 phút)
- 📈 Unusual traffic spike (>200% baseline)

## Automated Retention Engine

**Smart Re-engagement (Giữ chân người dùng):**

| Trigger | Action | Personalization |
| --- | --- | --- |
| **24h inactive** | Email nhắc nhở "Continue your lesson" | Include next recommended unit + progress % |
| **3 days absent** | Push notification với bonus XP incentive | Mention specific weak area to work on |
| **7 days churned** | AI-generated personalized video message | Show peer progress comparison |

**Weekly Progress Report:**

Auto-generate email vào Sunday 18:00 với:

- 📊 Total study time (so sánh với week trước)
- 📚 New vocabulary mastered (với example sentences)
- 🎯 Skills improvement heatmap (4 skills x before/after)
- 🏆 Achievements unlocked (badges, streaks)onlinelibrary.wiley+1

## AI Content Moderation

**Social Hub Safety:**

- **Pre-publish Scan:** Mỗi post qua OpenAI Moderation API trước khi public
- **Auto-block:** Toxic content (hate speech, spam) bị reject tức thì
- **Human Review Queue:** Borderline cases được escalate cho moderator
- **Appeal System:** User có thể kháng nghị với AI explanation về lý do block

---

## Tech Stack:

### Frontend & Client-side (Giao diện người dùng):

| **Thành phần** | **Công nghệ sử dụng** | **Vai trò & Lý do lựa chọn (Chuẩn Enterprise)** |
| --- | --- | --- |
| **Core Framework** | **React.js (Vite)** | Chuẩn công nghiệp hiện tại. Vite giúp build cực nhanh, HMR (Hot Module Replacement) tức thì. |
| **Ngôn ngữ** | **TypeScript** | **Bắt buộc.** Đảm bảo Type Safety, code dễ bảo trì (maintainable) khi team scale lên nhiều người. |
| **Server State** | **TanStack Query (React Query)** | Quản lý Caching, Deduplication, Re-validation dữ liệu từ API. Giúp app nhanh như cắt, giảm tải gọi API thừa. |
| **Client State** | **Zustand** | Chỉ dùng để lưu trạng thái UI toàn cục (Global UI State) như: Theme, Modal mở/đóng, Audio Player đang chạy bài nào. |
| **Form Management** | **React Hook Form** | Xử lý form phức tạp với hiệu năng cao (uncontrolled components), giảm render lại không cần thiết. |
| **Schema Validation** | **Zod** | Kết hợp với React Hook Form để validate dữ liệu chặt chẽ ngay từ phía Client. |
| Styling | CSS Modules for client
TailwindCSS for admin | **CSS Modules:** Scoped styles (tự động hash tên class) giúp tránh xung đột class 100%. |
| **Hiệu ứng** | **GSAP** | Dùng GSAP cho animation. |
| **Realtime Client** | **Socket.io-client** | Chuẩn mực cho kết nối 2 chiều. |
| **Video/Audio Call** | **LiveKit (hoặc PeerJS)** | *Lưu ý:* Enterprise thường chuộng **LiveKit** (Open source WebRTC infrastructure) hơn PeerJS vì độ ổn định cao hơn khi scale user. |
| **Testing** | **Vitest + React Testing Library** | **Bắt buộc** với dự án lớn. Đảm bảo tính năng không bị lỗi khi refactor code. |

### Backend & Server-side (Xử lý nghiệp vụ):

| **Thành phần** | **Công nghệ sử dụng** | **Vai trò & Lý do lựa chọn (Chuẩn Enterprise)** |
| --- | --- | --- |
| **Runtime** | **Node.js** | Môi trường chạy JavaScript hiệu năng cao. |
| **Framework** | **Express.js** | Framework quen thuộc, linh hoạt. **Lưu ý:** Phải cấu hình các Middleware bảo mật (Helmet, Cors, Rate-limit) ngay từ đầu. |
| **Ngôn ngữ** | **TypeScript** | **Bắt buộc.** Không viết JS thuần. TypeScript giúp code trong sáng, dễ refactor và tránh 90% lỗi ngớ ngẩn (`undefined is not a function`). |
| **API Docs** | **Swagger (swagger-jsdoc)** | Tự động sinh trang tài liệu API `/api-docs` từ comment trong code. Frontend nhìn vào đó để tích hợp, không cần chat hỏi Backend. |
| **Database ORM** | **Mongoose (MongoDB) + Pinecone** | • **Mongoose:** Quản lý Schema MongoDB chặt chẽ.
• **Pinecone:** Vector database - Semantic search, Knowledge retrieval, Personalized recommendations |
| **Message Queue** | **BullMQ + Redis** | **(Thay thế node-cron)**. Quản lý tác vụ nền (Gửi mail, chấm điểm AI). Đảm bảo job không bị mất khi server restart, hỗ trợ chạy lại (retry) khi lỗi. |
| **Realtime** | **Socket.io + Redis Adapter** | Redis Adapter giúp đồng bộ tin nhắn khi bạn mở rộng (scale) lên nhiều server khác nhau. |
| **Validation** | **Zod** | Validation siêu mạnh. Dùng làm Middleware để chặn các request rác ngay từ cửa ngõ, không cho lọt vào Controller. |
| **Logging** | **Winston** (hoặc Morgan) | Ghi log ra file hoặc bắn lên hệ thống giám sát (Datadog/Sentry) theo chuẩn JSON. Tuyệt đối không dùng `console.log` trên Production. |
| **Architecture** | **Service-Repository Pattern** | Mô hình 3 lớp: **Controller** (Giao tiếp) -> **Service** (Logic nghiệp vụ) -> **Data Access** (Truy xuất DB). |

### Database & Storage (Lưu trữ dữ liệu):

| **Thành phần** | **Công nghệ sử dụng** | **Vai trò & Lý do lựa chọn (Chuẩn Enterprise)** |
| --- | --- | --- |
| **Operational DB (NoSQL)** | **MongoDB Atlas** | **Primary Database:** Sử dụng bản Enterprise/Atlas để có tính năng *Sharding* (chia nhỏ dữ liệu khi scale lớn) và *Point-in-time Recovery* (khôi phục dữ liệu theo từng giây). Lưu trữ User Profile, Learning Progress, Logs. |
| **Knowledge Graph** | **Pinecone** | **Vector Database:** Semantic search engine cho adaptive learning. |
| **Distributed Cache** | **Redis (Cluster Mode)** | **Caching & Pub/Sub:** Cấu hình Cluster để chịu tải lớn. Dùng cho: 
1. **Session Store:** Lưu phiên đăng nhập.
2. **BullMQ:** Quản lý hàng đợi job nền.
3. **Real-time Leaderboard:** Bảng xếp hạng cập nhật tức thì. |
| **Object Storage** | **Cloudflare R2** | **Media Storage:** Lưu trữ file gốc (Raw Audio/Video/PDF). R2 được chọn vì tuân thủ chuẩn S3 API (dễ dàng migrate sang AWS S3 nếu cần) và **Zero Egress Fees** (tối ưu chi phí băng thông cho media nặng). |
| **Media Pipeline** | **Cloudinary (Enterprise)** | **Digital Asset Management (DAM):** Không chỉ lưu ảnh, mà đóng vai trò là CDN và bộ xử lý media tự động (Auto-format WebP/Avif, Adaptive Bitrate Streaming cho video) giúp tối ưu trải nghiệm người dùng cuối. |
| **Data Warehouse** | **ClickHouse** (hoặc BigQuery) | **(Mới - Bắt buộc cho Enterprise):** Kho dữ liệu phân tích. Dùng để lưu Logs hành vi user (User Tracking), lịch sử học tập lâu dài để chạy các thuật toán Machine Learning cải thiện gợi ý (Recommendation). |

### AI & Machine Learning Ecosystem (Lõi thông minh):

| **Phân hệ AI** | **Công nghệ / Model** | **Vai trò cụ thể** |
| --- | --- | --- |
| **Xử lý Logic & Text (High-Level)** | **GPT-5.2** | **Model chủ lực:** Chấm điểm bài Viết (Writing) chuyên sâu, sinh kịch bản Roleplay phức tạp, giải thích lỗi ngữ pháp theo ngữ cảnh. |
| **Xử lý Tác vụ nhẹ (Cost-Effective)** | **GPT-5.1** | **Model tối ưu chi phí:** Sinh từ vựng, tạo bài đọc, tạo Quiz trắc nghiệm số lượng lớn và phân tích dữ liệu học tập cơ bản. |
| **Voice AI (Hội thoại)** | **OpenAI Realtime Mini API** | "Trái tim" của Speaking Coach. Xử lý trọn gói quy trình Nghe-Hiểu-Nói (Speech-to-Speech) với độ trễ siêu thấp **(<500ms)**, thay thế hoàn toàn STT/TTS rời rạc. |
| **Chấm điểm (Examiner)** | **Azure AI Speech** | Chuyên gia chấm điểm phát âm (Pronunciation Assessment). Phân tích chi tiết độ trôi chảy (Fluency), ngữ điệu (Prosody) và bắt lỗi phát âm từng từ (Mispronunciation). |
| **Giọng đọc bổ trợ** | **ElevenLabs** | Tạo giọng đọc cảm xúc chất lượng cao (High Definition) cho các bài Listening thụ động hoặc Podcast bài học (khi không cần tương tác realtime). |
| **Vector Embedding** | **text-embedding-3-small** | Chuyển đổi dữ liệu giáo trình thành Vector để lưu vào Pinecone, phục vụ tính năng tìm kiếm ngữ nghĩa cho **RAG Chatbot**. |
| **Kiểm duyệt (Safety)** | OpenAI Moderation API + GPT-5-mini | **Mô hình Hybrid 2 lớp:
- Lớp 1 (Free):** Dùng Moderation API quét và chặn nội dung độc hại (Toxic/18+) tức thì.
- **Lớp 2 (Smart):** Dùng GPT-5-mini để phân tích ngữ nghĩa, đảm bảo bài đăng **đúng chủ đề học tập** (chặn spam/quảng cáo rác). |