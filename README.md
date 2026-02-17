# UNILISH - AI-Powered Adaptive Language Learning Platform

## 1. Vision and Core Values

UniLish is an **AI-Powered Adaptive Learning Ecosystem** that solves the "one-size-fits-all" problem in language education. The platform combines AI, Vector Embeddings, and Spaced Repetition to build personalized learning paths tailored to individual goals (Business, Academic, Travel) and actual proficiency levels.

**Core Value:** The system detects learner knowledge gaps and automatically restructures the learning path to fill these gaps, ensuring that all 6 skills (Vocabulary, Reading, Grammar, Listening, Speaking, Writing) develop synchronously and cohesively.

---

## 2. Core Technology: AI Adaptive Engine

### Dynamic Learning Path

Instead of fixed lesson lists, UniLish uses **MongoDB + Pinecone Vector Database** to build a Knowledge Map. When AI detects weaknesses in "Past Tense" skills, the system automatically prioritizes related review lessons at the top of the roadmap, deferring new content until the foundation is solid.

**Mechanism:**

- **Real-time Assessment:** Each quiz/exercise is analyzed by AI to detect weak concepts
- **Automated Remediation:** System creates a Remedial Queue with priority scoring
- **Adaptive Pacing:** Learning speed automatically adjusts based on individual mastery level

### Contextual Personalization

AI analyzes learner profiles (occupation, interests, goals) to recommend contextually relevant content. **Real-world examples:**

- **Software Engineer:** Learn vocabulary through tech news (TechCrunch, Wired), Agile/DevOps case studies
- **Tour Guide:** Learn through real conversations at airports, hotels, restaurants
- **Business Professional:** Learn through email templates, meeting scripts, negotiation scenarios

---

## 3. Key Features

### A. Personalized Learning Experience

**Placement Test 2.0 - Comprehensive Proficiency Analysis**

Combines two complementary assessment methods:

1. **TOEIC-Standard Test (Input Skills):** Measures Listening + Reading according to international standards
2. **AI Interview (Output Skills):** OpenAI Realtime API evaluates Speaking + Writing through real conversations with <500ms latency

**Output:** 4D proficiency profile (Listening/Reading/Speaking/Writing) + Recommended starting level + Priority weak areas

**Adaptive Learning Roadmap**

- **Knowledge Gap Detection:** AI automatically identifies gaps after each Unit Quiz, mapping each incorrect answer to specific lessons
- **Spaced Repetition Engine:** Schedules optimal review based on Ebbinghaus forgetting curve
- **Progress Visualization:** Real-time dashboard displays mastered concepts vs weak areas with heatmap

---

### B. Smart Content and Interaction

**Learn with News - Living, Continuously Updated Content**

n8n workflow automation:

1. **Scrape:** Collect news from CNN, BBC, Reuters every 4 hours
2. **Filter:** AI selects articles appropriate for each CEFR level (A1-C2)
3. **Transform:** GPT-4 converts into interactive lessons (vocab highlights, comprehension quiz, discussion prompts)
4. **Personalize:** Recommends articles based on user interests (tech, sports, culture)

**Benefit:** Learn language through real-world current events, increasing engagement by 40% compared to traditional textbooks.

**Real-time AI Speaking Coach**

1:1 virtual assistant with capabilities:

- **Context Memory:** Remembers each user's pronunciation and grammar error history
- **Adaptive Correction:** Prioritizes most important errors (pronunciation > grammar > vocabulary)
- **Azure AI Speech Integration:** Scores pronunciation at phoneme level, evaluates prosody (intonation, stress)
- **Scenario-based Practice:** Simulates real-world situations (job interview, restaurant ordering, doctor appointment)

---

### C. Gamification and Community

**YouTube Gap-Fill Challenge**

Personalized listening exercises based on user's favorite YouTube videos:

1. User selects topic (gaming, cooking, tech reviews)
2. AI auto-generates transcript with blanks on vocabulary/grammar focus points
3. Adaptive difficulty: Blank rate gradually increases with progress (10% to 30%)

**Live Connect P2P - Smart Learning Partner Matching**

Matching algorithm based on:

- Similar CEFR level (±1 level)
- Shared interests (3+ overlapping topics)
- Complementary weak areas (A weak in Speaking, B weak in Listening = matched for conversation practice)

**Competitive Exams - Periodic Ranking Competitions**

Weekly challenges with real-time leaderboard, awarding badges/certificates to top performers to stimulate healthy competitive motivation.

---

### D. Intelligent Utilities

**Uni-Assistant - RAG Chatbot**

24/7 learning assistant with capabilities:

- **Contextual Q&A:** Answers questions based on user's current lesson (powered by Pinecone vector search)
- **Data Export:** Export learned vocabulary, saved sentences to Excel/CSV/Anki deck
- **Learning Tips:** Provides personalized study method recommendations based on learning style

---

## 4. Technical Architecture

### Core Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| **AI Engine** | OpenAI GPT-4, Realtime API | Speaking evaluation, content generation |
| **Speech AI** | Azure AI Speech | Pronunciation scoring, prosody analysis |
| **Vector Database** | Pinecone Serverless | Semantic search, knowledge mapping |
| **Primary Database** | MongoDB Atlas | User data, course content, progress tracking |
| **Cache & Queue** | Redis | Session storage, background jobs |
| **Automation** | n8n Workflow | Content pipeline, scheduled tasks |
| **Analytics** | Custom + Mixpanel | Learning analytics, user behavior |

**Architecture Highlights:**

- **Polyglot Persistence:** MongoDB (operational data) + Pinecone (semantic search) + Redis (cache)
- **Event-driven:** Real-time progress updates
- **Microservices:** Independent services (Assessment, Recommendation, Content Generation) for scalability

---

## 5. Intelligent Operations System

### Resource Intelligence and Monitoring

**Real-time Cost Tracking:**

- Dashboard monitors token usage of OpenAI, Azure, ElevenLabs in real-time
- Predictive alerts when consumption exceeds 80% quota

**Telegram Alert Bot:**

Automated notifications:

- API quota warning (10% remaining)
- Service downtime (>2 minutes)
- Unusual traffic spike (>200% baseline)

### Automated Retention Engine

**Smart Re-engagement:**

| Trigger | Action | Personalization |
| --- | --- | --- |
| **24h inactive** | Email reminder "Continue your lesson" | Include next recommended unit + progress % |
| **3 days absent** | Push notification with bonus XP incentive | Mention specific weak area to work on |
| **7 days churned** | AI-generated personalized video message | Show peer progress comparison |

**Weekly Progress Report:**

Auto-generated email every Sunday 18:00 with:

- Total study time (compared to previous week)
- New vocabulary mastered (with example sentences)
- Skills improvement heatmap (4 skills x before/after)
- Achievements unlocked (badges, streaks)

### AI Content Moderation

**Social Hub Safety:**

- **Pre-publish Scan:** Each post goes through OpenAI Moderation API before publication
- **Auto-block:** Toxic content (hate speech, spam) rejected immediately
- **Human Review Queue:** Borderline cases escalated to moderators
- **Appeal System:** Users can appeal with AI explanation of block reason

---

## Installation and Deployment

### Prerequisites

* Node.js 20+
* Docker and Docker Compose
* MongoDB Atlas account
* Pinecone account
* OpenAI API key

### Setup Instructions

1. **Clone the Repository**
```bash
git clone https://github.com/nguyen-le-huy/unilish.git
cd unilish
```

2. **Environment Configuration**

Copy example configuration files and populate required API keys:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
cp admin/.env.example admin/.env
```

Required environment variables:
- `MONGO_URI` - MongoDB Atlas connection string
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_ENVIRONMENT` - Pinecone environment (e.g., us-east1-gcp)
- `PINECONE_INDEX_NAME` - Pinecone index name (default: unilish-knowledge)
- `OPENAI_API_KEY` - OpenAI API key
- `REDIS_URI` - Redis connection string (optional for local development)

3. **Deployment via Docker**

Development mode (with hot-reload):
```bash
docker-compose up -d --build
```

Production mode:
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### Access Points

* **Client Application:** http://localhost:5173
* **Admin Dashboard:** http://localhost:5174
* **API Server:** http://localhost:5432

---

## Database Setup

### MongoDB Atlas

1. Create a MongoDB Atlas account at https://www.mongodb.com/cloud/atlas
2. Create a new cluster
3. Configure network access (whitelist your IP)
4. Create database user and obtain connection string
5. Update `MONGO_URI` in `.env`

### Pinecone Vector Database

1. Sign up at https://app.pinecone.io/
2. Create a new index:
   - Name: `unilish-knowledge`
   - Dimensions: `1536` (for OpenAI text-embedding-3-small)
   - Metric: `cosine`
3. Copy API key and environment
4. Update `PINECONE_API_KEY` and `PINECONE_ENVIRONMENT` in `.env`

---

## License

This project is proprietary and confidential. Unauthorized copying or distribution is strictly prohibited.

**Author:** Nguyen Le Huy | Hystudio