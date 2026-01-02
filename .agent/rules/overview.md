---
trigger: always_on
---

# UNILISH - PROJECT OVERVIEW

## 1. Core Mission
**UniLish** is an advanced EdTech platform focusing on **Contextual Learning**. It solves rote memorization by interconnecting 6 English skills: Vocabulary, Grammar, Listening, Speaking, Reading, and Writing.

## 2. Key Features (AI-Powered)
- **AI Speaking Coach:** Real-time 1:1 conversation using **OpenAI Realtime API** & **Deepgram** (<500ms latency, interruption handling).
- **RAG Chatbot (Uni-Assistant):** Intelligent tutor using **LangChain**, **Pinecone** (Vector DB), and internal curriculum data.
- **Learn with News:** Automated lesson generation from CNN news using **n8n** & **GPT-4o**.
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
| **AI Models** | GPT-4o, Deepgram Nova-2 | Content Gen, STT, TTS. |

## 4. Frontend Architecture (Monorepo-style)

### A. Client (`/client`) - Hybrid Design
- **Architecture:** Feature-Sliced Design (Lite).
- **Routing:** Public (Marketing) vs Private (LMS Dashboard).
- **Styling Strategy:**
  - **Marketing Pages:** **CSS Modules** (for high-fidelity, custom "wow" effects).
  - **LMS Dashboard:** **Tailwind CSS + Shadcn/UI** (for clean, consistent UI).
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

*Last Updated: 2026-01-02*