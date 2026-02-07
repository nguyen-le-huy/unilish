# UniLish - Adaptive & Hyper-Personalized Learning Platform

## Executive Summary

UniLish is not merely a language learning application; it is a comprehensive **Adaptive Learning Ecosystem** designed to solve the "one-size-fits-all" problem in education. By leveraging Advanced AI and Knowledge Graphs, UniLish constructs a hyper-personalized learning pathway that adapts in real-time to the user's proficiency, professional background, and learning behaviors.

The platform interconnects six core linguistic skills—Vocabulary, Reading, Grammar, Listening, Speaking, and Writing—into a seamless, context-aware flow, ensuring that learners acquire pragmatic competence suitable for Business, Academic, or Travel contexts.

---

## Core Architecture: The Adaptive Engine

The differentiator of UniLish is its proprietary Adaptive Engine, which orchestrates the learning experience based on real-time data analysis.

### Dynamic Roadmaps via Knowledge Graphs

Unlike linear curriculums, UniLish utilizes **Neo4j** to model English knowledge as a graph. The system continuously evaluates learner performance. If a deficiency is detected (e.g., "Past Tense Construction"), the engine dynamically reroutes the curriculum, prioritizing remedial exercises before advancing to new concepts.

### Contextual Intelligence

The AI analyzes the user's profile (e.g., profession, interests) to tailor content. A software engineer receives learning materials derived from technology news, while a tourism professional interacts with cultural dialogue scenarios, ensuring maximum relevance and engagement.

---

## Key Functional Modules

### 1. Personalized Experience & Roadmap

* **Adaptive Learning Roadmap:** Utilizes Knowledge Graphs to track progress at a granular level (specific vocabulary words or grammatical structures). It employs Spaced Repetition algorithms to identify and address knowledge gaps precisely when needed.
* **Placement Test 2.0:** A comprehensive competency assessment combining standard TOEIC inputs (Listening/Reading) with an AI Interview (Speaking/Writing) to generate an accurate initial proficiency profile.

### 2. Smart Content & Interaction

* **Dynamic Content Automation:** Powered by **n8n** and **GPT-5.2**, this module automatically converts real-time news (CNN, BBC) into interactive lessons matched to the user's current level.
* **Real-time AI Speaking Coach:** A 1:1 virtual coaching environment utilizing **OpenAI Realtime API** with sub-500ms latency. It provides immediate feedback on Pragmatic Competence, Prosody, and Fluency using **Azure AI Speech**, maintaining a history of errors for targeted improvement.

### 3. Engagement Ecosystem

* **YouTube Gap Fill Challenge:** Generates personalized listening exercises from YouTube video transcripts based on user interests.
* **Live Connect P2P:** An intelligent matching algorithm pairs users with similar proficiency levels for real-time peer-to-peer communication practice.
* **Competitive Exams:** Periodic standardized testing with real-time leaderboards to foster healthy competition.

### 4. Utilities & Assistance

* **Uni-Assistant (RAG Chatbot):** A 24/7 learning aide that understands the specific context of the user's current lesson. It supports data export (Vocabulary/Sentences) to Excel/CSV formats.

---

## Technical Architecture

The system is architected for high concurrency, data integrity, and low-latency AI processing.

### AI & Data Layer

| Component | Technology | Role |
| --- | --- | --- |
| **Logic & Text Processing** | GPT-5.2 | Writing assessment, complex roleplay generation, deep grammar analysis. |
| **Voice AI (Conversational)** | OpenAI Realtime Mini API | End-to-end speech handling (Speech-to-Speech) with ultra-low latency (<500ms). |
| **Pronunciation Assessment** | Azure AI Speech | Detailed scoring of Fluency, Prosody, and word-level accuracy. |
| **Database (Hybrid)** | MongoDB + Neo4j | MongoDB stores content/metadata; Neo4j manages knowledge relationships and learning paths. |
| **Workflow Automation** | n8n | Orchestration of content ingestion and background processes. |

### Application Layer

| Layer | Technology |
| --- | --- |
| **Backend** | Node.js 20, Express, TypeScript |
| **Frontend (Client)** | React 18 (Vite), CSS Modules (Custom Architecture) |
| **Frontend (Admin)** | React 18 (Vite), Tailwind CSS, Shadcn/UI |
| **Realtime** | Socket.io, PeerJS |

---

## Operational Intelligence & Growth

UniLish integrates automated operations modules to ensure scalability, cost-efficiency, and user retention.

### Resource Intelligence & Monitoring

* **Real-time Cost Optimization:** Monitors API token usage (OpenAI, Azure, ElevenLabs) in real-time to optimize operational costs.
* **Automated Alerting:** A specialized bot triggers immediate alerts via Telegram upon detecting traffic anomalies or resource thresholds, enabling proactive incident response.

### Automated Retention Engine

* **Smart Re-engagement:** Cron jobs analyze user activity patterns. If a user is inactive for 24 hours, the system triggers personalized reminder emails.
* **Weekly Insights:** Automatically generates and dispatches comprehensive weekly performance reports (Time spent, Vocabulary Gain, Articles read) to visualize progress and sustain motivation.

### AI-Driven Community Safety

* **Content Moderation Pipeline:** All user-generated content on the Social Hub/News Feed undergoes automated AI screening.
* **Compliance:** Instant detection and blocking of toxic content, spam, or off-topic material to maintain a professional learning environment.

---

## Installation & Deployment

### Prerequisites

* Node.js 20+
* Docker & Docker Compose
* MongoDB Atlas & Neo4j Database

### Setup Instructions

1. **Clone the Repository**
```bash
git clone https://github.com/nguyen-le-huy/unilish.git
cd unilish

```


2. **Environment Configuration**
Copy the example configuration files and populate the required API keys (OpenAI, Azure, Database URIs).
```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env

```


3. **Deployment via Docker**
```bash
docker-compose up -d --build

```



### Access Points

* **Client Application:** http://localhost:5173
* **Admin Dashboard:** http://localhost:5174
* **API Server:** http://localhost:5001

---

## License

This project is proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

**Author:** Nguyen Le Huy | Hystudio