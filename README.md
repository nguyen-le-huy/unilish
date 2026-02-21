# UNILISH — AI-Powered Adaptive Language Learning Platform

## 1. Vision & Core Values

UniLish is an **AI-Powered Adaptive Learning Ecosystem** that solves the "one-size-fits-all" problem in language education. The platform combines AI, Vector Embeddings, and Spaced Repetition to build learning paths individually tailored to each learner's goals (Business, Academic, Travel, …) and actual proficiency level.

**Core Value:** The system detects learner "knowledge blind spots" and automatically restructures the learning path to fill those gaps, ensuring all 6 skills — Vocabulary → Reading → Grammar → Listening → Speaking → Writing — develop synchronously and cohesively.

---

## 2. Core Technology: AI Adaptive Engine

### Dynamic Learning Path

Instead of a fixed lesson list, UniLish uses **MongoDB + Pinecone Vector Database** to build a **Knowledge Map**. When AI detects a weakness (e.g., "Past Tense"), it automatically elevates related review lessons to the top of the roadmap and defers new content until the foundation is solid.

**Mechanism:**

- **Real-time Assessment:** Every quiz/exercise is analyzed by AI to detect weak concepts
- **Automated Remediation:** System auto-creates a Remedial Queue with priority scoring
- **Adaptive Pacing:** Learning speed automatically adjusts to each learner's mastery level

### Contextual Personalization

AI analyzes learner profiles (occupation, interests, goals) to recommend contextually relevant content:

- **Software Engineer:** Vocabulary through tech news (TechCrunch, Wired), Agile/DevOps case studies
- **Tour Guide:** Real conversations at airports, hotels, restaurants
- **Business Professional:** Email templates, meeting scripts, negotiation scenarios

---

## 3. Key Features

### A. Personalized Learning Experience

**Placement Test 2.0 — Comprehensive Proficiency Analysis**

Two complementary assessment methods:

1. **TOEIC-Standard Test (Input Skills):** Measures Listening + Reading to international standards
2. **AI Interview (Output Skills):** OpenAI Realtime API evaluates Speaking + Writing through live conversation with **<500ms latency**

**Output:** 4D proficiency profile (Listening / Reading / Speaking / Writing) + Recommended starting level + Priority weak areas

**Adaptive Learning Roadmap**

- **Knowledge Gap Detection:** AI maps each incorrect answer to specific lessons after every Unit Quiz
- **Spaced Repetition Engine:** Optimal review schedule based on the Ebbinghaus forgetting curve
- **Progress Visualization:** Real-time dashboard with mastered concepts vs weak areas heatmap

---

### B. Smart Content & Interaction

**Learn with News — Living, Continuously Updated Content**

Automated n8n workflow pipeline:

1. **Scrape:** Collect articles from CNN, BBC, Reuters every 4 hours
2. **Filter:** AI selects content matching each CEFR level (A1–C2)
3. **Transform:** GPT-5.2 converts articles into interactive lessons (vocab highlights, comprehension quizzes, discussion prompts)
4. **Personalize:** Recommendations based on user interests (tech, sports, culture, …)

> Learn through real-world current events — 40% higher engagement vs traditional textbooks.

**Real-time AI Speaking Coach**

1-on-1 virtual assistant featuring:

- **Context Memory:** Tracks each user's pronunciation and grammar error history across sessions
- **Adaptive Correction:** Prioritizes the most impactful errors (pronunciation > grammar > vocabulary)
- **Azure AI Speech Integration:** Phoneme-level pronunciation scoring with prosody analysis (intonation, stress, fluency)
- **Scenario-based Practice:** Job interviews, restaurant ordering, doctor appointments, and more

---

### C. Gamification & Community

**YouTube Gap-Fill Challenge**

Personalized listening exercises based on the user's favorite YouTube videos:

1. User selects a topic (gaming, cooking, tech reviews, …)
2. AI auto-generates a transcript with blanks targeting vocabulary/grammar focus points
3. Adaptive difficulty: blank rate increases with progress (10% → 30%)

**Live Connect P2P — Smart Learning Partner Matching**

Matching algorithm based on:

- Similar CEFR level (±1 level)
- Shared interests (3+ overlapping topics)
- Complementary weak areas (A weak in Speaking + B weak in Listening → matched for conversation practice)

**Competitive Exams — Periodic Ranking Challenges**

Weekly challenges with real-time leaderboard; badges and certificates awarded to top performers.

---

### D. Intelligent Utilities

**Uni-Assistant — RAG Chatbot**

24/7 learning assistant:

- **Contextual Q&A:** Answers questions grounded in the user's current lesson (powered by Pinecone vector search)
- **Data Export:** Export learned vocabulary and saved sentences to Excel / CSV / Anki deck
- **Learning Tips:** Personalized study method recommendations based on learning style

---

## 4. Technical Architecture

### Frontend & Client-side

| Component | Technology | Role |
| --- | --- | --- |
| **Core Framework** | React.js (Vite) | Industry standard; Vite for instant HMR and fast builds |
| **Language** | TypeScript | Mandatory — type safety, maintainability at scale |
| **Server State** | TanStack Query (React Query) | Caching, deduplication, re-validation; eliminates redundant API calls |
| **Client State** | Zustand | Global UI state only: theme, modal open/close, audio player |
| **Form Management** | React Hook Form | High-performance uncontrolled form handling |
| **Schema Validation** | Zod | Client-side validation paired with React Hook Form |
| **Styling** | CSS Modules (client app) / Tailwind CSS + Shadcn/UI (admin) | CSS Modules: scoped, collision-free class names |
| **Animation** | GSAP | Complex timeline-based animations |
| **Realtime Client** | Socket.io-client | Bidirectional real-time communication |
| **Video/Audio Call** | LiveKit | Enterprise-grade open-source WebRTC infrastructure |
| **Testing** | Vitest + React Testing Library | Regression safety during refactoring |

### Backend & Server-side

| Component | Technology | Role |
| --- | --- | --- |
| **Runtime** | Node.js 20+ | High-performance JS runtime |
| **Framework** | Express.js | Flexible, battle-tested; secured with Helmet, CORS, rate-limiting |
| **Language** | TypeScript | Mandatory — zero plain JS |
| **API Docs** | Swagger (swagger-jsdoc) | Auto-generates `/api-docs` from code comments |
| **Database ORM** | Mongoose (MongoDB) | Strict schema enforcement for operational data |
| **Message Queue** | BullMQ + Redis | Background jobs (email delivery, AI scoring); retry-safe, survives server restarts |
| **Realtime** | Socket.io + Redis Adapter | Multi-server synchronization for horizontal scaling |
| **Validation** | Zod Middleware | Blocks malformed requests at the gateway before reaching controllers |
| **Logging** | Winston | Structured JSON logs; `console.log` forbidden in production |
| **Architecture** | Service-Repository Pattern | Controller → Service → Repository — clean separation of concerns |

### Database & Storage

| Component | Technology | Role |
| --- | --- | --- |
| **Operational DB** | MongoDB Atlas | Primary store for users, courses, progress. Sharding + point-in-time recovery via Atlas |
| **Vector Database** | Pinecone Serverless | Semantic search engine powering adaptive recommendations and RAG chatbot |
| **Distributed Cache** | Redis (Cluster Mode) | Session store, BullMQ queue backend, real-time leaderboard |
| **Object Storage** | Cloudflare R2 | Raw audio/video/PDF storage. S3-compatible API, zero egress fees |
| **Media Pipeline** | Cloudinary (Enterprise) | CDN + auto-format (WebP/AVIF), adaptive bitrate streaming for video |
| **Data Warehouse** | ClickHouse | High-volume user behavior logs and long-term learning analytics for ML pipelines |

### AI & Machine Learning Ecosystem

| Subsystem | Model / Technology | Role |
| --- | --- | --- |
| **High-level Logic & Text** | GPT-5.2 | Writing assessment, complex roleplay scenario generation, contextual grammar explanation |
| **Lightweight Tasks** | GPT-5.1 | Vocabulary generation, reading passages, bulk quiz creation, basic learning analytics |
| **Voice AI (Conversational)** | OpenAI Realtime Mini API | Core of Speaking Coach — end-to-end Speech-to-Speech with **<500ms latency** |
| **Pronunciation Scoring** | Azure AI Speech | Phoneme-level mispronunciation detection, fluency and prosody analysis |
| **High-definition TTS** | ElevenLabs | Expressive, emotion-aware voice for passive Listening content and lesson podcasts |
| **Vector Embedding** | text-embedding-3-small | Converts curriculum content to vectors for Pinecone; powers RAG semantic search |
| **Content Moderation** | OpenAI Moderation API + GPT-5-mini | **Hybrid 2-layer:** Layer 1 (free) — instant block of toxic/adult content. Layer 2 (smart) — semantic analysis to enforce on-topic learning content |

**Architecture Highlights:**

- **Polyglot Persistence:** MongoDB (operational) + Pinecone (semantic) + Redis (cache/queue) + ClickHouse (analytics)
- **Event-driven:** Kafka/RabbitMQ for real-time progress updates
- **Microservices:** Independent Assessment, Recommendation, and Content Generation services

---

## 5. Intelligent Operations System

### Resource Intelligence & Monitoring

**Real-time Cost Tracking:**

- Dashboard monitors token consumption across OpenAI, Azure, and ElevenLabs in real-time
- Predictive alerts triggered at 80% quota consumption

**Telegram Alert Bot — Automated notifications:**

- ⚠️ API quota warning (10% remaining)
- 🔴 Service downtime (>2 minutes)
- 📈 Unusual traffic spike (>200% baseline)

### Automated Retention Engine

| Trigger | Action | Personalization |
| --- | --- | --- |
| **24h inactive** | Email: "Continue your lesson" | Next recommended unit + current progress % |
| **3 days absent** | Push notification with bonus XP incentive | Highlights specific weak area to work on |
| **7 days churned** | AI-generated personalized video message | Peer progress comparison |

**Weekly Progress Report** — auto-generated email every Sunday at 18:00:

- Total study time vs previous week
- New vocabulary mastered (with example sentences)
- Skills improvement heatmap (4 skills × before/after)
- Achievements unlocked (badges, streaks)

### AI Content Moderation

- **Pre-publish Scan:** Every community post passes through OpenAI Moderation API before going public
- **Auto-block:** Toxic content (hate speech, spam) rejected instantly
- **Human Review Queue:** Borderline cases escalated to moderators
- **Appeal System:** Users can appeal with an AI-generated explanation of the block reason

---

## Installation & Deployment

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MongoDB Atlas account
- Pinecone account
- OpenAI API key

### Setup

1. **Clone the repository**

```bash
git clone https://github.com/nguyen-le-huy/unilish.git
cd unilish
```

2. **Configure environment variables**

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
cp admin/.env.example admin/.env
```

Key variables:

| Variable | Description |
| --- | --- |
| `MONGO_URI` | MongoDB Atlas connection string |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_ENVIRONMENT` | Pinecone environment (e.g. `us-east1-gcp`) |
| `PINECONE_INDEX_NAME` | Index name (default: `unilish-knowledge`) |
| `OPENAI_API_KEY` | OpenAI API key |
| `REDIS_URI` | Redis connection string (optional locally) |

3. **Run with Docker**

```bash
# Development (hot-reload)
docker-compose up -d --build

# Production
docker-compose -f docker-compose.prod.yml up -d --build
```

### Access Points

| Service | URL |
| --- | --- |
| Client Application | http://localhost:5173 |
| Admin Dashboard | http://localhost:5174 |
| API Server | http://localhost:5432 |

---

## Database Setup

### MongoDB Atlas

1. Create an account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster and configure network access
3. Create a database user and obtain the connection string
4. Set `MONGO_URI` in `server/.env`

### Pinecone

1. Sign up at https://app.pinecone.io
2. Create an index:
   - **Name:** `unilish-knowledge`
   - **Dimensions:** `1536` (OpenAI `text-embedding-3-small`)
   - **Metric:** `cosine`
3. Set `PINECONE_API_KEY` and `PINECONE_ENVIRONMENT` in `server/.env`

---

## License

This project is proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

**Author:** Nguyen Le Huy | Hystudio
