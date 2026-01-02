<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB"/>
  <img src="https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker"/>
</p>

# UniLish - Contextual English Learning Platform

**UniLish** is an advanced EdTech platform focusing on **Contextual Learning**. It solves rote memorization by interconnecting 6 English skills: Vocabulary, Grammar, Listening, Speaking, Reading, and Writing.

---

## Key Features

| Feature | Description | Technology |
|---------|-------------|------------|
| **AI Speaking Coach** | Real-time 1:1 conversation with <500ms latency | OpenAI Realtime API, Deepgram |
| **RAG Chatbot (Uni-Assistant)** | Intelligent tutor using curriculum data | LangChain, Pinecone |
| **Learn with News** | Automated lessons from CNN news | n8n, GPT-4o |
| **YouTube Gap-Fill** | Interactive listening from video transcripts | Custom AI Pipeline |
| **Live Connect** | P2P Video calls for practice | PeerJS, Socket.io |
| **Email Verification** | Secure OTP registration flow | n8n Workflow, Nodemailer |

---

## Technology Stack

### Backend
| Layer | Technology | Purpose |
|-------|------------|---------|
| **Runtime** | Node.js 20, Express | RESTful API server |
| **Language** | TypeScript (Strict) | Type safety |
| **Database** | MongoDB Atlas | Primary data storage |
| **Caching** | Redis | Queue, API caching |
| **Vector DB** | Pinecone | RAG embeddings |
| **Workflow** | n8n | Email Automation |
| **Realtime** | Socket.io | Live updates, signaling |

### Frontend
| App | Framework | Styling Strategy |
|-----|-----------|------------------|
| **Client** | React 18 (Vite) | Hybrid: CSS Modules (Marketing) + Tailwind/Shadcn (Dashboard) |
| **Admin** | React 18 (Vite) | Tailwind CSS + Shadcn/UI |

### Storage (Hybrid Model)
| Type | Service | Reason |
|------|---------|--------|
| **Images** | Cloudinary | Transformations, optimization |
| **Audio/Video** | Cloudflare R2 | Zero egress fees |

---

## Project Structure

```
unilish/
├── client/              # User Application (React + Vite)
│   ├── src/
│   │   ├── app/         # Global config (router, providers)
│   │   ├── components/  # Reusable UI (Shadcn, layouts)
│   │   ├── features/    # Business modules (auth, courses, chat)
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # Axios, React Query config
│   │   └── pages/       # Route entry points
│   └── ...
│
├── admin/               # CMS Dashboard (React + Vite)
│   ├── src/
│   │   ├── components/  # Admin UI components
│   │   ├── features/    # CMS modules (users, lessons, analytics)
│   │   └── pages/       # Admin pages
│   └── ...
│
├── server/              # Express API (Node.js)
│   ├── src/
│   │   ├── controllers/ # HTTP handlers (no business logic)
│   │   ├── services/    # Business logic layer
│   │   ├── models/      # Mongoose schemas
│   │   ├── middlewares/ # Auth, validation, error handling
│   │   ├── routes/      # API routing
│   │   ├── socket/      # Realtime handlers
│   │   └── utils/       # Helpers (AppError, catchAsync)
│   └── ...
│
├── docker-compose.yml   # Development orchestration
└── .agent/              # AI Agent documentation
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **Docker** & Docker Compose
- **MongoDB Atlas** account (or local MongoDB)
- **Redis** (included in Docker)
- **n8n** (Optional for Email)

### 1. Clone the repository

```bash
git clone https://github.com/nguyen-le-huy/unilish.git
cd unilish
```

### 2. Set up environment variables

Copy the example files and fill in your values:

```bash
# Root level (for Docker Compose)
cp .env.example .env

# Server
cp server/.env.example server/.env

# Client
cp client/.env.example client/.env

# Admin
cp admin/.env.example admin/.env
```

### 3. Start with Docker (Recommended)

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f
```

**Services will be available at:**
| Service | URL |
|---------|-----|
| Client | http://localhost:5173 |
| Admin | http://localhost:5174 |
| Server API | http://localhost:5001 |
| Redis | localhost:6379 |

### 4. Start without Docker (Manual)

```bash
# Install dependencies for each app
cd server && npm install
cd ../client && npm install
cd ../admin && npm install

# Run each in separate terminals
cd server && npm run dev
cd client && npm run dev
cd admin && npm run dev -- --port 5174
```

---

## Environment Variables

### Server (`server/.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/unilish
REDIS_URI=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-key
JWT_EXPIRES_IN=7d

# URLs
CLIENT_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
N8N_WEBHOOK_URL=https://... (For Email Service)

# Cloudinary
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Cloudflare R2
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=xxx

# AI Services
OPENAI_API_KEY=xxx
DEEPGRAM_API_KEY=xxx
```

### Client/Admin (`client/.env`, `admin/.env`)

```env
VITE_API_URL=http://localhost:5001
```

---

## Development Guidelines

### Architecture Principles

1. **Feature-Sliced Design** - Frontend follows FSD-lite pattern
2. **Layered Architecture** - Backend: Controller → Service → Model
3. **Type Safety** - TypeScript strict mode, no `any`
4. **Performance First** - React Query, lazy loading, optimized queries

### State Management

| Type | Solution |
|------|----------|
| Server State | TanStack Query (React Query) v5 |
| Client State | Zustand |

### Coding Standards

- **Files**: `kebab-case.ts` (e.g., `user.controller.ts`)
- **Classes**: `PascalCase` (e.g., `UserService`)
- **Functions/Variables**: `camelCase`
- **Imports**: Always use `@/` alias

---

## API Documentation

API documentation is available via Swagger at:
```
http://localhost:5001/api-docs
```

---

## Docker Commands

```bash
# Start all services
docker-compose up -d

# Rebuild after code changes
docker-compose up -d --build

# Stop all services
docker-compose down

# View logs
docker-compose logs -f [service_name]

# Shell into container
docker exec -it unilish-server sh
```

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Nguyen Le Huy**

- GitHub: [@nguyen-le-huy](https://github.com/nguyen-le-huy)

---

<p align="center">
  Made with love for English learners worldwide
</p>
