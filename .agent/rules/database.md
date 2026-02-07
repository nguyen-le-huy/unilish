---
trigger: always_on
---

# UNILISH DATABASE ARCHITECTURE & STORAGE STANDARDS

## 1. Overview: Polyglot Persistence Strategy

UniLish adopts a **Polyglot Persistence** architecture. Instead of forcing all data into a single monolithic database, we utilize specialized data stores to optimize for specific use cases:

* **Document Store (MongoDB):** For flexible, hierarchical data (Users, Lessons).
* **Graph Database (Neo4j):** For highly connected data (Knowledge Maps, Prerequisite Trees).
* **In-Memory Store (Redis):** For high-speed caching and real-time features.
* **Columnar Store (ClickHouse):** For high-volume analytics and logging.

---

## 2. Core Database Systems

| Component | Technology | Service Model | Role & Enterprise Justification |
| --- | --- | --- | --- |
| **Operational DB** | **MongoDB** | **Atlas (Managed)** | **Primary System of Record.**<br>

<br>• **Sharding:** Handles massive scale by partitioning data.<br>

<br>• **Point-in-time Recovery:** Allows restoring data to a specific second (critical for disaster recovery).<br>

<br>• **Stores:** User Profiles, Course Content, Progress Logs. |
| **Knowledge Graph** | **Neo4j** | **AuraDB (Managed)** | **Relationship Engine.**<br>

<br>• **Managed HA:** Ensures High Availability without manual clustering.<br>

<br>• **Stores:** Complex relationships between Skills, Vocabulary, and Grammar points.<br>

<br>• **Why:** Relational DBs (SQL) struggle with recursive queries (e.g., "Find all prerequisites for this lesson"). |
| **Distributed Cache** | **Redis** | **Cluster Mode** | **Speed Layer.**<br>

<br>• **Cluster Mode:** Distributed architecture for high throughput.<br>

<br>• **Use Cases:**<br>

<br> 1. **Session Store:** JWT/Session management.<br>

<br> 2. **BullMQ:** Background job queues (Email, AI Grading).<br>

<br> 3. **Leaderboard:** Real-time ranking updates. |
| **Data Warehouse** | **ClickHouse** | **Cloud / Self-hosted** | **Analytics & ML Source.**<br>

<br>• **Purpose:** Stores massive streams of User Behavior Logs (Clickstream).<br>

<br>• **Usage:** Source data for Machine Learning models to improve content recommendation algorithms. |

---

## 3. Storage Architecture (Hybrid Model)

We utilize a **Hybrid Storage Strategy** to balance cost (R2) and user experience (Cloudinary).

### A. Raw Storage: Cloudflare R2

* **Standard:** S3 Compatible API (allows easy migration to AWS S3 if needed).
* **Purpose:** Archival and raw storage for heavy media files (Source Audio, Raw Video, PDFs).
* **Business Value:** **Zero Egress Fees** (Significantly reduces bandwidth costs compared to AWS).

### B. Media Pipeline: Cloudinary (Enterprise)

* **Standard:** Digital Asset Management (DAM).
* **Purpose:** Serving optimized media to the end-user (Client).
* **Key Features:**
* **Auto-format:** Automatically serves WebP/AVIF based on browser support.
* **Adaptive Bitrate Streaming:** Optimizes video playback quality based on user bandwidth.
* **CDN:** Global edge delivery.



---

## 4. Data Modeling Strategy

### MongoDB Schemas (Mongoose)

Managed via strict schemas in `server/src/models`.

* **User:** Auth info, Settings, Subscription Status.
* **LearningSession:** Snapshot of a specific study session.
* **Submission:** User answers, AI corrections, Scores.

### Neo4j Graph Model (Cypher)

Managed via `neo4j-driver`.

* **Nodes:** `Concept`, `Vocabulary`, `GrammarRule`, `Lesson`.
* **Relationships:**
* `(:Lesson)-[:TEACHES]->(:Vocabulary)`
* `(:GrammarRule)-[:PREREQUISITE_FOR]->(:GrammarRule)`
* `(:User)-[:MASTERED]->(:Concept)`



---

## 5. Connection & Security Standards

1. **Drivers:**
* MongoDB: **Mongoose** (ODM) for strict schema validation.
* Neo4j: **Neo4j Driver** for direct Cypher query execution.


2. **Environment Variables:**
* Connection strings must **never** be hardcoded. Use `config/env.ts` validated by **Zod**.


3. **Indexing:**
* MongoDB: Indexes required on all foreign keys and frequently queried fields (`email`, `slug`).
* Neo4j: Constraints required on Node IDs to prevent duplication.



*Last Updated: 2026-02-05*