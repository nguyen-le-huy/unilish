# Unilish — AI-Powered Adaptive Language Learning Platform

An AI-driven EdTech platform that builds personalized learning paths for each learner based on their proficiency level, goals, and knowledge gaps. The system continuously adapts — detecting weak areas and restructuring the learning roadmap in real time.

---

## Architecture

Monorepo with three apps:

| App | Path | Port |
|---|---|---|
| Client (User-facing) | `client/` | `5173` |
| Admin (CMS) | `admin/` | `5174` |
| Server (API) | `server/` | `5432` |

---

## Tech Stack

### Frontend (Client)

| | Technology |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| Server State | TanStack Query v5 |
| Client State | Zustand |
| Forms | React Hook Form + Zod |
| Styling | CSS Modules + CSS Variables |
| Animation | GSAP |
| Routing | React Router v7 |
| Notifications | Sonner |

### Frontend (Admin)

| | Technology |
|---|---|
| Framework | React + Vite + TypeScript |
| Styling | TailwindCSS + Shadcn/UI |

### Backend

| | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express 5 + TypeScript |
| Database | MongoDB Atlas (Mongoose) |
| Vector DB | Pinecone |
| Cache / Queue | Redis + BullMQ |
| Realtime | Socket.io |
| Auth | JWT + Passport (Google OAuth) |
| Storage | Cloudflare R2 (audio/video) + Cloudinary (images) |
| Logging | Winston |
| Validation | Zod |

### AI & Services

| | Technology |
|---|---|
| LLM | OpenAI `gpt-5.4-mini-2026-03-17` |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dim) |
| TTS | OpenAI `gpt-4o-mini-tts` + ElevenLabs |
| Realtime Speech | OpenAI Realtime API (`gpt-realtime-mini`) |
| Transcription | Deepgram |
| Pronunciation | Azure AI Speech (Southeast Asia) |
| Automation | n8n webhooks |

---

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- MongoDB Atlas account
- Pinecone account
- OpenAI API key

---

## Setup

### 1. Clone

```bash
git clone https://github.com/nguyen-le-huy/unilish.git
cd unilish
```

### 2. Environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
cp admin/.env.example admin/.env
```

Key variables in `server/.env`:

| Variable | Description |
|---|---|
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | JWT signing secret |
| `PINECONE_API_KEY` | Pinecone API key |
| `PINECONE_INDEX_NAME` | Default: `unilish-course-series` |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | Default: `gpt-5.4-mini-2026-03-17` |
| `REDIS_URI` | Redis connection string |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 key |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 secret |
| `AZURE_SPEECH_KEY` | Azure AI Speech key |
| `ELEVENLABS_API_KEY` | ElevenLabs API key |
| `DEEPGRAM_API_KEY` | Deepgram API key |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |

### 3. Run

```bash
# Development (hot-reload)
docker compose up -d --build

# Production
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Pinecone Index Setup

1. Sign up at [app.pinecone.io](https://app.pinecone.io)
2. Create an index:
   - **Name:** `unilish-knowledge` (general knowledge graph)
   - **Dimensions:** `1536`
   - **Metric:** `cosine`
3. Create a second index for course recommendations:
   - **Name:** `unilish-course-series` (course vectors)
   - **Dimensions:** `1536`
   - **Metric:** `cosine`
4. Copy the API key → set `PINECONE_API_KEY` in `server/.env`

---

## Vector Sync Scripts

```bash
# Sync course vectors for recommendation search
npm run sync:vectors
```

---

## License

Proprietary & confidential. Unauthorized use or distribution is prohibited.

**Author:** Nguyen Le Huy | Hystudio
