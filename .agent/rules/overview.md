---
trigger: always_on
---

# UNILISH - PROJECT OVERVIEW

## 1. Core Mission
**UniLish** is an advanced EdTech platform focusing on **Contextual Learning**. It solves rote memorization by interconnecting 6 English skills: Vocabulary, Grammar, Listening, Speaking, Reading, and Writing.

## 2. Key Features (AI-Powered)
- **AI Speaking Coach:** Real-time 1:1 conversation using **gpt-realtime-mini** (<500ms latency, interruption handling).
- **RAG Chatbot (Uni-Assistant):** Intelligent tutor using **LangChain**, **Pinecone** (Vector DB), and internal curriculum data.
- **Learn with News:** Automated lesson generation from CNN news using **n8n** & **gpt-4.1**.
- **YouTube Gap-Fill:** Interactive listening exercises generated from YouTube video transcripts.
- **Live Connect:** P2P Video calls for users using **PeerJS**.
- **Email Verification (OTP):** Secure registration with n8n workflow.

## 3. Technology Stack (MERN + AI)

| Layer | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | React (Vite), TypeScript | SPA, Fast performance. |
| **Backend** | Node.js 20, Express | RESTful API, Scalable services. |
| **Database** | MongoDB (Mongoose) | Main data (Lessons, Users). |
| **Caching** | Redis | Queue (Matching), API Caching. |
| **Vector DB** | Pinecone | Embeddings for RAG Chatbot. |
| **Storage** | **Hybrid Model** | **Cloudinary** (Images) + **Cloudflare R2** (Audio/Video - Zero Egress Fees). |
| **Workflow** | **n8n** | Email Automation, Content Gen. |
| **Realtime** | Socket.io | Signaling, Chat, Status updates. |
| **AI Ecosystem** | **GPT-4.1**, **Azure AI Speech**, **ElevenLabs** | See "AI & Machine Learning Ecosystem" below. |

## 4. Frontend Architecture (Monorepo-style)

### A. Client (`/client`) - Hybrid Design
- **Architecture:** Feature-Sliced Design (Lite).
- **Routing:** Public (Marketing) vs Private (LMS Dashboard).
- **Styling Strategy:**
  - **Client App:** **100% Custom Styling** (CSS Modules + Custom Components). **NO UI Libraries** allowed.
  - **Admin CMS:** **Tailwind CSS + Shadcn/UI**.
- **State Management:**
  - **Server State:** TanStack Query (React Query).
  - **Client State:** Zustand.

### B. Admin (`/admin`) - Unified Design
- **Styling:** 100% **Tailwind CSS + Shadcn/UI**.
- **Focus:** CMS for content creation (Rich Text Editor, Gap-Fill Tool), User Management, Analytics.

## 5. Backend Architecture (`/server`)

- **Pattern:** **Layered Architecture** (Controller -> Service -> Model).
- **Validation:** **Zod** (Strict input validation at Route level).
- **Response Standard:** Unified "Envelope" pattern (`status`, `code`, `data`, `meta`).
- **Docs:** OpenAPI/Swagger.

## 6. Project Structure Map

```text
root/
├── client/           # User Application (Hybrid Styling)
│   ├── src/pages/marketing  # CSS Modules
│   └── src/pages/dashboard  # Tailwind/Shadcn
├── admin/            # CMS Dashboard (Tailwind/Shadcn)
├── server/           # Express API
└── docker-compose.yml # Dev Environment (Mongo, Redis, Server, Clients)

```

## 7. Core Philosophy for AI Generation

When generating code for UniLish, always prioritize:

1. **Contextual Linking:** Features should link skills together (e.g., clicking a word in Reading opens Vocab card).
2. **Performance:** Use `React.lazy`, optimized images (`f_auto`), and lean DB queries.
3. **Clean Architecture:** Strict separation of concerns (Business Logic in Services/Hooks, not Controllers/UI).

```

```


## 8. AI & Machine Learning Ecosystem (Lõi thông minh)

| Phân hệ AI | Công nghệ / Model | Vai trò cụ thể |
| :--- | :--- | :--- |
| **Xử lý Logic & Text** | **gpt-4.1-2025-04-14** | Chấm điểm bài Viết (Writing), sinh kịch bản Roleplay khó, giải thích lỗi ngữ pháp chuyên sâu. |
| | **gpt-4.1-mini-2025-04-14** | Sinh từ vựng, bài đọc, tạo Quiz trắc nghiệm, phân tích dữ liệu học tập (Tối ưu chi phí). |
| **Voice AI (Hội thoại)** | **gpt-realtime-mini-2025-12-15** | "Trái tim" của Speaking Coach. Xử lý trọn gói quy trình Nghe-Hiểu-Nói với độ trễ siêu thấp (<500ms). Thay thế hoàn toàn STT/TTS rời rạc. |
| **Chấm điểm (Examiner)** | **Azure AI Speech** | Chuyên gia chấm điểm phát âm (Pronunciation Assessment). Phân tích độ trôi chảy (Fluency), ngữ điệu (Prosody) và bắt lỗi từng từ. |
| **Giọng đọc bổ trợ** | **gpt-4o-mini-tts-2025-12-15** / **Elevenlabs** | Tạo giọng đọc cảm xúc chất lượng cao (High Definition) cho các bài Listening thụ động hoặc Podcast bài học. |

*Last Updated: 2026-01-14*