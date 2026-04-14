---
trigger: always_on
---

# DOCKER SETUP

## 1. Context & Architecture (Enterprise Standard)
- **Project Structure:** Monorepo (Server, Client, Admin).
- **Core Strategy:** Multi-stage Builds (One Dockerfile per service for both Dev & Prod).
- **Database:** MongoDB Atlas (Cloud) + Redis (Local Container).
- **Orchestration:**
  - **Dev:** `docker-compose.yml` (Hot-reload, Debugging, Auto-restart).
  - **Prod:** `docker-compose.prod.yml` (Optimized, Nginx, Persistence, Security).

---

## 2. File Requirements
The AI Agent should verify or create the following files:

```text
root/
├── docker-compose.yml       # DEVELOPMENT: Hot-reload, volumes mounted.
├── docker-compose.prod.yml  # PRODUCTION: Static builds, Nginx, security.
├── .dockerignore            # Ignore node_modules/dist
├── server/
│   ├── Dockerfile           # Multi-stage: base > development > builder > production
│   └── .env                 # Secrets (MONGO_URI, API Keys)
├── client/
│   ├── Dockerfile           # Multi-stage: base > development > builder > production (Nginx)
│   └── .env                 # Vite Env Vars
└── admin/
    ├── Dockerfile           # Multi-stage: base > development > builder > production (Nginx)
    └── .env                 # Vite Env Vars

```

---

## 3. Dockerfile Definitions (Multi-stage Strategy)

### A. Server (`server/Dockerfile`)

```dockerfile
# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Stage 2: Development (Hot-reload)
FROM base AS development
COPY . .
EXPOSE 5432
CMD ["npm", "run", "dev"]

# Stage 3: Builder (Compile TS)
FROM base AS builder
COPY . .
RUN npm run build

# Stage 4: Production (Optimized)
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 5432
CMD ["npm", "run", "start"]
```

### B. Client & Admin (React Apps)

**Crucial:** Production stage uses Nginx to serve static files.

```dockerfile
# Stage 1: Base
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

# Stage 2: Development
FROM base AS development
COPY . .
EXPOSE 5173 
CMD ["npm", "run", "dev", "--", "--host"]

# Stage 3: Builder
FROM base AS builder
COPY . .
# ARG/ENV are passed from docker-compose.prod.yml
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 4: Production (Nginx)
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
# Add SPA config (Try files $uri /index.html)
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html index.htm; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 4. Orchestration Configuration

### A. Development (`docker-compose.yml`)
*   **Target:** `development`
*   **Volumes:** Mounted (`./server:/app`) for Hot-Reload.
*   **Ports:** Exposed for debugging (e.g., DBs accessible via localhost).
*   **Redis:** Healthcheck enabled.

### B. Production (`docker-compose.prod.yml`)
*   **Target:** `production`
*   **Volumes:** NO code volumes (Static Images).
*   **Restart:** `always`.
*   **Ports:** 
    *   Redis port **HIDDEN** (internal network only).
    *   Web Apps map host ports to container port **80**.
*   **Startup Order:** Client/Admin -> Server -> Redis (Checked via `condition: service_healthy`).

---

## 5. Execution Commands

### Development (Hot Reload)
```bash
docker-compose up -d --build
```

### Production (Stable & Fast)
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```