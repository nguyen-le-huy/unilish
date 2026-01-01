---
trigger: always_on
---

# DOCKER SETUP INSTRUCTIONS FOR UNILISH

## 1. Context & Architecture
- **Project Structure:** Monorepo (Server, Client, Admin).
- **Database:** MongoDB Atlas (Cloud) + Redis (Local Container).
- **Environment:** Node.js 20 (Alpine Linux).
- **Frontend Tooling:** Vite (Requires specific host binding).

---

## 2. File Requirements
The AI Agent should verify or create the following files:

```text
root/
├── docker-compose.yml   # Orchestration for all services
├── .dockerignore        # Ignore node_modules/dist
├── server/
│   ├── Dockerfile
│   └── .env             # Must contain MONGO_URI (Atlas)
├── client/
│   ├── Dockerfile
│   └── vite.config.ts   # Must expose host
└── admin/
    ├── Dockerfile
    └── vite.config.ts   # Must expose host

```

---

## 3. Dockerfile Definitions

### A. Server (`server/Dockerfile`)

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for caching
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Default Express Port
EXPOSE 5000

# Start command (Ensure package.json has "dev": "nodemon ...")
CMD ["npm", "run", "dev"]

```

### B. Client (`client/Dockerfile`)

**Crucial:** Must use `--host` flag to expose Vite server.

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

# Start Vite with host exposure
CMD ["npm", "run", "dev", "--", "--host"]

```

### C. Admin (`admin/Dockerfile`)

**Crucial:** Runs on port **5174**.

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5174

# Start Vite on port 5174 with host exposure
CMD ["npm", "run", "dev", "--", "--port", "5174", "--host"]

```

---

## 4. Docker Compose Configuration (`docker-compose.yml`)

**Note:** MongoDB is NOT included as a service because we use **MongoDB Atlas**.

```yaml
version: '3.8'

services:
  # 1. Redis Service (Local Cache)
  redis:
    image: redis:alpine
    container_name: unilish-redis
    ports:
      - "6379:6379"
    networks:
      - unilish-net

  # 2. Server Service (Express API)
  server:
    build: ./server
    container_name: unilish-server
    ports:
      - "5001:5000"
    volumes:
      - ./server:/app             # Sync code for hot-reload
      - /app/node_modules         # Prevent overwriting container modules
    environment:
      - PORT=5000
      - REDIS_URI=redis://redis:6379
      - MONGO_URI=${MONGO_URI}    # Injected from server/.env
      - CLIENT_URL=http://localhost:5173
      - VITE_API_URL=http://localhost:5001
      - ./server/.env
    depends_on:
      - redis
    networks:
      - unilish-net

  # 3. Client Service (User Frontend)
  client:
    build: ./client
    container_name: unilish-client
    ports:
      - "5173:5173"
    volumes:
      - ./client:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:5001
    env_file:
      - ./client/.env
    networks:
      - unilish-net

  # 4. Admin Service (CMS Dashboard)
  admin:
    build: ./admin
    container_name: unilish-admin
    ports:
      - "5174:5174"
    volumes:
      - ./admin:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:5001
    env_file:
      - ./admin/.env
    networks:
      - unilish-net

networks:
  unilish-net:
    driver: bridge

```

---

## 5. Required Configuration Adjustments

### A. Vite Config (`vite.config.ts`)

For **BOTH** `client` and `admin`, ensure the `server` object is configured for Docker:

```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true, // Required for Docker hot-reload on some OS
    },
    host: true,         // Listen on 0.0.0.0
    strictPort: true,
    port: 5173,         // (Change to 5174 for Admin)
  },
});

```

### B. Environment Variables (`server/.env`)

Ensure the connection string points to Atlas:

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/unilish?retryWrites=true&w=majority

```

### C. MongoDB Atlas Whitelist

* Go to Atlas Dashboard > Network Access.
* Add IP Address: `0.0.0.0/0` (Allow access from anywhere for Dev Docker).

---

## 6. Execution Commands

To start the development environment:

```bash
# Build and start all containers in detached mode
docker-compose up -d --build

# View logs to verify connections
docker-compose logs -f

```

To stop:

```bash
docker-compose down

```

```

```